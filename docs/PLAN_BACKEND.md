# Plan del backend — Cerca

Plan de base de datos, login y APIs para que el frontend (`frontend/`) deje de depender de `localStorage` y funcione contra AWS. Contexto general en [CONTEXTO.md](../CONTEXTO.md).

**Decisiones tomadas (1 de octubre de 2026):**

- Backend en **JavaScript** (igual que el frontend).
- **Login simple** con las cuentas del seed y un token JWT. Cognito queda para después.
- **DynamoDB en AWS desde el inicio** (stage `dev`), sin DynamoDB Local.
- Este plan **reemplaza** la tabla `Usuarios` y el `usersHandler` actuales.

## 1. Reconciliación de las fuentes

Fuentes: `contexto.md` (base del equipo), `BDD.md` (diseño inicial de Lucas), `CONTEXTO.md` y el código del frontend (`frontend/src/data/seed.js`, `context/AppContext.jsx`, `lib/selectors.js`, `lib/notifications.js`).

| Tema | Qué decía cada fuente | Decisión |
|---|---|---|
| Unidad de datos | `BDD.md`: `GrupoFamiliar`. `CONTEXTO.md`: tenant ELEAM/FAMILIA. Front: un núcleo con miembros y adultos mayores | **El grupo familiar es la partición.** El ELEAM es un atributo de la persona (`establecimientoId`), indexado en la fase D |
| Personas | `BDD.md`: un solo `Usuario` para todos | Se separa en **Persona** (adulto mayor), **Miembro** (familiar) y **Cuenta** (login), como en el front |
| Receta | `BDD.md`: JSON anidado en `Usuario` | **Un registro por medicamento**, para descontar stock de forma atómica |
| Visitas médicas | `BDD.md`: JSON anidado | **Evento de tipo `consulta`**, como en el front |
| Toma | `BDD.md`: `idToma`, `idUsuario`, `medicamento`, `horaFecha` | Se mantiene, con la fecha en la clave para consultar por día |
| Autenticación | `contexto.md`: Cognito | **Login simple.** El token lleva los mismos datos que daría Cognito |
| Framework de front | `contexto.md`: Next.js | **Vite + React Router**, que es lo construido |
| Stock | Front: `stockDias` fijo. `CONTEXTO.md`: unidades que se descuentan | **Se guardan unidades; la API devuelve `stockDias` calculado** |
| RUT | Front, `usersHandler` y `BDD.md`: obligatorio | **No se guarda** (ver sección 8). Eliminado del front, del seed y de la API |
| Fechas | Front: `fecha: 'YYYY-MM-DD'`, `hora: 'HH:mm'` locales | Se mantiene. **El servidor no calcula "hoy" con su reloj** (Lambda corre en UTC): usa la fecha que manda el cliente o `America/Santiago` |

## 2. Base de datos

### Tabla

- Nombre: `Cerca-${stage}` (en desarrollo, `Cerca-dev`).
- Claves: `PK` (texto, partición) y `SK` (texto, orden).
- Cobro: `PAY_PER_REQUEST`.
- Región: `us-east-1`.

### Registros

| Entidad | PK | SK | Atributos |
|---|---|---|---|
| Grupo | `GRUPO#<g>` | `META` | `nombre` |
| Persona (adulto mayor) | `GRUPO#<g>` | `PERSONA#<id>` | `nombre`, `apellido`, `fechaNacimiento`, `residencia`, `establecimientoId?`, `telefono`, `color` |
| Miembro | `GRUPO#<g>` | `MIEMBRO#<id>` | `nombre`, `apellido`, `email`, `permiso` (`admin` / `edita` / `ve`), `estado` (`activo` / `invitado`) |
| Medicamento | `GRUPO#<g>` | `MED#<id>` | `personaId`, `nombre`, `dosis`, `cantidad`, `indicacion`, `horarios[]`, `unidadesPorToma` (1), `stockUnidades`, `umbralDias` (7), `responsableId`, `activo` |
| Evento | `GRUPO#<g>` | `EVENTO#<id>` | `tipo` (`actividad` / `consulta`), `icono`, `titulo`, `fecha`, `hora`, `lugar`, `con`, `personaIds[]`, `creadoPor`, `createdAt`, `origenCerca?` |
| Toma | `GRUPO#<g>` | `TOMA#<fecha>#<hora>#<medId>` | `medId`, `personaId`, `at`, `registradaPor` |
| Asistencia | `GRUPO#<g>` | `ASIST#<eventoId>#<personaId>` | `value` (`asistio` / `no`), `at` |
| Aviso visto | `GRUPO#<g>` | `VISTO#<viewerId>#<avisoId>` | — |
| Movimiento de stock | `GRUPO#<g>` | `MOV#<timestamp>#<id>` | `medId`, `tipo` (`CONSUMO` / `COMPRA` / `AJUSTE`), `unidades`, `registradoPor` |
| Cuenta | `CUENTA#<email>` | `CUENTA` | `passwordHash`, `rol` (`adulto` / `familiar`), `personaId`, `grupoId` |
| Actividad cercana | `CERCA` | `EVT#<fecha>#<id>` | `titulo`, `fecha`, `hora`, `lugar`, `organizador`, `minutosCaminando`, `distanciaKm`, `publishedAt` |

