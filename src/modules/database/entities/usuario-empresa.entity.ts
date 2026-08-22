import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Empresa } from './empresa.entity';
import { Usuario } from './usuario.entity';
import { UsuarioSucursalRol } from './usuario-sucursal-rol.entity';

@Entity({ name: 'usuarios_empresas' })
@Unique('uq_usuario_empresa', ['usuarioId', 'empresaId'])
@Index('ix_usuarios_empresas_usuario', ['usuarioId'])
@Index('ix_usuarios_empresas_empresa', ['empresaId'])
export class UsuarioEmpresa {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'usuario_id', type: 'uuid' })
  usuarioId!: string;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario!: Usuario;

  @Column({ name: 'empresa_id', type: 'uuid' })
  empresaId!: string;

  @ManyToOne(() => Empresa, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'empresa_id' })
  empresa!: Empresa;

  @Column({ name: 'es_propietario', type: 'boolean', default: false })
  esPropietario!: boolean;

  @Column({ type: 'boolean', default: true })
  activo!: boolean;

  @OneToMany(
    () => UsuarioSucursalRol,
    (asignacion) => asignacion.usuarioEmpresa,
  )
  sucursalesRoles!: UsuarioSucursalRol[];
}
