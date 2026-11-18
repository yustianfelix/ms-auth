import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'employee' })
export class Employee {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', name: 'employee_id' })
  employeeId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 320, unique: true })
  email: string;

  @Column({ type: 'text', nullable: true })
  photo: string | null;

  @Column({ type: 'varchar', length: 50, default: 'employee' })
  role: string;

  @Column({ type: 'varchar', length: 32, nullable: true, name: 'phone_number' })
  phoneNumber: string | null;

  @Column({ type: 'text', name: 'password_hash', select: false })
  passwordHash: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