Los ids del seed se mantienen legibles e iguales a los del front (`e-rosa`, `m-losartan`, `u-camila`). Los registros nuevos usan `crypto.randomUUID()`.

### Patrones de acceso

| Necesidad | Operación |
|---|---|
| Login por correo | `GetItem` sobre `PK = CUENTA#<email>`, `SK = CUENTA` |
| Estado completo de un grupo | Un `Query` sobre `PK = GRUPO#<g>` |
| Tomas de un rango de días | `Query` con `SK BETWEEN 'TOMA#<desde>' AND 'TOMA#<hasta>~'` |
| Catálogo "cerca de mí" | `Query` sobre `PK = CERCA` |
| Marcar toma | `TransactWrite`: `Put` de la toma con `attribute_not_exists(PK)` + `Update` del medicamento `stockUnidades = stockUnidades - unidadesPorToma` + `Put` del movimiento `CONSUMO` |
| Deshacer toma | `TransactWrite`: `Delete` de la toma con `attribute_exists(PK)` + `Update` que devuelve las unidades + movimiento `AJUSTE` |
| Registrar compra (fase D) | `Update` que suma unidades + movimiento `COMPRA` |
| ELEAM (fase D) | `GSI1` con `GSI1PK = ESTAB#<id>` en personas y medicamentos, para ver a todos los residentes sin importar su grupo |

Marcar una toma dos veces no descuenta dos veces: la condición hace fallar la transacción y la API responde que ya estaba registrada.

### Stock

```
consumoDiario = unidadesPorToma × horarios.length
stockDias     = floor(stockUnidades / consumoDiario)
semaforo      = stockDias <= 3 ? 'rojo' : stockDias <= umbralDias ? 'amarillo' : 'verde'
```

El formulario del front envía `stockDias`; al crear o editar, el backend guarda `stockUnidades = stockDias × consumoDiario`. La API siempre devuelve `stockDias` y `semaforo` calculados.

### Limitaciones conocidas

- Cada persona y cada miembro pertenecen a un solo grupo (igual que el front). Cuentas en varios grupos: producción.
- `GET /estado` lee el grupo completo en un `Query`. Basta para la demo; con mucho historial habrá que limitar las tomas por rango de fechas.

## 3. Login

- `POST /auth/login` con `{ email, password }`.
- Busca la cuenta y compara la contraseña con un hash `scrypt` (módulo `crypto` de Node).
- Responde `{ token, sesion: { rol, personId, selectedElderId } }`, la misma forma que guarda hoy el front.
- Token JWT firmado con `JWT_SECRET` (en `.env`), válido 12 horas, con `{ sub: personaId, rol, grupoId, permiso }`. El permiso se lee del registro del miembro al iniciar sesión; si cambia, aplica en el siguiente login.
- Middleware: toda ruta salvo `/auth/login`, `/health` y `/demo/reset` exige `Authorization: Bearer <token>`.
- **El `grupoId` se lee siempre del token**, nunca del body ni de la URL. Así nadie puede leer otro grupo.

### Permisos (validados en el servidor)

| Quién | Puede |
|---|---|
| Miembro `ve` | Leer |
| Miembro `edita` | Leer, más medicamentos y eventos |
| Miembro `admin` | Todo lo anterior, más personas e invitaciones |
| `adulto` | Leer lo suyo; registrar sus tomas y asistencias; sumar actividades cercanas a su agenda; marcar avisos vistos. Siempre solo sobre su propia persona |

