/**
 * Bodies de ejemplo para Postman (variables del environment).
 * Keys: "METHOD /path/with/:params" (sin baseUrl).
 * Un producto derivado añade aquí los bodies de sus módulos.
 */
export const EXAMPLE_BODIES = {
  'POST /auth/register': {
    email: '{{demoEmail}}',
    password: '{{demoPassword}}',
    nombre: 'Ana',
    apellido: 'Plantilla',
    planCode: 'starter',
  },
  'POST /auth/register/verify-email': {
    verificationToken: '{{verificationToken}}',
    otpCode: '123456',
  },
  'POST /auth/register/resend-email-code': {
    verificationToken: '{{verificationToken}}',
  },
  'POST /auth/login': {
    email: '{{demoEmail}}',
    password: '{{demoPassword}}',
  },
  'POST /auth/login/complete-2fa': {
    twoFactorToken: '{{twoFactorToken}}',
    otpCode: '123456',
  },
  'PATCH /auth/me/two-factor': {
    enabled: false,
    currentPassword: '{{demoPassword}}',
  },

  'POST /seed/platform-plans': {},
  'POST /seed/fundacion': {},

  'POST /empresas': {
    nombre: 'Empresa Postman',
    nombreComercial: 'Postman Demo',
    direccion: 'Av. Winston Churchill 100, Santo Domingo',
    telefono: '8095550199',
    correo: 'postman@plantilla.local',
    sucursalNombre: 'Principal',
    sucursalEsPrincipal: true,
    planCode: 'starter',
  },
  'PATCH /empresas/:id': {
    telefono: '8095550188',
    nombreComercial: 'Postman Demo (editada)',
  },
  'POST /sucursales': {
    codigo: 'SUC-PM',
    nombre: 'Sucursal Postman',
    direccion: 'Santiago',
    telefono: '8095550177',
    esPrincipal: false,
  },
  'PATCH /sucursales/:id': {
    nombre: 'Sucursal Postman editada',
  },

  'POST /roles': {
    codigo: 'CAJERO_DEMO',
    nombre: 'Cajero demo',
    descripcion: 'Rol de prueba Postman',
    modulos: [
      {
        moduloId: '{{moduloId}}',
        lectura: true,
        escritura: false,
        modificar: false,
        eliminar: false,
        especial: false,
        reporte: false,
      },
    ],
  },
  'PATCH /roles/:id': {
    nombre: 'Cajero demo editado',
    descripcion: 'Actualizado desde Postman',
    modulos: [
      {
        moduloId: '{{moduloId}}',
        lectura: true,
        escritura: true,
        modificar: false,
        eliminar: false,
        especial: false,
        reporte: false,
      },
    ],
  },
  'POST /roles/asignaciones': {
    usuarioId: '{{usuarioId}}',
    rolId: '{{rolId}}',
    sucursalId: '{{sucursalId}}',
  },
  'POST /usuarios': {
    correo: 'staff.demo@plantilla.local',
    password: '{{demoPassword}}',
    nombre: 'Staff',
    apellido: 'Demo',
    rolId: '{{rolId}}',
    sucursalId: '{{sucursalId}}',
  },

  'POST /planes': {
    codigo: 'postman',
    nombre: 'Plan Postman',
    descripcion: 'Plan de prueba',
    precio: '0.00',
    moneda: 'USD',
    activo: true,
  },
  'PATCH /planes/:id': {
    nombre: 'Plan Postman editado',
  },
  'POST /payments/platform-subscription/checkout-session': {
    planCode: 'starter',
    returnUrl: 'http://localhost:3001/billing/ok',
    cancelUrl: 'http://localhost:3001/billing/cancel',
  },
  'POST /payments/platform-subscription/pause': {
    reason: 'Pausa de prueba Postman',
  },
  'POST /payments/platform-subscription/resume': {
    reason: 'Reanudación de prueba Postman',
  },
  'POST /payments/platform-subscription/cancel': {
    reason: 'Cancelación de prueba Postman',
  },
  'POST /payments/platform-subscription/sync-provider': {},
  'POST /integrations/paypal/webhook': {
    event_type: 'BILLING.SUBSCRIPTION.ACTIVATED',
    resource: {},
  },
  'POST /webhook/paypal': {
    event_type: 'BILLING.SUBSCRIPTION.ACTIVATED',
    resource: {},
  },
};

export function resolveExampleBody(method, basePath, route) {
  const rel = [basePath, route].filter(Boolean).join('/');
  const key = `${method} /${rel}`.replace(/\/+/g, '/').replace(/\/$/, '') || `${method} /`;
  if (EXAMPLE_BODIES[key]) {
    return EXAMPLE_BODIES[key];
  }
  const generic = key.replace(/\{\{([A-Za-z0-9_]+)\}\}/g, ':$1');
  if (EXAMPLE_BODIES[generic]) {
    return EXAMPLE_BODIES[generic];
  }
  if (method === 'PATCH') {
    return {};
  }
  if (method === 'POST' || method === 'PUT') {
    return {};
  }
  return undefined;
}
