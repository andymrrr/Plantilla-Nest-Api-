import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Empresa } from './empresa.entity';
import { EstadoSuscripcionPlataforma } from './estado-suscripcion-plataforma.enum';
import { EstadoSuscripcionProveedor } from './estado-suscripcion-proveedor.enum';
import { Plan } from './plan.entity';

@Entity({ name: 'suscripciones' })
export class Suscripcion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'empresa_id', type: 'uuid' })
  empresaId!: string;

  @ManyToOne(() => Empresa)
  @JoinColumn({ name: 'empresa_id' })
  empresa!: Empresa;

  @Column({ name: 'plan_id', type: 'uuid' })
  planId!: string;

  @ManyToOne(() => Plan)
  @JoinColumn({ name: 'plan_id' })
  plan!: Plan;

  @Column({
    name: 'paypal_customer_id',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  paypalCustomerId!: string | null;

  @Column({
    name: 'paypal_subscription_id',
    type: 'varchar',
    length: 150,
    unique: true,
    nullable: true,
  })
  paypalSubscriptionId!: string | null;

  @Column({ name: 'fecha_inicio', type: 'timestamptz' })
  fechaInicio!: Date;

  @Column({ name: 'fecha_proximo_pago', type: 'timestamptz', nullable: true })
  fechaProximoPago!: Date | null;

  @Column({ name: 'fecha_cancelacion', type: 'timestamptz', nullable: true })
  fechaCancelacion!: Date | null;

  @Column({
    name: 'estado_proveedor',
    type: 'enum',
    enum: EstadoSuscripcionProveedor,
    enumName: 'estado_suscripcion_proveedor_enum',
    default: EstadoSuscripcionProveedor.PENDIENTE,
  })
  estadoProveedor!: EstadoSuscripcionProveedor;

  @Column({
    name: 'estado_plataforma',
    type: 'enum',
    enum: EstadoSuscripcionPlataforma,
    enumName: 'estado_suscripcion_plataforma_enum',
    nullable: true,
  })
  estadoPlataforma!: EstadoSuscripcionPlataforma | null;

  @Column({
    name: 'cancelar_al_fin_periodo',
    type: 'boolean',
    default: false,
  })
  cancelarAlFinPeriodo!: boolean;

  @Column({ type: 'char', length: 3, default: 'USD' })
  moneda!: string;

  @Column({ name: 'metadatos', type: 'jsonb', default: () => "'{}'::jsonb" })
  metadatos!: Record<string, unknown>;

  @CreateDateColumn({ name: 'fecha_creacion', type: 'timestamptz' })
  fechaCreacion!: Date;

  @UpdateDateColumn({ name: 'fecha_actualizacion', type: 'timestamptz' })
  fechaActualizacion!: Date;
}
