export interface RespuestaServicio<T> {
  exito: boolean;
  mensaje: string;
  data?: T;
  error?: string;
}

export class ResponseHelper {
  static ok<T>(data: T, mensaje = 'OK'): RespuestaServicio<T> {
    return {
      exito: true,
      data,
      mensaje,
    };
  }

  static fail(mensaje: string, error?: string): RespuestaServicio<null> {
    return {
      exito: false,
      mensaje,
      error,
    };
  }
}
