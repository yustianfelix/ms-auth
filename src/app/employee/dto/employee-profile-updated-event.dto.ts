export interface EmployeeProfileUpdatedEvent {
  eventId: string;
  eventType: 'employee.profile.updated';
  employeeId: string;
  changedFields: Array<'photo' | 'phoneNumber' | 'password'>;
  occurredAt: string;
}
