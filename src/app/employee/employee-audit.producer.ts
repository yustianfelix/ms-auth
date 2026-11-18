import {Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {Producer, stringSerializers} from '@platformatic/kafka';
import type {EmployeeProfileUpdatedEvent} from './dto/employee-profile-updated-event.dto';

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

    private logger = new Logger(EmployeeAuditProducer.name);

    async publish(event: EmployeeProfileUpdatedEvent): Promise<void> {
        this.logger.log(`Sending audit log to kafka topic ${this.topic}` )
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
