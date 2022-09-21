import Fastify from 'fastify'
import { Worker } from 'bullmq'
import IORedis from 'ioredis'

export class RestBull {
  fastify = Fastify({
    logger: true,
  })
  worker: Worker

  constructor(options: {
    redisUrl: string
    concurrency: number
    queueName: string
  }) {
    const redis = new IORedis(options.redisUrl, {
      maxRetriesPerRequest: null,
    })
    this.worker = new Worker(options.queueName, async (job) => {}, {
      connection: redis,
      concurrency: options.concurrency,
    })
    this.worker.waitUntilReady().then(() => {
      this.fastify.log.info('Worker is ready')
    })
    this.worker.on('completed', (job) => {
      this.fastify.log.info(`Job ${job.id} completed`)
    })
    this.worker.on('failed', (job, err) => {
      this.fastify.log.error(`Job ${job.id} failed: ${err.message}`)
    })
    this.fastify.get('/', async (request, reply) => {
      return {
        toolName: 'rest-bull',
        id: this.worker.id,
      }
    })
  }

  async start(options: { port: number; host?: string }) {
    await this.fastify.listen(options)
  }
}
