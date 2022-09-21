import {
  CommandLineAction,
  CommandLineIntegerParameter,
  CommandLineParser,
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
      concurrency: this._concurrency.value!,
    })
    return restBull.start({
      port: this._port.value! || 3277,
    })
  }
}

new RestBullCommandLine().execute()
