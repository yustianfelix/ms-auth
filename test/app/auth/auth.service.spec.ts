import { UnauthorizedException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AuthService } from '../../../src/app/auth/auth.service';
import { PasswordService } from '../../../src/app/common/service/password.service';
import { Employee } from '../../../src/app/employee/entity/employee.entity';

describe('AuthService', () => {
  const employee = {
    employeeId: '42',
    name: 'Jane Doe',
    email: 'jane@example.com',
    photo: null,
    role: 'employee',
    phoneNumber: null,
    passwordHash: 'scrypt$hash',
  } as Employee;
  const where = jest.fn().mockReturnThis();
  const addSelect = jest.fn().mockReturnThis();
  const getOne = jest.fn();
  const queryBuilder = { addSelect, where, getOne };
  const employees = {
    createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
  };
  const verify = jest.fn();
  const authService = new AuthService(
    employees as unknown as Repository<Employee>,
    { verify } as unknown as PasswordService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    employees.createQueryBuilder.mockReturnValue(queryBuilder);
  });

  it('authenticates and returns a safe employee profile', async () => {
    getOne.mockResolvedValue(employee);
    verify.mockResolvedValue(true);

    const response = await authService.login({
      email: ' JANE@EXAMPLE.COM ',
      password: 'correct-password',
    });

    expect(where).toHaveBeenCalledWith('employee.email = :email', { email: 'jane@example.com' });
    expect(verify).toHaveBeenCalledWith('correct-password', employee.passwordHash);
    expect(response.success).toBe(true);
    expect(response.data).not.toHaveProperty('passwordHash');
  });

  it('rejects unknown employees and incorrect passwords with the same error', async () => {
    getOne.mockResolvedValue(null);

    await expect(
      authService.login({ email: 'jane@example.com', password: 'incorrect-password' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(verify).not.toHaveBeenCalled();

    getOne.mockResolvedValue(employee);
    verify.mockResolvedValue(false);
    await expect(
      authService.login({ email: 'jane@example.com', password: 'incorrect-password' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('returns a stored photo as a data URL', async () => {
    const photo = Buffer.from('photo bytes');
    getOne.mockResolvedValue(Object.assign({}, employee, { photo }));
    verify.mockResolvedValue(true);

    const response = await authService.login({
      email: 'jane@example.com',
      password: 'correct-password',
    });

    expect(response.data.photo).toBe(`data:image/webp;base64,${photo.toString('base64')}`);
  });
});
