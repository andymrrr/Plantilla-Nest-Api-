import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from './usuario.entity';

@Entity({ name: 'desafios_login_dos_factores' })
export class DesafioLoginDosFactores {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'usuario_id', type: 'uuid' })
  usuarioId!: string;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario!: Usuario;

  @Column({ type: 'varchar', length: 64, unique: true })
  token!: string;

  @Column({ name: 'hash_otp', type: 'varchar', length: 128 })
  hashOtp!: string;

  @Column({ name: 'fecha_expiracion', type: 'timestamptz' })
  fechaExpiracion!: Date;

  @Column({ name: 'cantidad_intentos', type: 'int', default: 0 })
  cantidadIntentos!: number;

  @Column({ name: 'max_intentos', type: 'int', default: 5 })
  maxIntentos!: number;

  @CreateDateColumn({ name: 'fecha_creacion', type: 'timestamptz' })
  fechaCreacion!: Date;
}
