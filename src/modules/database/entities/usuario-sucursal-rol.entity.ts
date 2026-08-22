import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Rol } from './rol.entity';
import { Sucursal } from './sucursal.entity';
import { UsuarioEmpresa } from './usuario-empresa.entity';

@Entity({ name: 'usuarios_sucursales_roles' })
@Index('ix_usuarios_sucursales_roles_usuario_empresa', ['usuarioEmpresaId'])
export class UsuarioSucursalRol {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'usuario_empresa_id', type: 'uuid' })
  usuarioEmpresaId!: string;

  @ManyToOne(() => UsuarioEmpresa, (membresia) => membresia.sucursalesRoles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'usuario_empresa_id' })
  usuarioEmpresa!: UsuarioEmpresa;

  @Column({ name: 'sucursal_id', type: 'uuid', nullable: true })
  sucursalId!: string | null;

  @ManyToOne(() => Sucursal, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sucursal_id' })
  sucursal!: Sucursal | null;

  @Column({ name: 'rol_id', type: 'uuid' })
  rolId!: string;

  @ManyToOne(() => Rol)
  @JoinColumn({ name: 'rol_id' })
  rol!: Rol;

  @Column({ type: 'boolean', default: true })
  activo!: boolean;
}