Cuentas del seed (contraseña `1234`): `rosa@cerca.cl`, `hector@cerca.cl` (adulto mayor) y `camila@cerca.cl` (familiar, `admin`). Un miembro invitado no tiene cuenta todavía.

## 4. Estructura

- **Una sola Lambda `api`** con Express + `serverless-http`, expuesta con una ruta comodín de HTTP API. En local corre con `serverless-offline` contra la tabla de AWS.
- **Runtime `nodejs22.x`.** AWS ya no permite crear funciones con Node 18.
- **Dependencias:** `express`, `serverless-http`, `@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`, `jsonwebtoken`. Tests con `node:test`, sin dependencias.
- **IAM de la Lambda:** `GetItem`, `PutItem`, `UpdateItem`, `DeleteItem`, `Query`, `BatchWriteItem`, `TransactWriteItems` sobre la tabla y sus índices. Sin `Scan`.
- **Credenciales AWS:** perfil local `hackaton`, declarado en `serverless.yml` (`provider.profile: hackaton`) para que lo usen el deploy y `serverless-offline` en cualquier sistema operativo. Las claves nunca van en el repo.
- Se eliminan `src/handlers/users/usersHandler.js` y la tabla `Usuarios-${stage}`.

```
backend/src/
  handler.js     # serverless-http
  app.js         # Express: middlewares y rutas
  auth/          # login, JWT, middleware y permisos
  db/            # cliente DynamoDB, constructores de claves, repositorios
  domain/        # stock y formato de respuesta (sin DynamoDB, con tests)
  routes/        # un archivo por recurso
  seed/          # seed portado desde frontend/src/data/seed.js
```

El seed reutiliza el `createSeed` del front: se convierte a registros, `stockDias` pasa a unidades y se agregan las cuentas con su hash.

## 5. APIs

Todas devuelven JSON. Errores: `{ message, errors? }` con 400, 401, 403, 404 o 409.

### Fase A — login y lectura (el front ya puede conectarse)

| # | Método y ruta | Descripción |
|---|---|---|
| 1 | `GET /health` | Prueba de vida |
| 2 | `POST /auth/login` | Login |
| 3 | `GET /estado` | Estado completo con la forma de `seed.js`: `elders`, `members`, `medications` (con `stockDias`), `activities`, `nearby`, `intakes`, `attendance`, `seen`. Los mapas usan las mismas claves que el front (`medId\|fecha\|hora`, `eventoId\|personaId`, `viewerId\|avisoId`). Un adulto mayor recibe solo lo suyo y los nombres de su núcleo |
| 4 | `POST /demo/reset` | Borra y recarga el seed. Recibe `{ now }` del cliente para que las fechas relativas coincidan con `?hora=` |

### Fase B — adulto mayor (paso 5 del guion de demo)

| # | Método y ruta | Body |
|---|---|---|
| 5 | `PUT /tomas` | `{ medId, fecha, hora, at }` |
| 6 | `DELETE /tomas` | `{ medId, fecha, hora }` |
| 7 | `PUT /asistencias` | `{ eventoId, personaId, value, at }` |
| 8 | `POST /cerca/:id/sumar` | `{ personaId }` |
| 9 | `POST /vistos` | `{ ids: [] }` |

### Fase C — familiar

| # | Método y ruta | Permiso |
|---|---|---|
| 10 | `POST /medicamentos`, `PUT /medicamentos/:id`, `DELETE /medicamentos/:id` | `edita` |
| 11 | `POST /eventos`, `DELETE /eventos/:id` | `edita` |
| 12 | `POST /personas`, `PUT /personas/:id` | `admin` |
| 13 | `POST /miembros` (invitar) | `admin` |

### Fase D — lo que falta del producto

| # | Qué |
|---|---|
| 14 | `POST /medicamentos/:id/compras` (`{ unidades }`): "ya compré" |
| 15 | Alerta de umbral en el servidor al consumir, con `MockNotifier` |
| 16 | Vista ELEAM: `GSI1`, rol `eleam`, `GET /eleam/ronda`, `POST /eleam/ronda/marcar` |
| 17 | WhatsApp con Twilio |

