import { MigrationInterface, QueryRunner } from 'typeorm';

export class PlanCaracteristicas20260915120000 implements MigrationInterface {
  name = 'PlanCaracteristicas20260915120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "planes"
      ADD COLUMN IF NOT EXISTS "caracteristicas" jsonb NOT NULL DEFAULT '{}'::jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "planes" DROP COLUMN IF EXISTS "caracteristicas"
    `);
  }
}
