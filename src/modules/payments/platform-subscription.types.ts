import type { EstadoSuscripcionPlataforma } from '../database/entities/estado-suscripcion-plataforma.enum';

export interface EstadoSuscripcionDto {
  estado: 'ninguna' | EstadoSuscripcionPlataforma;
  codigoPlan: string | null;
  fechaFinPeriodo: string | null;
  cancelarAlFinPeriodo: boolean;
}

export interface ResultadoSincronizacionProveedor extends EstadoSuscripcionDto {
  proveedorConsultado: boolean;
  actualizado: boolean;
}

export interface FilaFacturaSuscripcion {
  id: string | null;
  estado: string;
  moneda: string;
  monto: string;
  pagadoEn: string | null;
}

export interface ItemPlanSuscripcion {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  ordenVisualizacion: number;
  precioMensualCentavos: number;
  maximoRecursos: number;
  paypalPlanId?: string | null;
}
