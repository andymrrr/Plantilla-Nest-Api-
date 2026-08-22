import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Empresa } from '../database/entities/empresa.entity';
import { Modulo } from '../database/entities/modulo.entity';
import { Rol } from '../database/entities/rol.entity';
import { RolModulo } from '../database/entities/rol-modulo.entity';
import { Sucursal } from '../database/entities/sucursal.entity';
import { Usuario } from '../database/entities/usuario.entity';
import { UsuarioEmpresa } from '../database/entities/usuario-empresa.entity';
import { UsuarioSucursalRol } from '../database/entities/usuario-sucursal-rol.entity';
import { PaymentsModule } from '../payments/payments.module';
import { EmpresasController } from './empresas.controller';
import { EmpresasService } from './empresas.service';
import { SucursalesController } from './sucursales.controller';
import { SucursalesService } from './sucursales.service';

@Module({
  imports: [
    PaymentsModule,
    TypeOrmModule.forFeature([
      Empresa,
      Sucursal,
      Usuario,
      UsuarioEmpresa,
      UsuarioSucursalRol,
      Rol,
      RolModulo,
      Modulo,
    ]),
  ],
  controllers: [EmpresasController, SucursalesController],
  providers: [EmpresasService, SucursalesService],
  exports: [EmpresasService, SucursalesService],
})
export class EmpresasModule {}
