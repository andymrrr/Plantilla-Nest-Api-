import { NotFoundException } from '@nestjs/common';
import type { RequestUser } from '../types/request-user.types';

export function requireEmpresaId(user: RequestUser): string {
  if (!user.empresaId) {
    throw new NotFoundException('No hay empresa activa en el contexto.');
  }
  return user.empresaId;
}
