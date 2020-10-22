import {
  EventHubProducerClient,
  EventHubClientOptions,
  EventData,
  SendBatchOptions,
} from '@azure/event-hubs';
import Debug from 'debug';

const debug = Debug('eventhub:producer');

export interface EventHubProducerServiceOptions {
  client?: EventHubClientOptions;

  /**
   * Provide a specific partitionId to use
   */
  partitionId?: string;
}

export class EventHubProducerService {

  protected client: EventHubProducerClient;
  private _debug: Debug.Debugger = debug;
  private partitionId?: string;

  constructor(
    readonly connectionString: string,
    readonly eventHubName: string,
    readonly options?: EventHubProducerServiceOptions,
  ) {

    if (eventHubName) {
      this._debug = debug.extend(eventHubName);
    }

    this.client = new EventHubProducerClient(connectionString, eventHubName, options?.client);

    if (options?.partitionId) {
      this._debug(`Ctor() - partitionId=${options.partitionId} is defined and forced`);
      this.partitionId = options.partitionId;
    }
  }

  async send(body: any, options?: SendBatchOptions) {

    const { partitionId, partitionKey, ...optionsValues } = options ?? {};
    const sendOptions: SendBatchOptions = { ...(optionsValues ?? {}) };

    // if a specific partitionId is defined, use it
    if (partitionId || this.partitionId) {
      sendOptions.partitionId = this.partitionId ?? partitionId;
      this._debug(`override partitionId=${sendOptions.partitionId}`)
    }
    // if no partitionId is defined, but a partitionKey is specify, use it
    if (sendOptions.partitionId === undefined && partitionKey) {
      sendOptions.partitionKey = partitionKey;
    }

    this._debug(`send called - partitionId=${sendOptions.partitionId} - partitionKey=${sendOptions.partitionKey}`);
    const packet: EventData = { body };
    packet.properties = {
      date: (new Date()).toISOString()
    };

    await this.client.sendBatch([packet], sendOptions);
  }

}