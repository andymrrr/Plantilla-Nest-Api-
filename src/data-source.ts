import 'dotenv/config';
import { DataSource } from 'typeorm';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'nest_template',
  synchronize: false,
  logging: (process.env.TYPEORM_LOGGING ?? 'false') === 'true',
  entities: ['src/modules/**/entities/*.ts'],
  migrations: ['src/migrations/*.ts'],
});