### Integración con el front

Todo el estado del front pasa por `frontend/src/context/AppContext.jsx`: las pantallas leen `state` y llaman acciones. `GET /estado` devuelve esa misma forma, así que la conexión se concentra en ese archivo.

**Decisiones:**

1. **Actualización optimista.** Cada acción cambia `state` al instante (como hoy) y en paralelo llama a la API. Al terminar se vuelve a pedir `/estado`. Si falla, se vuelve al estado del servidor y se muestra un aviso. Las pantallas no cambian ni se ponen lentas.
2. **El cliente genera los ids** de lo que crea (persona, remedio, actividad, miembro). El backend los valida y los rechaza con 409 si ya existen. Así `addElder` y `addActivity` siguen siendo síncronas.
3. **Reloj de demo compartido.** `POST /demo/reset { now }` guarda en el grupo el desfase entre la hora simulada y la real; `GET /estado` lo devuelve como `reloj: { offsetMs, desde }`. Cada dispositivo lo adopta cuando cambia (después de cada reset), salvo que la URL traiga `?hora=`. Así dos teléfonos ven la misma hora.
4. **Sincronización.** El front vuelve a pedir `/estado` cada 15 s y al volver a la app. No aplica la respuesta mientras haya una acción en curso, para evitar parpadeos.
5. **Modo local de respaldo.** Si `VITE_API_URL` está vacío (`npm run dev:offline`, `npm run build:offline`), la app funciona como antes, solo con `localStorage`. Es el plan B si falla la red en la presentación.
6. **Sesión.** El token se guarda con la sesión. Un 401 cierra la sesión y vuelve al login.
7. **Hora de cada registro.** Tomas, asistencias y actividades cercanas aceptan el `at` del cliente, para respetar la hora simulada.

**Acciones del front y su endpoint:**

| Acción | Endpoint | Quién puede |
|---|---|---|
| `login` | `POST /auth/login` | Cualquiera |
| `resetDemo(hhmm?)` | `POST /demo/reset { now }` | Cualquiera |
| `takeDose` / `undoDose` | `PUT` / `DELETE /tomas` | La persona misma, o un familiar `edita` o más |
| `setAttendance` | `PUT /asistencias` | La persona misma, o un familiar `edita` o más |
| `addNearbyToAgenda` | `POST /cerca/:id/sumar` (idempotente) | La persona misma, o un familiar `edita` o más |
| `markSeen` | `POST /vistos { ids }` | Cada quien, sobre sus propios avisos |
| `addActivity` / `removeActivity` | `POST /eventos`, `DELETE /eventos/:id` | Familiar `edita` |
| `saveMedication` / `removeMedication` | `POST /medicamentos`, `PUT` / `DELETE /medicamentos/:id` | Familiar `edita` |
| `addElder` / `updateElder` | `POST /personas`, `PUT /personas/:id` | Familiar `admin` |
| `inviteMember` | `POST /miembros` | Familiar `admin` |
| `selectElder`, `logout` | (solo en el dispositivo) | — |

**Reglas del backend:**

- `PUT /tomas` descuenta `unidadesPorToma` en una transacción con la toma y un movimiento `CONSUMO`. Repetirla no descuenta dos veces. Si no queda stock, registra la toma sin descontar. `DELETE /tomas` devuelve las unidades que esa toma descontó.
- `PUT /medicamentos/:id` recalcula las unidades solo si cambió `stockDias`; si no, conserva las unidades (editar el nombre no borra el resto que no alcanza para un día).
- `DELETE /medicamentos/:id` marca el remedio como inactivo para no perder su historial.
- Toda escritura verifica que la persona, el remedio o el evento pertenezca al grupo del token.

**Cambios en el front:** `src/api/client.js` (nuevo: `fetch` con URL base, token, errores y tiempo límite), `src/context/AppContext.jsx` (modo API o local, carga inicial, sincronización, acciones optimistas, reloj compartido, 401) y `src/pages/Login.jsx` (`await login`). `VITE_API_URL` se define en `frontend/.env.development` y `frontend/.env.production`, y queda fija dentro del APK al compilarlo.

**Orden:** (1) endpoints con permisos, tests y deploy; (2) front; (3) prueba de punta a punta con dos ventanas (Rosa marca una toma, Camila la ve y el stock baja; permisos; reset); (4) regenerar el APK.

