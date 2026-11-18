import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Producer, stringSerializers } from '@platformatic/kafka';
import type { EmployeeProfileUpdatedEvent } from './dto/employee-profile-updated-event.dto';

@Injectable()
export class EmployeeAuditProducer implements OnModuleDestroy {
  private readonly producer: Producer<string, string, string, string>;
  private readonly topic: string;

  constructor(config: ConfigService) {
    this.topic = config.get<string>('app.kafka.employeeAuditTopic') ?? 'employee.audit';
    this.producer = new Producer({
      clientId: 'ms-auth',
      bootstrapBrokers: config.get<string[]>('app.kafka.brokers') ?? ['localhost:9092'],
      serializers: stringSerializers,
    });
  }

  async publish(event: EmployeeProfileUpdatedEvent): Promise<void> {
    await this.producer.send({
      messages: [
        {
          topic: this.topic,
          key: event.employeeId,
          value: JSON.stringify(event),
        },
      ],
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.producer.close();
  }
}
