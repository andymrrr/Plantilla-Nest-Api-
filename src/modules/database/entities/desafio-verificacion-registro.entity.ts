import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'desafios_verificacion_registro' })
export class DesafioVerificacionRegistro {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'usuario_id', type: 'uuid', unique: true })
  usuarioId!: string;

  @Column({ type: 'varchar', length: 64, unique: true })
  token!: string;

  @Column({ name: 'hash_otp', type: 'varchar', length: 128 })
  hashOtp!: string;

  @Column({ name: 'fecha_expiracion', type: 'timestamptz' })
  fechaExpiracion!: Date;

  @Column({ name: 'fecha_ultimo_envio', type: 'timestamptz' })
  fechaUltimoEnvio!: Date;

  @Column({ name: 'cantidad_intentos', type: 'int', default: 0 })
  cantidadIntentos!: number;

  @Column({ name: 'max_intentos', type: 'int', default: 5 })
  maxIntentos!: number;

  @CreateDateColumn({ name: 'fecha_creacion', type: 'timestamptz' })
  fechaCreacion!: Date;
}
