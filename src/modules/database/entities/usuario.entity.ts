import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'usuarios' })
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 150 })
  nombre!: string;

  @Column({ type: 'varchar', length: 150 })
  apellido!: string;

  @Column({ type: 'varchar', length: 150, unique: true })
  correo!: string;

  @Column({ name: 'clave_hash', type: 'text' })
  claveHash!: string;

  @Column({ name: 'correo_verificado', type: 'boolean', default: false })
  correoVerificado!: boolean;

  @Column({ name: 'dos_factores_activo', type: 'boolean', default: false })
  dosFactoresActivo!: boolean;

  @Column({ name: 'plan_codigo_elegido', type: 'varchar', length: 32, nullable: true })
  planCodigoElegido!: string | null;

  @CreateDateColumn({ name: 'fecha_creacion', type: 'timestamptz' })
  fechaCreacion!: Date;

  @UpdateDateColumn({ name: 'fecha_actualizacion', type: 'timestamptz' })
  fechaActualizacion!: Date;
}
