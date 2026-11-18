import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { scryptSync } from 'node:crypto';
import { Repository } from 'typeorm';
import { EmployeeProfileUpdatedEvent } from '../../../src/app/employee/dto/employee-profile-updated-event.dto';
import { UpdateEmployeeProfileDto } from '../../../src/app/employee/dto/update-employee-profile.dto';
import { EmployeeAuditProducer } from '../../../src/app/employee/employee-audit.producer';
import { Employee } from '../../../src/app/employee/entity/employee.entity';
import { EmployeeService } from '../../../src/app/employee/employee.service';
import { PasswordService } from '../../../src/app/common/service/password.service';

const currentPassword = 'correct-current-password';
const salt = '0123456789abcdef0123456789abcdef';
const employee = {
  employeeId: '42',
  name: 'Jane Doe',
  email: 'jane@example.com',
  photo: null,
  role: 'employee',
  phoneNumber: null,
  passwordHash: `scrypt$${salt}$${scryptSync(currentPassword, salt, 64).toString('hex')}`,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
} satisfies Employee;

describe('EmployeeService', () => {
  let service: EmployeeService;
  let findOne: jest.Mock;
  let getOne: jest.Mock;
  let save: jest.Mock;
  let publish: jest.Mock;
  let findOneBy: jest.Mock;
  let hash: jest.Mock;
  let verify: jest.Mock;

  beforeEach(() => {
    findOne = jest.fn().mockResolvedValue({ ...employee });
    getOne = jest.fn().mockResolvedValue({ ...employee });
    save = jest.fn().mockImplementation(async (value: Employee) => value);
    publish = jest.fn().mockResolvedValue(undefined);
    findOneBy = jest.fn().mockResolvedValue(null);
    hash = jest.fn().mockResolvedValue('scrypt$hashed');
    verify = jest.fn().mockResolvedValue(true);

    const queryBuilder = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne,
    };
    const repository = {
      findOne,
      findOneBy,
      create: jest.fn((value: Partial<Employee>) => value),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      save,
    };

    service = new EmployeeService(
      repository as unknown as Repository<Employee>,
      { publish } as unknown as EmployeeAuditProducer,
      { hash, verify } as unknown as PasswordService,
    );
  });

  it('returns an employee profile without password data', async () => {
    const response = await service.getProfile('42');

    expect(response.success).toBe(true);
    expect(response.data).toEqual({
      employeeId: '42',
      name: 'Jane Doe',
      email: 'jane@example.com',
      photo: null,
      role: 'employee',
      phoneNumber: null,
      updatedAt: employee.updatedAt,
    });
    expect(response.data).not.toHaveProperty('passwordHash');
  });

  it('returns a success response after updating the employee profile', async () => {
    const update: UpdateEmployeeProfileDto = {
      currentPassword,
      phoneNumber: '+15551234567',
    };

    const response = await service.updateProfile('42', update);

    expect(response.success).toBe(true);
    expect(response.message).toBe('Employee profile updated successfully');
    expect(response.data).not.toHaveProperty('passwordHash');
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'employee.profile.updated',
        employeeId: '42',
        changedFields: ['phoneNumber'],
      } satisfies Partial<EmployeeProfileUpdatedEvent>),
    );
  });

  it('throws when the requested employee does not exist', async () => {
    findOne.mockResolvedValue(null);

    await expect(service.getProfile('42')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects invalid employee IDs in the service', async () => {
    await expect(service.getProfile('0')).rejects.toBeInstanceOf(BadRequestException);
    expect(findOne).not.toHaveBeenCalled();
  });

  it('creates an employee with a normalized email and a hashed password', async () => {
    const response = await service.addEmployee({
      name: ' Jane Doe ',
      email: ' JANE@EXAMPLE.COM ',
      password: 'a-long-secure-password',
    });

    expect(findOneBy).toHaveBeenCalledWith({ email: 'jane@example.com' });
    expect(hash).toHaveBeenCalledWith('a-long-secure-password');
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Jane Doe',
        email: 'jane@example.com',
        passwordHash: 'scrypt$hashed',
        role: 'employee',
      }),
    );
    expect(response.success).toBe(true);
    expect(response.data).not.toHaveProperty('passwordHash');
  });

  it('rejects creating an employee with an existing email', async () => {
    findOneBy.mockResolvedValue(employee);

    await expect(
      service.addEmployee({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'a-long-secure-password',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(save).not.toHaveBeenCalled();
  });
});
