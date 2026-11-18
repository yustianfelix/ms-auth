import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { Repository } from 'typeorm';
import { UpdateEmployeeProfileDto } from './dto/update-employee-profile.dto';
import { EmployeeAuditProducer } from './employee-audit.producer';
import { Employee } from './entity/employee.entity';

const scrypt = promisify(scryptCallback);
const PASSWORD_KEY_LENGTH = 64;

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(Employee)
    private readonly employees: Repository<Employee>,
    private readonly auditProducer: EmployeeAuditProducer,
  ) {}

  async getProfile(employeeId: string) {
    const employee = await this.employees.findOne({ where: { employeeId } });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return {
      success: true,
      message: 'Employee profile retrieved successfully',
      data: this.toProfile(employee),
    };
  }

  async updateProfile(employeeId: string, update: UpdateEmployeeProfileDto) {
    const employee = await this.employees
      .createQueryBuilder('employee')
      .addSelect('employee.passwordHash')
      .where('employee.employeeId = :employeeId', { employeeId })
      .getOne();

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    if (!(await this.verifyPassword(update.currentPassword, employee.passwordHash))) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const changedFields: Array<'photo' | 'phoneNumber' | 'password'> = [];

    if (update.photo !== undefined && update.photo !== employee.photo) {
      employee.photo = update.photo;
      changedFields.push('photo');
    }

    if (update.phoneNumber !== undefined && update.phoneNumber !== employee.phoneNumber) {
      employee.phoneNumber = update.phoneNumber;
      changedFields.push('phoneNumber');
    }

    if (update.newPassword !== undefined) {
      employee.passwordHash = await this.hashPassword(update.newPassword);
      changedFields.push('password');
    }

    if (changedFields.length === 0) {
      throw new BadRequestException('Provide at least one changed profile field');
    }

    await this.employees.save(employee);

    await this.auditProducer.publish({
      eventId: randomBytes(16).toString('hex'),
      eventType: 'employee.profile.updated',
      employeeId: employee.employeeId,
      changedFields,
      occurredAt: new Date().toISOString(),
    });

    return {
      success: true,
      message: 'Employee profile updated successfully',
      data: this.toProfile(employee),
    };
  }

  private toProfile(employee: Employee) {
    return {
      employeeId: employee.employeeId,
      name: employee.name,
      email: employee.email,
      photo: employee.photo,
      role: employee.role,
      phoneNumber: employee.phoneNumber,
      updatedAt: employee.updatedAt,
    };
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const key = (await scrypt(password, salt, PASSWORD_KEY_LENGTH)) as Buffer;
    return `scrypt$${salt}$${key.toString('hex')}`;
  }

  private async verifyPassword(password: string, passwordHash: string): Promise<boolean> {
    const [algorithm, salt, expectedHex] = passwordHash.split('$');
    if (algorithm !== 'scrypt' || !salt || !expectedHex || !/^[0-9a-f]{128}$/i.test(expectedHex)) {
      return false;
    }

    const expected = Buffer.from(expectedHex, 'hex');
    const actual = (await scrypt(password, salt, expected.length)) as Buffer;
    return timingSafeEqual(actual, expected);
  }
}
