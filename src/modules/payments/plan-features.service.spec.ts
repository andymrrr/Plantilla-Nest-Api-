import { ForbiddenException } from '@nestjs/common';
import { PlanFeaturesService } from './plan-features.service';

describe('PlanFeaturesService', () => {
  const plan = {
    codigo: 'starter',
    maximoRecursos: 1,
    caracteristicas: {},
  };

  function crearServicio(maximoRecursos: number): PlanFeaturesService {
    const suscripcionRepo = {
      findOne: jest.fn().mockResolvedValue({
        plan: { ...plan, maximoRecursos },
      }),
    };
    return new PlanFeaturesService(suscripcionRepo as never);
  }

  it('bloquea una sucursal extra si el plan ya está al tope', async () => {
    const service = crearServicio(1);
    await expect(service.assertCupoSucursales('emp-1', 1)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('permite crear si hay cupo', async () => {
    const service = crearServicio(3);
    await expect(service.assertCupoSucursales('emp-1', 1)).resolves.toBeUndefined();
  });
});
