/**
 * Genera las colecciones Postman a partir de los *.controller.ts.
 *
 * Uso: node docs/postman/generate-full-collection.mjs
 *
 * Un producto derivado (Nexo, AulaPlan) regenera con el mismo script:
 * el walker lee todos los controladores; los bodies extra van en example-bodies.mjs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveExampleBody } from './example-bodies.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const SRC = path.join(ROOT, 'src');
const OUT_COMPLETE = path.join(__dirname, 'Plantilla-API-Complete.postman_collection.json');
const OUT_READY = path.join(__dirname, 'Plantilla-API-Ready.postman_collection.json');
const OUT_USERS = path.join(__dirname, 'Plantilla-Auth-Seed.postman_collection.json');

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.name.endsWith('.controller.ts')) acc.push(full);
  }
  return acc;
}

function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

function parseControllerPath(src) {
  const m = src.match(/@Controller\(\s*(?:\[([^\]]+)\]|'([^']*)'|"([^"]*)")?\s*\)/);
  if (!m) return [''];
  if (m[1]) {
    return [...m[1].matchAll(/'([^']+)'|"([^"]+)"/g)].map((x) => x[1] || x[2]);
  }
  return [m[2] || m[3] || ''];
}

function extractPermission(block) {
  const m = block.match(/@RequirePermission\(\s*'([^']+)'\s*,\s*'([^']+)'\s*\)/);
  return m ? `${m[1]}.${m[2]}` : null;
}

function buildUrl(basePath, route) {
  const segments = [];
  if (basePath) {
    for (const part of basePath.split('/').filter(Boolean)) {
      if (part.startsWith(':')) segments.push(`{{${part.slice(1)}}}`);
      else segments.push(part);
    }
  }
  const rel = (route || '').replace(/^\//, '');
  if (rel) {
    for (const part of rel.split('/').filter(Boolean)) {
      if (part.startsWith(':')) segments.push(`{{${part.slice(1)}}}`);
      else segments.push(part);
    }
  }
  const raw = `{{baseUrl}}/${segments.join('/')}`.replace(/\/+$/, '') || '{{baseUrl}}/';
  return {
    raw: raw === '{{baseUrl}}' ? '{{baseUrl}}/' : raw,
    host: ['{{baseUrl}}'],
    path: segments.length ? segments : [''],
  };
}

function makeRequest({
  name,
  method,
  basePath,
  route,
  permission,
  isPublic,
  skipEmpresa,
  hasBody,
  hasQuery,
}) {
  const exampleBody = hasBody
    ? resolveExampleBody(method, basePath, route)
    : undefined;
  const mutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  const idempotent = mutation && !isPublic && !String(basePath).includes('webhook');

  const headers = [];
  if (exampleBody !== undefined) {
    headers.push({ key: 'Content-Type', value: 'application/json' });
  }
  if (!isPublic && !skipEmpresa) {
    headers.push({
      key: 'x-empresa-id',
      value: '{{empresaId}}',
      description: 'Empresa activa (ContextoEmpresaGuard)',
    });
    headers.push({
      key: 'x-sucursal-id',
      value: '{{sucursalId}}',
      description: 'Opcional. Si el rol es por sucursal, envíala.',
      disabled: true,
    });
  }
  if (idempotent) {
    headers.push({
      key: 'x-idempotency-key',
      value: '{{$guid}}',
      description: 'Mutación idempotente',
    });
  }

  const descParts = [];
  if (permission) descParts.push(`Permiso: \`${permission}\``);
  if (isPublic) descParts.push('Público (`@Public`)');
  if (skipEmpresa) descParts.push('No exige `x-empresa-id` (`@SkipEmpresaContext`)');
  if (idempotent) descParts.push('Enviar `x-idempotency-key`');
  if (exampleBody && Object.keys(exampleBody).some((k) => String(exampleBody[k]).includes('{{'))) {
    descParts.push('Variables `{{…}}`: ejecuta Setup o captura IDs con GET.');
  }

  const request = {
    method,
    header: headers,
    url: buildUrl(basePath, route),
    description: descParts.join('\n') || undefined,
  };

  if (exampleBody !== undefined) {
    request.body = {
      mode: 'raw',
      raw: JSON.stringify(exampleBody, null, 2),
      options: { raw: { language: 'json' } },
    };
  }

  if (!isPublic) {
    request.auth = {
      type: 'bearer',
      bearer: [{ key: 'token', value: '{{accessToken}}', type: 'string' }],
    };
  }

  if (hasQuery) {
    request.url.query = [
      { key: 'page', value: '1', disabled: false },
      { key: 'limit', value: '20', disabled: false },
      { key: 'search', value: '', disabled: true },
      { key: 'orderBy', value: '', disabled: true },
      { key: 'order', value: 'asc', disabled: true },
    ];
  }

  return { name, request, response: [] };
}

function parseHandlers(src, basePaths, classSkipEmpresa) {
  const clean = stripComments(src);
  const handlers = [];
  const re =
    /((?:@[A-Za-z]+(?:\([^)]*\))?\s*)+)(async\s+)?([A-Za-z0-9_]+)\s*\(/g;
  let match;
  while ((match = re.exec(clean))) {
    const block = match[1];
    const methodName = match[3];
    if (methodName === 'constructor') continue;

    const verbMatch = block.match(
      /@(Get|Post|Put|Patch|Delete)\(\s*(?:'([^']*)'|"([^"]*)")?\s*\)/,
    );
    if (!verbMatch) continue;

    const method = verbMatch[1].toUpperCase();
    const route = verbMatch[2] ?? verbMatch[3] ?? '';
    const permission = extractPermission(block);
    const isPublic = /@Public\b/.test(block);
    const skipEmpresa = classSkipEmpresa || /@SkipEmpresaContext\b/.test(block);
    const hasBody = /@Body\b/.test(block) || ['POST', 'PUT', 'PATCH'].includes(method);
    const hasQuery =
      method === 'GET' &&
      !route.includes(':') &&
      (methodName.toLowerCase().includes('list') ||
        methodName === 'findAll' ||
        methodName === 'paginate' ||
        methodName === 'paginar' ||
        methodName === 'listar' ||
        methodName === 'valores' ||
        methodName === 'modulos' ||
        methodName === 'aplicaciones' ||
        !route ||
        route === '' ||
        /report|export|preview|dashboard|planes/i.test(route + methodName));

    for (const basePath of basePaths) {
      const joined = [basePath, route].filter(Boolean).join('/');
      const fullName = joined
        ? `${method} /${joined}`.replace(/\/+/g, '/')
        : `${method} /`;
      handlers.push(
        makeRequest({
          name: fullName === `${method} /` ? fullName : fullName.replace(/\/$/, ''),
          method,
          basePath,
          route,
          permission,
          isPublic,
          skipEmpresa,
          hasBody: hasBody && method !== 'GET' && method !== 'DELETE',
          hasQuery,
        }),
      );
    }
  }
  return handlers;
}

function splitControllerChunks(src) {
  const clean = stripComments(src);
  const parts = clean.split(/(?=@Controller\()/);
  return parts.filter((part) => /@Controller\(/.test(part));
}

function folderNameFromFile(filePath) {
  const rel = path.relative(path.join(SRC, 'modules'), filePath);
  if (rel.startsWith('..')) return 'app';
  return rel.split(path.sep)[0] || 'app';
}

function controllerFolderLabel(filePath, basePaths) {
  const base = path.basename(filePath, '.controller.ts');
  return basePaths.filter(Boolean).join(' | ') || base;
}

function parseCrudResources() {
  const modulesDir = path.join(SRC, 'modules');
  if (!fs.existsSync(modulesDir)) return [];
  const files = fs
    .readdirSync(modulesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(modulesDir, entry.name, `${entry.name}.module.ts`))
    .filter((file) => fs.existsSync(file));
  const resources = [];
  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    const moduleName = path.basename(path.dirname(file));
    const re = /ruta:\s*'([^']+)'[\s\S]*?modulo:\s*'([^']+)'/g;
    let match;
    while ((match = re.exec(src))) {
      resources.push({ ruta: match[1], modulo: match[2], moduleName });
    }
  }
  return resources;
}

function crudHandlers(ruta, modulo) {
  const perm = (flag) => `${modulo}.${flag}`;
  return [
    makeRequest({
      name: `GET /${ruta}`,
      method: 'GET',
      basePath: ruta,
      route: '',
      permission: perm('lectura'),
      isPublic: false,
      skipEmpresa: false,
      hasBody: false,
      hasQuery: true,
    }),
    makeRequest({
      name: `POST /${ruta}`,
      method: 'POST',
      basePath: ruta,
      route: '',
      permission: perm('escritura'),
      isPublic: false,
      skipEmpresa: false,
      hasBody: true,
      hasQuery: false,
    }),
    makeRequest({
      name: `GET /${ruta}/:id`,
      method: 'GET',
      basePath: ruta,
      route: ':id',
      permission: perm('lectura'),
      isPublic: false,
      skipEmpresa: false,
      hasBody: false,
      hasQuery: false,
    }),
    makeRequest({
      name: `PATCH /${ruta}/:id`,
      method: 'PATCH',
      basePath: ruta,
      route: ':id',
      permission: perm('modificar'),
      isPublic: false,
      skipEmpresa: false,
      hasBody: true,
      hasQuery: false,
    }),
    makeRequest({
      name: `DELETE /${ruta}/:id`,
      method: 'DELETE',
      basePath: ruta,
      route: ':id',
      permission: perm('eliminar'),
      isPublic: false,
      skipEmpresa: false,
      hasBody: false,
      hasQuery: false,
    }),
  ];
}

const files = walk(SRC).sort();
const byModule = new Map();

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const moduleName = folderNameFromFile(file);
  const chunks = splitControllerChunks(src);
  for (const chunk of chunks) {
    const basePaths = parseControllerPath(chunk);
    const header = chunk.slice(0, chunk.search(/export class /));
    const classSkip = /@SkipEmpresaContext\b/.test(header);
    const handlers = parseHandlers(chunk, basePaths, classSkip);
    if (!handlers.length) continue;
    if (!byModule.has(moduleName)) byModule.set(moduleName, []);
    byModule.get(moduleName).push({
      name: controllerFolderLabel(file, basePaths),
      item: handlers,
    });
  }
}

for (const recurso of parseCrudResources()) {
  if (!byModule.has(recurso.moduleName)) byModule.set(recurso.moduleName, []);
  byModule.get(recurso.moduleName).push({
    name: recurso.ruta,
    item: crudHandlers(recurso.ruta, recurso.modulo),
  });
}

const saveSessionTestEvent = {
  listen: 'test',
  script: {
    type: 'text/javascript',
    exec: [
      'const json = pm.response.json();',
      'const data = json && json.data;',
      'if (!data) { return; }',
      'if (data.accessToken || data.access_token) {',
      "  pm.environment.set('accessToken', data.accessToken || data.access_token);",
      '}',
      'if (data.verificationToken) {',
      "  pm.environment.set('verificationToken', data.verificationToken);",
      '}',
      'if (data.twoFactorToken) {',
      "  pm.environment.set('twoFactorToken', data.twoFactorToken);",
      '}',
    ],
  },
};

function loginHelper(name, description) {
  return {
    name,
    event: [saveSessionTestEvent],
    request: {
      method: 'POST',
      header: [{ key: 'Content-Type', value: 'application/json' }],
      body: {
        mode: 'raw',
        raw: '{\n  "email": "{{demoEmail}}",\n  "password": "{{demoPassword}}"\n}',
        options: { raw: { language: 'json' } },
      },
      url: {
        raw: '{{baseUrl}}/auth/login',
        host: ['{{baseUrl}}'],
        path: ['auth', 'login'],
      },
      description,
    },
    response: [],
  };
}

function registerHelper() {
  const item = makeRequest({
    name: 'POST /auth/register',
    method: 'POST',
    basePath: 'auth',
    route: 'register',
    permission: null,
    isPublic: true,
    skipEmpresa: true,
    hasBody: true,
    hasQuery: false,
  });
  item.event = [saveSessionTestEvent];
  return item;
}

const authHelpers = {
  name: '00 — Auth helpers',
  description:
    'Seed RBAC/planes + registro/login. Password: `{{demoPassword}}`. Tras login, crea empresa y corre Setup.',
  item: [
    makeRequest({
      name: 'POST /seed/fundacion',
      method: 'POST',
      basePath: 'seed',
      route: 'fundacion',
      permission: null,
      isPublic: true,
      skipEmpresa: true,
      hasBody: true,
      hasQuery: false,
    }),
    makeRequest({
      name: 'POST /seed/platform-plans',
      method: 'POST',
      basePath: 'seed',
      route: 'platform-plans',
      permission: null,
      isPublic: true,
      skipEmpresa: true,
      hasBody: true,
      hasQuery: false,
    }),
    registerHelper(),
    loginHelper(
      'POST /auth/login',
      'Guarda accessToken (y twoFactorToken si el usuario tiene 2FA).',
    ),
  ],
};

const moduleOrder = [
  'auth',
  'seed',
  'empresas',
  'users',
  'roles',
  'payments',
  'app',
];

const sortedModules = [...byModule.keys()].sort((a, b) => {
  const ia = moduleOrder.indexOf(a);
  const ib = moduleOrder.indexOf(b);
  return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib) || a.localeCompare(b);
});

const items = [
  authHelpers,
  ...sortedModules.map((mod) => ({
    name: mod,
    item: byModule.get(mod),
  })),
];

function countItems(nodes, acc = { n: 0 }) {
  for (const n of nodes) {
    if (n.request) acc.n += 1;
    if (n.item) countItems(n.item, acc);
  }
  return acc.n;
}

const total = countItems(items);

const collectionInfo = (name, extra) => ({
  _postman_id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  name,
  description: [
    `# ${name}`,
    '',
    'Plantilla Nest API: auth OTP/2FA, empresas, sucursales, usuarios, roles y billing PayPal.',
    'Autorización por **módulo + flag** (`lectura`, `escritura`, `modificar`, `eliminar`, `especial`, `reporte`).',
    '',
    `**Endpoints:** ~${total}`,
    '**Base URL:** `{{baseUrl}}`',
    '',
    '## Arranque',
    '1. Importa `Plantilla-Demo.postman_environment.json` y actívalo.',
    '2. `SEED_ENDPOINT_ENABLED=true` y `NODE_ENV` ≠ `production`.',
    '3. `00 — Auth helpers` → seed + register + login (guarda `accessToken`).',
    '4. `POST /empresas` (onboarding) y luego Ready → `00 — Setup`.',
    '5. Rutas de negocio: `Bearer {{accessToken}}` + `x-empresa-id: {{empresaId}}`.',
    '',
    'Guía: `docs/postman/README.md`',
    '',
    'Regenerar: `node docs/postman/generate-full-collection.mjs`',
    extra ? `\n${extra}` : '',
  ].join('\n'),
  schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
});

const collectionVars = [
  { key: 'baseUrl', value: 'http://localhost:3000' },
  { key: 'demoEmail', value: 'propietario@plantilla.local' },
  { key: 'demoPassword', value: 'Demo1234!' },
  { key: 'accessToken', value: '' },
  { key: 'empresaId', value: '' },
  { key: 'sucursalId', value: '' },
  { key: 'id', value: '' },
  { key: 'rolId', value: '' },
  { key: 'usuarioId', value: '' },
  { key: 'moduloId', value: '' },
  { key: 'planId', value: '' },
];

const complete = {
  info: collectionInfo('Plantilla — API completa'),
  variable: collectionVars,
  item: items,
};

function captureScript(varName) {
  return {
    listen: 'test',
    script: {
      type: 'text/javascript',
      exec: [
        'const json = pm.response.json();',
        'const data = json && json.data;',
        'const items = data && (data.items || data);',
        'if (Array.isArray(items) && items[0] && items[0].id) {',
        `  pm.environment.set('${varName}', items[0].id);`,
        '  pm.environment.set("id", items[0].id);',
        '}',
      ],
    },
  };
}

function setupGet(name, pathParts, varName, extraHeaders = true) {
  const item = makeRequest({
    name,
    method: 'GET',
    basePath: pathParts,
    route: '',
    permission: null,
    isPublic: false,
    skipEmpresa: !extraHeaders,
    hasBody: false,
    hasQuery: true,
  });
  item.event = [captureScript(varName)];
  return item;
}

const setupFolder = {
  name: '00 — Setup',
  description:
    'Ejecuta en orden. Captura IDs en el environment. Primero seed + register/login + POST /empresas.',
  item: [
    makeRequest({
      name: 'POST /seed/fundacion',
      method: 'POST',
      basePath: 'seed',
      route: 'fundacion',
      permission: null,
      isPublic: true,
      skipEmpresa: true,
      hasBody: true,
      hasQuery: false,
    }),
    makeRequest({
      name: 'POST /seed/platform-plans',
      method: 'POST',
      basePath: 'seed',
      route: 'platform-plans',
      permission: null,
      isPublic: true,
      skipEmpresa: true,
      hasBody: true,
      hasQuery: false,
    }),
    loginHelper('POST /auth/login', 'Guarda accessToken.'),
    (() => {
      const req = makeRequest({
        name: 'GET /empresas → empresaId',
        method: 'GET',
        basePath: 'empresas',
        route: '',
        permission: null,
        isPublic: false,
        skipEmpresa: true,
        hasBody: false,
        hasQuery: true,
      });
      req.event = [
        {
          listen: 'test',
          script: {
            type: 'text/javascript',
            exec: [
              'const json = pm.response.json();',
              'const data = json && json.data;',
              'const items = data && (data.items || data);',
              'if (Array.isArray(items) && items[0] && items[0].id) {',
              "  pm.environment.set('empresaId', items[0].id);",
              '}',
            ],
          },
        },
      ];
      return req;
    })(),
    setupGet('GET /sucursales → sucursalId', 'sucursales', 'sucursalId'),
    setupGet('GET /roles → rolId', 'roles', 'rolId'),
    setupGet('GET /usuarios → usuarioId', 'usuarios', 'usuarioId'),
    setupGet('GET /modulos → moduloId', 'modulos', 'moduloId'),
    setupGet('GET /planes → planId', 'planes', 'planId'),
  ],
};

const ready = {
  info: collectionInfo(
    'Plantilla — API Ready',
    'Incluye carpeta **00 — Setup** que captura IDs en el environment.',
  ),
  variable: collectionVars,
  item: [setupFolder, ...items],
};

const demoUsers = {
  info: {
    _postman_id: 'plantilla-auth-seed',
    name: 'Plantilla — Auth y seed',
    description: [
      '# Plantilla — Auth y seed',
      '',
      'Seed RBAC + planes, registro, verificación, login y onboarding de empresa.',
      '',
      'No hay seed de 10 usuarios ERP: esa capa la añade el producto derivado.',
      '',
      '## Arranque',
      '1. Importa `Plantilla-Demo.postman_environment.json`.',
      '2. `SEED_ENDPOINT_ENABLED=true`.',
      '3. Seed → fundación + platform-plans.',
      '4. Register → verify-email (OTP del correo) → login.',
      '5. `POST /empresas` y `GET /auth/me`.',
      '',
      'Guía: `docs/postman/README.md`',
    ].join('\n'),
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  variable: [
    { key: 'baseUrl', value: 'http://localhost:3000' },
    { key: 'demoEmail', value: 'propietario@plantilla.local' },
    { key: 'demoPassword', value: 'Demo1234!' },
  ],
  item: [
    {
      name: 'Seed',
      item: [
        makeRequest({
          name: 'POST Seed fundación',
          method: 'POST',
          basePath: 'seed',
          route: 'fundacion',
          permission: null,
          isPublic: true,
          skipEmpresa: true,
          hasBody: true,
          hasQuery: false,
        }),
        makeRequest({
          name: 'POST Seed platform-plans',
          method: 'POST',
          basePath: 'seed',
          route: 'platform-plans',
          permission: null,
          isPublic: true,
          skipEmpresa: true,
          hasBody: true,
          hasQuery: false,
        }),
      ],
    },
    {
      name: 'Registro y login',
      item: [
        registerHelper(),
        makeRequest({
          name: 'POST /auth/register/verify-email',
          method: 'POST',
          basePath: 'auth',
          route: 'register/verify-email',
          permission: null,
          isPublic: true,
          skipEmpresa: true,
          hasBody: true,
          hasQuery: false,
        }),
        loginHelper('POST /auth/login', 'Guarda accessToken.'),
        makeRequest({
          name: 'POST /auth/login/complete-2fa',
          method: 'POST',
          basePath: 'auth',
          route: 'login/complete-2fa',
          permission: null,
          isPublic: true,
          skipEmpresa: true,
          hasBody: true,
          hasQuery: false,
        }),
      ],
    },
    {
      name: 'Sesión y empresa',
      item: [
        makeRequest({
          name: 'GET /auth/me',
          method: 'GET',
          basePath: 'auth',
          route: 'me',
          permission: null,
          isPublic: false,
          skipEmpresa: true,
          hasBody: false,
          hasQuery: false,
        }),
        makeRequest({
          name: 'POST /empresas',
          method: 'POST',
          basePath: 'empresas',
          route: '',
          permission: null,
          isPublic: false,
          skipEmpresa: true,
          hasBody: true,
          hasQuery: false,
        }),
        makeRequest({
          name: 'GET /auth/me (con empresa)',
          method: 'GET',
          basePath: 'auth',
          route: 'me',
          permission: null,
          isPublic: false,
          skipEmpresa: false,
          hasBody: false,
          hasQuery: false,
        }),
      ],
    },
  ],
};

fs.writeFileSync(OUT_COMPLETE, JSON.stringify(complete, null, 2), 'utf8');
fs.writeFileSync(OUT_READY, JSON.stringify(ready, null, 2), 'utf8');
fs.writeFileSync(OUT_USERS, JSON.stringify(demoUsers, null, 2), 'utf8');

console.log(`Wrote ${OUT_COMPLETE}`);
console.log(`Wrote ${OUT_READY}`);
console.log(`Wrote ${OUT_USERS}`);
console.log(
  `Modules: ${sortedModules.length}, requests: ${total}, controllers: ${files.length}`,
);
