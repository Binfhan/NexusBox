import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getTypeOrmConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get<string>('DB_HOST'),
  port: configService.get<number>('DB_PORT'),
  username: configService.get<string>('DB_USERNAME'),
  password: configService.get<string>('DB_PASSWORD'),
  database: configService.get<string>('DB_NAME'),

  autoLoadEntities: true,

  synchronize: configService.get<string>('NODE_ENV') === 'development',

  logging: true,

  entities: [__dirname + '/../**/*.entity{.ts,.js}'],

  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],

  migrationsRun:
    configService.get<string>('NODE_ENV') === 'production',
});