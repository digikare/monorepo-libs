import {
  Serializer,
  Deserializer,
} from '@nestjs/microservices';

export interface EventHubOptions {

  connectionString: string;
  eventHubName: string;
  consumerGroup: string;

  subscribe?: {
    fromBegining: boolean;
  };
  run?: {
    autoCommit?: boolean;
    autoCommitInterval?: number | null;
    autoCommitThreshold?: number | null;
  };
  serializer?: Serializer;
  deserializer?: Deserializer;

}