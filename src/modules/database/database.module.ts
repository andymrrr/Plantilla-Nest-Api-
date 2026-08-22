import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ENTIDADES_PLANTILLA } from './entities';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('DB_HOST') ?? 'localhost',
        port: Number(config.get<string>('DB_PORT') ?? 5432),
        username: config.get<string>('DB_USER') ?? 'postgres',
        password: config.get<string>('DB_PASSWORD') ?? 'postgres',
        database: config.get<string>('DB_NAME') ?? 'nest_template',
        entities: ENTIDADES_PLANTILLA,
        synchronize: config.get<string>('TYPEORM_SYNCHRONIZE') === 'true',
        logging: (config.get<string>('TYPEORM_LOGGING') ?? 'false') === 'true',
      }),
    }),
    TypeOrmModule.forFeature(ENTIDADES_PLANTILLA),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
