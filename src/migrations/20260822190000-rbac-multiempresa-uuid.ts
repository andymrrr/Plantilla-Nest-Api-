import { MigrationInterface, QueryRunner } from 'typeorm';

export class RbacMultiempresaUuid20260822190000 implements MigrationInterface {
  name = 'RbacMultiempresaUuid20260822190000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      DROP TABLE IF EXISTS
        "auth_login_two_factor_challenges",
        "auth_register_email_verification_challenges",
        "billing_webhook_events",
        "billing_subscriptions",
        "platform_subscription_plans",
        "users",
        "roles"
      CASCADE
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS "platform_subscription_status_enum";
      DROP TYPE IF EXISTS "billing_subscription_status_enum";
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "estado_suscripcion_proveedor_enum" AS ENUM (
          'pendiente', 'en_prueba', 'activa', 'vencida', 'suspendida',
          'cancelada', 'expirada', 'gratuita'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "estado_suscripcion_plataforma_enum" AS ENUM (
          'en_prueba', 'activa', 'vencida', 'cancelada', 'impaga', 'incompleta'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "estado_evento_paypal_enum" AS ENUM (
          'recibido', 'procesando', 'procesado', 'fallido', 'ignorado'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE "usuarios" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "nombre" varchar(150) NOT NULL,
        "apellido" varchar(150) NOT NULL,
        "correo" varchar(150) NOT NULL,
        "clave_hash" text NOT NULL,
        "correo_verificado" boolean NOT NULL DEFAULT false,
        "dos_factores_activo" boolean NOT NULL DEFAULT false,
        "plan_codigo_elegido" varchar(32),
        "fecha_creacion" timestamptz NOT NULL DEFAULT now(),
        "fecha_actualizacion" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_usuarios" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_usuarios_correo" UNIQUE ("correo")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "empresas" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "nombre" varchar(200) NOT NULL,
        "nombre_comercial" varchar(200),
        "direccion" text,
        "telefono" varchar(30),
        "correo" varchar(150),
        "propietario_usuario_id" uuid,
        "activo" boolean NOT NULL DEFAULT true,
        "fecha_creacion" timestamptz NOT NULL DEFAULT now(),
        "fecha_actualizacion" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_empresas" PRIMARY KEY ("id"),
        CONSTRAINT "FK_empresas_propietario" FOREIGN KEY ("propietario_usuario_id")
          REFERENCES "usuarios"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "sucursales" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "empresa_id" uuid NOT NULL,
        "codigo" varchar(30) NOT NULL,
        "nombre" varchar(150) NOT NULL,
        "direccion" text,
        "telefono" varchar(30),
        "es_principal" boolean NOT NULL DEFAULT false,
        "fecha_creacion" timestamptz NOT NULL DEFAULT now(),
        "fecha_actualizacion" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sucursales" PRIMARY KEY ("id"),
        CONSTRAINT "uq_sucursal_codigo" UNIQUE ("empresa_id", "codigo"),
        CONSTRAINT "FK_sucursales_empresa" FOREIGN KEY ("empresa_id")
          REFERENCES "empresas"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "ix_sucursales_empresa" ON "sucursales" ("empresa_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "aplicaciones" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "codigo" varchar(50) NOT NULL,
        "nombre" varchar(100) NOT NULL,
        "descripcion" varchar(250),
        "activo" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_aplicaciones" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_aplicaciones_codigo" UNIQUE ("codigo")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "modulos" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "aplicacion_id" uuid NOT NULL,
        "codigo" varchar(80) NOT NULL,
        "nombre" varchar(150) NOT NULL,
        "descripcion" varchar(250),
        "activo" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_modulos" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_modulos_codigo" UNIQUE ("codigo"),
        CONSTRAINT "FK_modulos_aplicacion" FOREIGN KEY ("aplicacion_id")
          REFERENCES "aplicaciones"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "empresa_id" uuid,
        "codigo" varchar(50) NOT NULL,
        "nombre" varchar(100) NOT NULL,
        "descripcion" varchar(250),
        "es_sistema" boolean NOT NULL DEFAULT false,
        "activo" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_roles" PRIMARY KEY ("id"),
        CONSTRAINT "FK_roles_empresa" FOREIGN KEY ("empresa_id")
          REFERENCES "empresas"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_roles_sistema_codigo"
      ON "roles" ("codigo") WHERE "empresa_id" IS NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_roles_empresa_codigo"
      ON "roles" ("empresa_id", "codigo") WHERE "empresa_id" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE TABLE "roles_modulos" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "rol_id" uuid NOT NULL,
        "modulo_id" uuid NOT NULL,
        "lectura" boolean NOT NULL DEFAULT false,
        "escritura" boolean NOT NULL DEFAULT false,
        "modificar" boolean NOT NULL DEFAULT false,
        "eliminar" boolean NOT NULL DEFAULT false,
        "especial" boolean NOT NULL DEFAULT false,
        "reporte" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_roles_modulos" PRIMARY KEY ("id"),
        CONSTRAINT "uq_rol_modulo" UNIQUE ("rol_id", "modulo_id"),
        CONSTRAINT "FK_roles_modulos_rol" FOREIGN KEY ("rol_id")
          REFERENCES "roles"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_roles_modulos_modulo" FOREIGN KEY ("modulo_id")
          REFERENCES "modulos"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "usuarios_empresas" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "usuario_id" uuid NOT NULL,
        "empresa_id" uuid NOT NULL,
        "es_propietario" boolean NOT NULL DEFAULT false,
        "activo" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_usuarios_empresas" PRIMARY KEY ("id"),
        CONSTRAINT "uq_usuario_empresa" UNIQUE ("usuario_id", "empresa_id"),
        CONSTRAINT "FK_usuarios_empresas_usuario" FOREIGN KEY ("usuario_id")
          REFERENCES "usuarios"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_usuarios_empresas_empresa" FOREIGN KEY ("empresa_id")
          REFERENCES "empresas"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "ix_usuarios_empresas_usuario" ON "usuarios_empresas" ("usuario_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_usuarios_empresas_empresa" ON "usuarios_empresas" ("empresa_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "usuarios_sucursales_roles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "usuario_empresa_id" uuid NOT NULL,
        "sucursal_id" uuid,
        "rol_id" uuid NOT NULL,
        "activo" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_usuarios_sucursales_roles" PRIMARY KEY ("id"),
        CONSTRAINT "FK_usr_membresia" FOREIGN KEY ("usuario_empresa_id")
          REFERENCES "usuarios_empresas"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_usr_sucursal" FOREIGN KEY ("sucursal_id")
          REFERENCES "sucursales"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_usr_rol" FOREIGN KEY ("rol_id")
          REFERENCES "roles"("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "ix_usuarios_sucursales_roles_usuario_empresa"
      ON "usuarios_sucursales_roles" ("usuario_empresa_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "planes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "codigo" varchar(30) NOT NULL,
        "nombre" varchar(100) NOT NULL,
        "descripcion" varchar(500),
        "precio" numeric(18,2) NOT NULL DEFAULT 0,
        "moneda" char(3) NOT NULL DEFAULT 'USD',
        "paypal_plan_id" varchar(150),
        "orden_visualizacion" integer NOT NULL DEFAULT 0,
        "precio_mensual_centavos" integer NOT NULL DEFAULT 0,
        "maximo_recursos" integer NOT NULL DEFAULT 1,
        "activo" boolean NOT NULL DEFAULT true,
        "fecha_creacion" timestamptz NOT NULL DEFAULT now(),
        "fecha_actualizacion" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_planes" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_planes_codigo" UNIQUE ("codigo")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "suscripciones" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "empresa_id" uuid NOT NULL,
        "plan_id" uuid NOT NULL,
        "paypal_customer_id" varchar(150),
        "paypal_subscription_id" varchar(150),
        "fecha_inicio" timestamptz NOT NULL,
        "fecha_proximo_pago" timestamptz,
        "fecha_cancelacion" timestamptz,
        "estado_proveedor" "estado_suscripcion_proveedor_enum" NOT NULL DEFAULT 'pendiente',
        "estado_plataforma" "estado_suscripcion_plataforma_enum",
        "cancelar_al_fin_periodo" boolean NOT NULL DEFAULT false,
        "moneda" char(3) NOT NULL DEFAULT 'USD',
        "metadatos" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "fecha_creacion" timestamptz NOT NULL DEFAULT now(),
        "fecha_actualizacion" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_suscripciones" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_suscripciones_paypal" UNIQUE ("paypal_subscription_id"),
        CONSTRAINT "FK_suscripciones_empresa" FOREIGN KEY ("empresa_id")
          REFERENCES "empresas"("id"),
        CONSTRAINT "FK_suscripciones_plan" FOREIGN KEY ("plan_id")
          REFERENCES "planes"("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "eventos_paypal" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "evento_id_paypal" varchar(200) NOT NULL,
        "tipo_evento" varchar(150) NOT NULL,
        "fecha_evento" timestamptz NOT NULL,
        "contenido" jsonb NOT NULL,
        "procesado" boolean NOT NULL DEFAULT false,
        "fecha_procesamiento" timestamptz,
        "estado" "estado_evento_paypal_enum" NOT NULL DEFAULT 'recibido',
        "mensaje_error" text,
        "id_transmision" varchar(128),
        CONSTRAINT "PK_eventos_paypal" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_eventos_paypal_evento" UNIQUE ("evento_id_paypal")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "desafios_login_dos_factores" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "usuario_id" uuid NOT NULL,
        "token" varchar(64) NOT NULL,
        "hash_otp" varchar(128) NOT NULL,
        "fecha_expiracion" timestamptz NOT NULL,
        "cantidad_intentos" integer NOT NULL DEFAULT 0,
        "max_intentos" integer NOT NULL DEFAULT 5,
        "fecha_creacion" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_desafios_login_2fa" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_desafios_login_2fa_token" UNIQUE ("token"),
        CONSTRAINT "FK_desafios_login_2fa_usuario" FOREIGN KEY ("usuario_id")
          REFERENCES "usuarios"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "desafios_verificacion_registro" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "usuario_id" uuid NOT NULL,
        "token" varchar(64) NOT NULL,
        "hash_otp" varchar(128) NOT NULL,
        "fecha_expiracion" timestamptz NOT NULL,
        "fecha_ultimo_envio" timestamptz NOT NULL,
        "cantidad_intentos" integer NOT NULL DEFAULT 0,
        "max_intentos" integer NOT NULL DEFAULT 5,
        "fecha_creacion" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_desafios_verificacion_registro" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_desafios_verificacion_usuario" UNIQUE ("usuario_id"),
        CONSTRAINT "UQ_desafios_verificacion_token" UNIQUE ("token")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS
        "desafios_verificacion_registro",
        "desafios_login_dos_factores",
        "eventos_paypal",
        "suscripciones",
        "planes",
        "usuarios_sucursales_roles",
        "usuarios_empresas",
        "roles_modulos",
        "roles",
        "modulos",
        "aplicaciones",
        "sucursales",
        "empresas",
        "usuarios"
      CASCADE
    `);
    await queryRunner.query(`
      DROP TYPE IF EXISTS "estado_evento_paypal_enum";
      DROP TYPE IF EXISTS "estado_suscripcion_plataforma_enum";
      DROP TYPE IF EXISTS "estado_suscripcion_proveedor_enum";
    `);
  }
}
