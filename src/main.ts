import {
  CommandLineAction,
  CommandLineChoiceParameter,
  CommandLineIntegerParameter,
  CommandLineParser,
  CommandLineStringListParameter,
  CommandLineStringParameter,
} from '@rushstack/ts-command-line'
import { RestBull } from './RestBull'

class RestBullCommandLine extends CommandLineParser {
  public constructor() {
    super({
      toolFilename: 'rest-bull',
      toolDescription: 'Task queue and job scheduler',
    })
    this.addAction(new StartAction())
    this.addAction(new AddAction())
  }
  protected onDefineParameters(): void {}
}

class StartAction extends CommandLineAction {
  private _port!: CommandLineIntegerParameter
  private _concurrency!: CommandLineIntegerParameter
  private _redisUrl!: CommandLineStringParameter
  private _queueName!: CommandLineStringParameter
  public constructor() {
    super({
      actionName: 'start',
      summary: 'Starts the server',
      documentation: 'Starts the server',
    })
  }
  protected onDefineParameters(): void {
    this._port = this.defineIntegerParameter({
      parameterLongName: '--port',
      parameterShortName: '-p',
      argumentName: 'PORT',
      environmentVariable: 'PORT',
      description: 'The port to listen on',
    })
    this._redisUrl = this.defineStringParameter({
      parameterLongName: '--redis-url',
      parameterShortName: '-r',
      argumentName: 'REDIS_URL',
      environmentVariable: 'REDIS_URL',
      description: 'The redis url to connect to',
    })
    this._queueName = this.defineStringParameter({
      parameterLongName: '--queue-name',
      parameterShortName: '-q',
      argumentName: 'QUEUE_NAME',
      description: 'The queue name to listen to',
      required: true,
    })
    this._concurrency = this.defineIntegerParameter({
      parameterLongName: '--concurrency',
      parameterShortName: '-c',
      argumentName: 'CONCURRENCY',
      description: 'The number of jobs to run concurrently',
      defaultValue: 1,
    })
  }
  protected async onExecute(): Promise<void> {
    if (!this._redisUrl.value) {
      throw new Error(
        'Missing Redis URL. You can set it with the --redis-url flag or the REDIS_URL environment variable',
      )
    }
    if (!this._queueName.value) {
      throw new Error('The queue name must not be empty')
    }
    const restBull = new RestBull({
      redisUrl: this._redisUrl.value,
      queueName: this._queueName.value,
    })
    return restBull.startWorker({
      concurrency: this._concurrency.value!,
      port: this._port.value! || 3277,
    })
  }
}

class AddAction extends CommandLineAction {
  private _redisUrl!: CommandLineStringParameter
  private _queueName!: CommandLineStringParameter
  private _url!: CommandLineStringParameter
  private _method!: CommandLineChoiceParameter
  private _body!: CommandLineStringParameter
  private _headers!: CommandLineStringListParameter
  public constructor() {
    super({
      actionName: 'add',
      summary: 'Adds a job to the queue',
      documentation: 'Adds a job to the queue',
    })
  }
  protected onDefineParameters(): void {
    this._redisUrl = this.defineStringParameter({
      parameterLongName: '--redis-url',
      parameterShortName: '-r',
      argumentName: 'REDIS_URL',
      environmentVariable: 'REDIS_URL',
      description: 'The redis url to connect to',
    })
    this._queueName = this.defineStringParameter({
      parameterLongName: '--queue-name',
      parameterShortName: '-q',
      argumentName: 'QUEUE_NAME',
      description: 'The queue name to listen to',
      required: true,
    })
    this._url = this.defineStringParameter({
      parameterLongName: '--url',
      parameterShortName: '-u',
      argumentName: 'URL',
      description: 'The url to call',
      required: true,
    })
    this._method = this.defineChoiceParameter({
      parameterLongName: '--method',
      parameterShortName: '-m',
      alternatives: [
        'GET',
        'POST',
        'HEAD',
        'PUT',
        'DELETE',
        'PATCH',
        'OPTIONS',
      ],
      description: 'The method to call',
      required: true,
    })
    this._body = this.defineStringParameter({
      parameterLongName: '--body',
      parameterShortName: '-b',
      argumentName: 'BODY',
      description: 'The body to send as a base64 encoded string',
    })
    this._headers = this.defineStringListParameter({
      parameterLongName: '--header',
      parameterShortName: '-H',
      argumentName: 'KEYVALUE',
      description:
        'The header to send in form of "key:value". Can be specified multiple times',
    })
  }
  protected async onExecute(): Promise<void> {
    if (!this._redisUrl.value) {
      throw new Error(
        'Missing Redis URL. You can set it with the --redis-url flag or the REDIS_URL environment variable',
      )
    }
    if (!this._queueName.value) {
      throw new Error('The queue name must not be empty')
    }
    const restBull = new RestBull({
      redisUrl: this._redisUrl.value,
      queueName: this._queueName.value,
    })
    try {
      const headers: Record<string, string> = {}
      for (const header of this._headers.values) {
        const colon = header.indexOf(':')
        if (colon === -1) {
          throw new Error(`Invalid header: ${header}`)
        }
        const key = header.substring(0, colon).trim()
        const value = header.substring(colon + 1).trim()
        headers[key] = value
      }
      await restBull.addJob({
        uri: this._url.value!,
        httpMethod: this._method.value! as any,
        body: this._body.value,
        headers,
      })
    } finally {
      await restBull.dispose()
    }
  }
}

new RestBullCommandLine().execute()
