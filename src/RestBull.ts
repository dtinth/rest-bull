import Fastify from 'fastify'
import { Job, JobsOptions, Queue, UnrecoverableError, Worker } from 'bullmq'
import IORedis from 'ioredis'
import { Schema, schema } from './schema'
import { ZodError } from 'zod'
import fetch, { Headers } from 'node-fetch'

export class RestBull {
  fastify = Fastify({
    logger: true,
  })
  redis: IORedis
  queueName: string
  queue: Queue

  constructor(options: { redisUrl: string; queueName: string }) {
    this.redis = new IORedis(options.redisUrl, {
      maxRetriesPerRequest: null,
    })
    this.queueName = options.queueName
  }

  async startWorker(options: {
    port: number
    host?: string
    concurrency: number
  }) {
    const worker = new Worker(
      this.queueName,
      async (job) => this.processJob(job),
      {
        connection: this.redis,
        concurrency: options.concurrency,
      },
    )
    worker.waitUntilReady().then(() => {
      this.fastify.log.info('Worker is ready')
    })
    worker.on('completed', (job) => {
      this.fastify.log.info(`Job ${job.id} completed`)
    })
    worker.on('failed', (job, err) => {
      this.fastify.log.error(`Job ${job.id} failed: ${err.message}`)
    })
    this.fastify.get('/', async (request, reply) => {
      return {
        toolName: 'rest-bull',
        worker: {
          id: worker.id,
        },
      }
    })
    await this.fastify.listen(options)
  }

  async addJob(data: Schema, opts?: JobsOptions) {
    if (!this.queue) {
      this.queue = new Queue(this.queueName, {
        connection: this.redis,
      })
    }
    const name = data.httpMethod + ' ' + data.uri
    await this.queue.add(name, data, opts)
  }

  private async processJob(job: Job) {
    this.fastify.log.info(`Processing job ${job.id}`)
    const data = (() => {
      try {
        return schema.parse(job.data)
      } catch (error) {
        if (error instanceof ZodError) {
          throw new UnrecoverableError(error.message)
        }
        throw error
      }
    })()
    const headers = new Headers(data.headers || {})
    if (!headers.has('Authorization')) {
      const audience = data.oidcToken?.audience || data.uri
      headers.set(
        'Authorization',
        `Bearer ${await this.getOidcToken(audience)}`,
      )
    }
    const response = await fetch(data.uri, {
      method: data.httpMethod,
      headers,
      body: data.body ? Buffer.from(data.body, 'base64') : undefined,
    })
    this.fastify.log.info(
      `Request ${job.id} completed with status ${response.status}`,
    )
    if (response.status >= 400) {
      const message = `Request failed with status code ${response.status} (${response.statusText})`
      if (
        response.status >= 500 ||
        response.status === 429 ||
        response.status === 408
      ) {
        throw new Error(message)
      } else {
        throw new UnrecoverableError(message)
      }
    }
    return {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    }
  }

  private async getOidcToken(audience: string) {
    return 'TODO'
  }
}
