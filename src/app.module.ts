import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'node:path';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './app/auth/auth.module';
import { EmployeeModule } from './app/employee/employee.module';
import { appConfig } from './config/config';
import { databaseOptions } from './config/database.options';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: join(process.cwd(), 'deploy', 'development.env'),
      isGlobal: true,
      load: [appConfig],
    }),
    TypeOrmModule.forRootAsync({
      useFactory: databaseOptions,
      inject: [ConfigService],
    }),
    AuthModule,
    EmployeeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
