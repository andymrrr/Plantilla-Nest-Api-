import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Empresa } from './empresa.entity';
import { RolModulo } from './rol-modulo.entity';

@Entity({ name: 'roles' })
export class Rol {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'empresa_id', type: 'uuid', nullable: true })
  empresaId!: string | null;

  @ManyToOne(() => Empresa, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'empresa_id' })
  empresa!: Empresa | null;

  @Column({ type: 'varchar', length: 50 })
  codigo!: string;

  @Column({ type: 'varchar', length: 100 })
  nombre!: string;

  @Column({ type: 'varchar', length: 250, nullable: true })
  descripcion!: string | null;

  @Column({ name: 'es_sistema', type: 'boolean', default: false })
  esSistema!: boolean;

  @Column({ type: 'boolean', default: true })
  activo!: boolean;

  @OneToMany(() => RolModulo, (rolModulo) => rolModulo.rol)
  rolesModulos!: RolModulo[];
}
