import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Aplicacion } from './aplicacion.entity';
import { RolModulo } from './rol-modulo.entity';

@Entity({ name: 'modulos' })
export class Modulo {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'aplicacion_id', type: 'uuid' })
  aplicacionId!: string;

  @ManyToOne(() => Aplicacion, (aplicacion) => aplicacion.modulos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'aplicacion_id' })
  aplicacion!: Aplicacion;

  @Column({ type: 'varchar', length: 80, unique: true })
  codigo!: string;

  @Column({ type: 'varchar', length: 150 })
  nombre!: string;

  @Column({ type: 'varchar', length: 250, nullable: true })
  descripcion!: string | null;

  @Column({ type: 'boolean', default: true })
  activo!: boolean;

  @OneToMany(() => RolModulo, (rolModulo) => rolModulo.modulo)
  rolesModulos!: RolModulo[];
}
