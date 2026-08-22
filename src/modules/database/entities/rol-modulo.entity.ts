import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Modulo } from './modulo.entity';
import { Rol } from './rol.entity';

@Entity({ name: 'roles_modulos' })
@Unique('uq_rol_modulo', ['rolId', 'moduloId'])
export class RolModulo {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'rol_id', type: 'uuid' })
  rolId!: string;

  @ManyToOne(() => Rol, (rol) => rol.rolesModulos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rol_id' })
  rol!: Rol;

  @Column({ name: 'modulo_id', type: 'uuid' })
  moduloId!: string;

  @ManyToOne(() => Modulo, (modulo) => modulo.rolesModulos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'modulo_id' })
  modulo!: Modulo;

  @Column({ type: 'boolean', default: false })
  lectura!: boolean;

  @Column({ type: 'boolean', default: false })
  escritura!: boolean;

  @Column({ type: 'boolean', default: false })
  modificar!: boolean;

  @Column({ type: 'boolean', default: false })
  eliminar!: boolean;

  @Column({ type: 'boolean', default: false })
  especial!: boolean;

  @Column({ type: 'boolean', default: false })
  reporte!: boolean;
}
