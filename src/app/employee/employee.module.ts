import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from '../common/common.module';
import { EmployeeController } from './employee.controller';
import { EmployeeAuditProducer } from './employee-audit.producer';
import { Employee } from './entity/employee.entity';
import { EmployeeService } from './employee.service';

@Module({
  imports: [TypeOrmModule.forFeature([Employee]), CommonModule],
  controllers: [EmployeeController],
  providers: [EmployeeAuditProducer, EmployeeService],
})
export class EmployeeModule {}
