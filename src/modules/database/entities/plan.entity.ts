import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'planes' })
export class Plan {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 30, unique: true })
  codigo!: string;

  @Column({ type: 'varchar', length: 100 })
  nombre!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  descripcion!: string | null;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  precio!: string;

  @Column({ type: 'char', length: 3, default: 'USD' })
  moneda!: string;

  @Column({ name: 'paypal_plan_id', type: 'varchar', length: 150, nullable: true })
  paypalPlanId!: string | null;

  @Column({ name: 'orden_visualizacion', type: 'int', default: 0 })
  ordenVisualizacion!: number;

  @Column({ name: 'precio_mensual_centavos', type: 'int', default: 0 })
  precioMensualCentavos!: number;

  @Column({ name: 'maximo_recursos', type: 'int', default: 1 })
  maximoRecursos!: number;

  @Column({ type: 'boolean', default: true })
  activo!: boolean;

  @CreateDateColumn({ name: 'fecha_creacion', type: 'timestamptz' })
  fechaCreacion!: Date;

  @UpdateDateColumn({ name: 'fecha_actualizacion', type: 'timestamptz' })
  fechaActualizacion!: Date;
}
