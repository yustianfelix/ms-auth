import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
} from '@nestjs/common';
import { UpdateEmployeeProfileDto } from './dto/update-employee-profile.dto';
import { EmployeeService } from './employee.service';

@Controller('employees')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Get(':employeeId/profile')
  getProfile(@Param('employeeId') employeeId: string) {
    this.validateEmployeeId(employeeId);
    return this.employeeService.getProfile(employeeId);
  }

  @Patch(':employeeId/profile')
  updateProfile(
    @Param('employeeId') employeeId: string,
    @Body() update: UpdateEmployeeProfileDto,
  ) {
    this.validateEmployeeId(employeeId);
    return this.employeeService.updateProfile(employeeId, update);
  }

  private validateEmployeeId(employeeId: string): void {
    if (!/^[1-9]\d*$/.test(employeeId)) {
      throw new BadRequestException('employeeId must be a positive bigint');
    }
  }
}