## 6. Estado

**Fases A, B y C desplegadas en `dev` y conectadas al front (1 de octubre de 2026).** Todas las acciones del front tienen su endpoint (ver "Integración con el front"). Quedan las de la fase D.

**Verificado:**

- `npm test`: 25 tests (stock, fechas, contraseñas, permisos, validación, `/estado`).
- 45 casos contra la API desplegada: tomas con descuento y devolución de stock, idempotencia, permisos por rol (`adulto`, `ve`, `edita`, `admin`), validaciones, agenda, remedios, personas, invitaciones, avisos vistos y reloj compartido.
- La app en un navegador con dos sesiones a la vez: Rosa toca "Ya lo tomé", el stock baja de 22 a 21 días y Camila lo ve; Camila crea una actividad y a Rosa le aparece en "Mi día" con su aviso; ambas adoptan la hora de demo del reset; un token inválido vuelve al login con aviso.

- URL: `https://a43vrc3yi3.execute-api.us-east-1.amazonaws.com`
- Stack: `hackathonUDD-dev`. Tabla: `Cerca-dev`. Función: `hackathonUDD-dev-api`.
- Tests: `npm test` (stock, fechas en hora de Chile, contraseñas, armado de `/estado` y filtro de privacidad).

**Cómo correrlo:**

```bash
cd backend
cp .env.example .env   # pedir el JWT_SECRET compartido al equipo
npm install
npm test
npm run dev            # local en http://localhost:3000, contra la tabla de AWS
npm run deploy         # despliega a dev
```

**Notas:**

- Serverless v3 muestra una advertencia porque no conoce `nodejs22.x`. AWS sí lo acepta; se puede ignorar.
- `npm run dev` necesita `AWS_PROFILE=hackaton` en el `.env`. Sin eso, el modo local usa el perfil `default` del computador, que puede ser de otra cuenta.
- `POST /demo/reset` no exige sesión (el front lo ofrece en el login). Borra y recarga el grupo de demo, el catálogo "cerca de mí" y las cuentas del seed.
- El seed agrega cuentas para Jorge (`edita`) y Marta (`ve`), con contraseña `1234`, para probar permisos.
- **Front:** `npm run dev` y `npm run build` usan la API (`frontend/.env.development` y `.env.production`). `npm run dev:offline` y `npm run build:offline` usan solo `localStorage`, como respaldo sin internet.
- **APK:** hay que regenerarlo (`npm run android:apk`) para que incluya la conexión; la URL de la API queda fija dentro.
- **Hora de demo:** "Aplicar y reiniciar" en el login fija la hora para todos los dispositivos (se adopta en la siguiente sincronización, hasta 15 s). "Usar hora real" la quita solo en ese dispositivo, hasta el próximo reset.

## 7. Orden de trabajo

1. Esqueleto: `serverless.yml` (Lambda única, tabla `Cerca-${stage}`, IAM, `nodejs22.x`), dependencias, `GET /health`. Primer deploy a `dev` para validar credenciales.
2. Capa `db` (claves y repositorios) y `domain/stock` con tests.
3. Seed portado y `POST /demo/reset`.
4. Login y middleware de autorización.
5. `GET /estado`. Fase A cerrada: el front puede conectarse.
6. Fase B (tomas primero), luego C y D.

## 8. Por qué no guardamos el RUT

**Decisión (1 de octubre de 2026): no se guarda.** Se quitó del formulario y del seed del front, del seed del backend y de la respuesta de la API.

- **No lo usa ninguna funcionalidad.** Ninguna pantalla, cálculo, aviso ni búsqueda lo necesitaba; solo se pedía en el formulario.
- **Es un identificador nacional único.** Si la base se filtra, un RUT junto a nombre, fecha de nacimiento y medicamentos permite identificar a la persona y vincularla con su información de salud.
- **Choca con los principios del proyecto** (minimización de datos) y con la regla de la hackatón de no usar datos reales de identificación.
- **Es un buen argumento ante el jurado:** "no guardamos lo que no necesitamos" responde directamente la pregunta sobre datos sensibles.

## 9. Pendientes

- Resolver la colisión de `CONTEXTO.md` y `contexto.md` (chocan en Windows y macOS).
