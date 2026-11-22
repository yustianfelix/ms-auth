import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'node:crypto';
import { Repository } from 'typeorm';
import { PasswordService } from '../common/service/password.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeProfileDto } from './dto/update-employee-profile.dto';
import { EmployeeAuditProducer } from './employee-audit.producer';
import { Employee } from './entity/employee.entity';
import { encodePhoto, photoDataUrl } from './photo';

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(Employee)
    private readonly employees: Repository<Employee>,
    private readonly auditProducer: EmployeeAuditProducer,
    private readonly passwordService: PasswordService,
  ) {}

  async addEmployee(request: CreateEmployeeDto) {
    const email = request.email.trim().toLowerCase();
    if (await this.employees.findOneBy({ email })) {
      throw new ConflictException('An employee with this email already exists');
    }

    const employee = this.employees.create({
      name: request.name.trim(),
      email,
      passwordHash: await this.passwordService.hash(request.password),
      photo: request.photo == null ? null : await encodePhoto(request.photo),
      phoneNumber: request.phoneNumber ?? null,
      role: request.role ?? 'employee',
    });
    const savedEmployee = await this.employees.save(employee);

    return {
      success: true,
      message: 'Employee created successfully',
      data: this.toProfile(savedEmployee),
    };
  }

  async getEmployeeList() {
    const employees = await this.employees.find();

    return {
      success: true,
      message: 'Employees retrieved successfully',
      data: employees.map((employee) => this.toProfile(employee)),
    };
  }

  async getProfile(employeeId: string) {
    this.validateEmployeeId(employeeId);
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
    this.validateEmployeeId(employeeId);
    const employee = await this.employees
      .createQueryBuilder('employee')
      .addSelect('employee.passwordHash')
      .where('employee.employeeId = :employeeId', { employeeId })
      .getOne();

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    if (!(await this.passwordService.verify(update.currentPassword, employee.passwordHash))) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const changedFields: Array<'photo' | 'phoneNumber' | 'password'> = [];

    if (update.photo !== undefined) {
      const photo = update.photo === null ? null : await encodePhoto(update.photo);
      if (photo === null ? employee.photo !== null : !photo.equals(employee.photo ?? Buffer.alloc(0))) {
        employee.photo = photo;
        changedFields.push('photo');
      }
    }

    if (update.phoneNumber !== undefined && update.phoneNumber !== employee.phoneNumber) {
      employee.phoneNumber = update.phoneNumber;
      changedFields.push('phoneNumber');
    }

    if (update.newPassword !== undefined) {
      employee.passwordHash = await this.passwordService.hash(update.newPassword);
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
      photo: photoDataUrl(employee.photo),
      role: employee.role,
      phoneNumber: employee.phoneNumber,
      updatedAt: employee.updatedAt,
    };
  }

  private validateEmployeeId(employeeId: string): void {
    if (!/^[1-9]\d*$/.test(employeeId)) {
      throw new BadRequestException('employeeId must be a positive bigint');
    }
  }
}
