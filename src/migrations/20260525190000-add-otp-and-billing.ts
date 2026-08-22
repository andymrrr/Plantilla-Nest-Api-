import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOtpAndBilling20260525190000 implements MigrationInterface {
  name = 'AddOtpAndBilling20260525190000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "platform_subscription_status_enum" AS ENUM (
          'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "billing_subscription_status_enum" AS ENUM (
          'pending', 'trialing', 'active', 'past_due', 'suspended',
          'canceled', 'expired', 'free'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "email_verified" boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "two_factor_enabled" boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "platform_subscription_plan_code" varchar(32),
      ADD COLUMN IF NOT EXISTS "platform_subscription_status" "platform_subscription_status_enum",
      ADD COLUMN IF NOT EXISTS "platform_subscription_current_period_end" timestamptz,
      ADD COLUMN IF NOT EXISTS "platform_subscription_cancel_at_period_end" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "auth_login_two_factor_challenges" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" integer NOT NULL,
        "token" varchar(64) NOT NULL,
        "otp_hash" varchar(128) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "attempt_count" integer NOT NULL DEFAULT 0,
        "max_attempts" integer NOT NULL DEFAULT 5,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_auth_login_2fa" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_auth_login_2fa_token" UNIQUE ("token"),
        CONSTRAINT "FK_auth_login_2fa_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "auth_register_email_verification_challenges" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" integer NOT NULL,
        "token" varchar(64) NOT NULL,
        "otp_hash" varchar(128) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "last_sent_at" timestamptz NOT NULL,
        "attempt_count" integer NOT NULL DEFAULT 0,
        "max_attempts" integer NOT NULL DEFAULT 5,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_auth_register_email" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_auth_register_email_user" UNIQUE ("user_id"),
        CONSTRAINT "UQ_auth_register_email_token" UNIQUE ("token"),
        CONSTRAINT "FK_auth_register_email_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "platform_subscription_plans" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" varchar(32) NOT NULL,
        "name" varchar(150) NOT NULL,
        "description" text,
        "paypal_plan_id" varchar(255),
        "display_order" integer NOT NULL DEFAULT 0,
        "monthly_price_cents" integer NOT NULL,
        "max_resources" integer NOT NULL DEFAULT 1,
        "active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_platform_subscription_plans" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_platform_subscription_plans_code" UNIQUE ("code")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "billing_subscriptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "owner_user_id" integer NOT NULL,
        "provider" varchar(16) NOT NULL DEFAULT 'paypal',
        "provider_subscription_id" varchar(128),
        "plan_code" varchar(32) NOT NULL,
        "provider_plan_id" varchar(128) NOT NULL,
        "status" "billing_subscription_status_enum" NOT NULL,
        "currency" varchar(3) NOT NULL DEFAULT 'USD',
        "current_period_start" timestamptz,
        "current_period_end" timestamptz,
        "cancel_at_period_end" boolean NOT NULL DEFAULT false,
        "canceled_at" timestamptz,
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_billing_subscriptions" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "billing_webhook_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "provider" varchar(16) NOT NULL DEFAULT 'paypal',
        "provider_event_id" varchar(128),
        "transmission_id" varchar(128),
        "event_type" varchar(128) NOT NULL,
        "received_at" timestamptz NOT NULL DEFAULT now(),
        "processed_at" timestamptz,
        "status" varchar(16) NOT NULL DEFAULT 'received',
        "payload" jsonb NOT NULL,
        "error_message" text,
        CONSTRAINT "PK_billing_webhook_events" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_billing_webhook_transmission"
      ON "billing_webhook_events" ("provider", "transmission_id")
      WHERE "transmission_id" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_billing_webhook_transmission"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "billing_webhook_events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "billing_subscriptions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "platform_subscription_plans"`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "auth_register_email_verification_challenges"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "auth_login_two_factor_challenges"`);
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "platform_subscription_cancel_at_period_end",
      DROP COLUMN IF EXISTS "platform_subscription_current_period_end",
      DROP COLUMN IF EXISTS "platform_subscription_status",
      DROP COLUMN IF EXISTS "platform_subscription_plan_code",
      DROP COLUMN IF EXISTS "two_factor_enabled",
      DROP COLUMN IF EXISTS "email_verified"
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS "billing_subscription_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "platform_subscription_status_enum"`);
  }
}
