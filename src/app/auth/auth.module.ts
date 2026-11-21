import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from '../common/common.module';
import { Employee } from '../employee/entity/employee.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [TypeOrmModule.forFeature([Employee]), CommonModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
