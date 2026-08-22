export { Aplicacion } from './aplicacion.entity';
export { DesafioLoginDosFactores } from './desafio-login-dos-factores.entity';
export { DesafioVerificacionRegistro } from './desafio-verificacion-registro.entity';
export { Empresa } from './empresa.entity';
export { EstadoEventoPaypal } from './estado-evento-paypal.enum';
export { EstadoSuscripcionPlataforma } from './estado-suscripcion-plataforma.enum';
export { EstadoSuscripcionProveedor } from './estado-suscripcion-proveedor.enum';
export { EventoPaypal } from './evento-paypal.entity';
export { Modulo } from './modulo.entity';
export { Plan } from './plan.entity';
export { Rol } from './rol.entity';
export { RolModulo } from './rol-modulo.entity';
export { Sucursal } from './sucursal.entity';
export { Suscripcion } from './suscripcion.entity';
export { Usuario } from './usuario.entity';
export { UsuarioEmpresa } from './usuario-empresa.entity';
export { UsuarioSucursalRol } from './usuario-sucursal-rol.entity';

import { Aplicacion } from './aplicacion.entity';
import { DesafioLoginDosFactores } from './desafio-login-dos-factores.entity';
import { DesafioVerificacionRegistro } from './desafio-verificacion-registro.entity';
import { Empresa } from './empresa.entity';
import { EventoPaypal } from './evento-paypal.entity';
import { Modulo } from './modulo.entity';
import { Plan } from './plan.entity';
import { Rol } from './rol.entity';
import { RolModulo } from './rol-modulo.entity';
import { Sucursal } from './sucursal.entity';
import { Suscripcion } from './suscripcion.entity';
import { Usuario } from './usuario.entity';
import { UsuarioEmpresa } from './usuario-empresa.entity';
import { UsuarioSucursalRol } from './usuario-sucursal-rol.entity';

export const ENTIDADES_PLANTILLA = [
  Usuario,
  Empresa,
  Sucursal,
  Aplicacion,
  Modulo,
  Rol,
  RolModulo,
  UsuarioEmpresa,
  UsuarioSucursalRol,
  Plan,
  Suscripcion,
  EventoPaypal,
  DesafioLoginDosFactores,
  DesafioVerificacionRegistro,
];
