import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PasswordService } from '../common/service/password.service';
import { Employee } from '../employee/entity/employee.entity';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Employee)
    private readonly employees: Repository<Employee>,
    private readonly passwordService: PasswordService,
  ) {}

  async login(credentials: LoginDto) {
    const employee = await this.employees
      .createQueryBuilder('employee')
      .addSelect('employee.passwordHash')
      .where('employee.email = :email', { email: credentials.email.trim().toLowerCase() })
      .getOne();

    if (!employee || !(await this.passwordService.verify(credentials.password, employee.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return {
      success: true,
      message: 'Login successful',
      data: {
        employeeId: employee.employeeId,
        name: employee.name,
        email: employee.email,
        photo: employee.photo,
        role: employee.role,
        phoneNumber: employee.phoneNumber,
      },
    };
  }
}
