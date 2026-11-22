import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeProfileDto } from './dto/update-employee-profile.dto';
import { EmployeeService } from './employee.service';
import { EmployeeListRequestDto } from './dto/employee-list-request.dto';

@Controller('employees')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Get()
  getEmployeeList(@Query() request: EmployeeListRequestDto) {
    return this.employeeService.getEmployeeList(request);
  }

  @Post()
  addEmployee(@Body() employee: CreateEmployeeDto) {
    return this.employeeService.addEmployee(employee);
  }

  @Get(':employeeId/profile')
  getProfile(@Param('employeeId') employeeId: string) {
    return this.employeeService.getProfile(employeeId);
  }

  @Patch(':employeeId/profile')
  updateProfile(
    @Param('employeeId') employeeId: string,
    @Body() update: UpdateEmployeeProfileDto,
  ) {
    return this.employeeService.updateProfile(employeeId, update);
  }
}
