# CONTEXTO.md — Hack4Seniors UDD 2026

Documento de contexto del proyecto **Cerca**: problema, solución, decisiones técnicas, modelo de acceso y prioridades. Reúne la base del equipo (`contexto.md`), el diseño inicial de datos (`BDD.md`) y lo ya construido en el frontend. El detalle de base de datos, login y APIs está en [docs/PLAN_BACKEND.md](docs/PLAN_BACKEND.md).

## 1. Contexto

**Evento:** Hack4Seniors UDD, jueves 1 de octubre de 2026. Jornada de un día sobre calidad de vida de personas mayores. Equipo de 4 personas (3 informáticos y 1 ingeniero industrial).

**Restricción principal:** el tiempo. Todo debe servir a una demo en vivo de 3 a 4 minutos.

**Reglas que afectan al código:**
- El historial de commits puede ser revisado: commits pequeños y frecuentes, con mensajes claros.
- Prohibido usar datos reales de salud, ubicación o identificación. Solo datos simulados (seed).
- Se permiten librerías, frameworks y servicios de terceros públicos.
- Debemos poder explicar quién accede a los datos sensibles y bajo qué resguardo.

**Criterios del jurado:** solución tecnológica 35 %, presentación y demo 25 %, impacto y escalabilidad 20 %, innovación 15 %, comprensión del problema 5 %.

## 2. Problema

Las personas mayores enfrentan dificultades para mantener su independencia, especialmente en el manejo de su salud, sus rutinas y sus tratamientos:

- **Gestión de tratamientos:** recordar horarios y dosis es complejo. El 83 % de las personas mayores en Chile consume al menos un medicamento de forma regular y más del 30 % presenta polifarmacia.
- **Carga en el entorno de cuidados:** cerca de 63.832 mujeres en Chile han dejado su empleo para cuidar a personas mayores. El apoyo familiar organizado es indispensable.
- **Información repartida:** qué toma, cuánto le queda y quién debe comprarlo está repartido entre la persona, su familia y, si vive en un ELEAM (Establecimiento de Larga Estadía para Adultos Mayores), el personal que la cuida. Los medicamentos se acaban sin aviso y la coordinación se hace por teléfono, cuadernos, Excel y grupos de WhatsApp.
- **Herramientas invasivas:** las existentes vigilan a la persona como a un paciente y le quitan autonomía.

**Desafío:** una sola fuente de información sobre la salud y la rutina de la persona mayor, que ahorre tiempo de coordinación a su red de apoyo sin quitarle el control.

## 3. Solución: Cerca

Servicio no invasivo centrado en la **autonomía guiada**: acompañar sin restar independencia. La persona mayor y su red de apoyo gestionan juntas su calendario, sus remedios y sus alarmas.

**Público objetivo:**
- **Personas mayores (protagonistas activas):** gestionan su día, sus remedios y sus recordatorios.
- **Familiares y tutores:** agendan, editan y reciben alertas compartidas.
- **ELEAM:** supervisión centralizada del stock y del historial de muchos residentes.

**Funcionalidades:**
1. **Calendario y actividades:** la persona y su familia agendan actividades y consultas. Incluye actividades cercanas de la municipalidad ("Cerca de mí").
2. **Remedios y alarmas:** horarios, confirmación de cada toma ("Ya lo tomé") y avisos escalonados a la familia si no se confirma.
3. **Centralización:** medicamentos, dosis, stock restante y responsable de la compra en un solo lugar.
4. **Coordinación familiar e institucional:** permisos por miembro del núcleo y, en una fase posterior, vista ELEAM.

**Mecanismos centrales:**
- **Consumo automático de stock:** cada toma confirmada descuenta unidades.
- **Predicción de quiebre:** días restantes y semáforo (rojo ≤ 3 días, amarillo ≤ 7, verde en el resto).
- **Avisos:** a la persona mayor a la hora de cada remedio y 15 min después; a la familia si no confirma en 30 min, cuando el stock baja de 7 días y al cierre del día.
- **Ronda ELEAM con excepciones (fase D):** "marcar todas como dadas" y registrar solo lo que falló.

**Principios de diseño (obligatorios):**
1. **Autonomía primero.** La persona mayor confirma sus tomas; los demás intervienen solo si ella no puede o no responde.
2. **Minimización de datos.** Sin fotos, geolocalización ni diagnósticos. Sin campos "por si acaso".
3. **La persona decide qué comparte** con su familia.
4. **Accesible.** Letra grande, alto contraste, botones grandes, una acción principal por pantalla, español de Chile.
5. **WhatsApp antes que app** (fase D).

## 4. Modelo de acceso

Reemplaza el modelo de tenants ELEAM/FAMILIA de versiones anteriores. El frontend mostró que una misma familiar (Camila) acompaña a una persona en casa (Rosa) y a otra en un ELEAM (Héctor) con una sola cuenta, así que el tenant no puede ser el ELEAM.

**Regla: la unidad de datos es el grupo familiar (núcleo).** Todo lo de un grupo (personas mayores, miembros, remedios, eventos, tomas) vive en la misma partición de DynamoDB.

- Un **miembro** del núcleo tiene un permiso: `admin` (gestiona personas e invitaciones), `edita` (remedios y agenda) o `ve` (solo lectura).
- Una **persona mayor** con cuenta ve y gestiona lo suyo.
- El **grupo se toma siempre del token de sesión**, nunca de lo que envía el cliente. Nadie puede leer otro grupo.
- El **ELEAM** es un atributo de la persona (`establecimientoId`). En la fase D, un índice secundario permitirá al personal del ELEAM ver a todos sus residentes, sin importar a qué grupo pertenecen.

**Limitación conocida:** cada persona y cada miembro pertenecen a un solo grupo. La evolución natural es un usuario con membresías en varios grupos. Va en la lámina de próximos pasos.

## 5. Estado actual del repositorio

- **Frontend** (`frontend/`): prototipo completo de Cerca en React + Vite + React Router (JS). Implementa los flujos de adulto mayor (inicio, remedios, mi día, consultas, próximos días, cerca de mí, avisos) y familiar (elegir persona, resumen, agenda, remedios, personas, formularios, avisos).
  - Todo el estado vive en `localStorage`, con datos de `src/data/seed.js`.
  - Las reglas (estado de cada toma, avisos) se calculan en el cliente: `src/lib/selectors.js` y `src/lib/notifications.js`.
  - Reloj de demo: `?hora=13:02` en la URL; `?hora=real` vuelve a la hora real.
  - Cuentas de prueba: `rosa@cerca.cl`, `hector@cerca.cl`, `camila@cerca.cl` (contraseña `1234`).
  - Única llamada al backend: `POST /users` al añadir un adulto mayor (si falla, guarda local).
- **Backend** (`backend/`): una Lambda (`nodejs22.x`) con Express y la tabla `Cerca-dev`. Fase A desplegada: login, `GET /estado` y reset de la demo. Detalle y estado en [docs/PLAN_BACKEND.md](docs/PLAN_BACKEND.md).
- **Documentos:** `contexto.md` (base del equipo), `BDD.md` (diseño inicial de datos), este archivo y el plan del backend.

**Desajustes conocidos:**
- El stock del front es un número fijo de días (`stockDias`); el backend lo pasa a unidades con consumo real.
- `CONTEXTO.md` y `contexto.md` chocan en sistemas de archivos que no distinguen mayúsculas (Windows, macOS). Hay que fusionarlos o renombrar uno.
- Aún no existen la vista ELEAM, el "ya compré" ni la configuración de privacidad.

## 6. Decisiones tecnológicas

| Tema | Decisión |
|---|---|
| Lenguaje | JavaScript en front y back |
| Frontend | React + Vite + React Router |
| Backend | Una sola AWS Lambda (`nodejs22.x`) con Express + `serverless-http`, desplegada con Serverless Framework v3 |
| Base de datos | DynamoDB en AWS desde el inicio: tabla única `Cerca-${stage}` con `PK`/`SK` |
| Login | Simple: cuentas del seed, contraseña con `scrypt` y token JWT con `{ sub, rol, grupoId }`. Cognito queda para después |
| Avisos | Hoy se calculan en el cliente. En el servidor (fase D): interfaz `Notifier` con `MockNotifier` (respaldo de la demo) y Twilio WhatsApp |
| Credenciales | Perfil local de AWS `hackaton`. Nada de credenciales en el repo; `.env` local y `.env.example` versionado |

**Cuenta de AWS:** `666607745921`, región `us-east-1`. Es compartida con otros proyectos (`LivinDex`, `PokeGO`), así que todos los recursos de este proyecto llevan el prefijo del servicio (`hackathonUDD-*`) o `Cerca-*`, y no se tocan los demás.

### Definiciones base

- **DynamoDB:** base de datos NoSQL administrada por AWS, sin servidores que mantener y con cobro por uso. Se accede por clave (partición + orden), así que los patrones de acceso se diseñan de antemano.
- **Tabla única:** todas las entidades viven en una tabla, distinguidas por el prefijo de sus claves (`GRUPO#`, `MED#`, `TOMA#`). Un solo `Query` trae todo lo de un grupo.
- **Lambda / serverless:** el código corre como una función que AWS levanta bajo demanda, con bajo costo si hay poco uso.
- **API Gateway (HTTP API):** puerta de entrada HTTP que enruta las peticiones a la Lambda.
- **JWT:** token firmado que el cliente envía en cada petición y que dice quién es, su rol y su grupo.
- **Seed:** datos ficticios iniciales. `POST /demo/reset` los restaura.

## 7. Priorización

Detalle en [docs/PLAN_BACKEND.md](docs/PLAN_BACKEND.md), sección 5.

- **Fase A — base:** esqueleto, tabla, seed, login y `GET /estado`. Con esto el front se conecta al backend.
- **Fase B — adulto mayor:** tomas con descuento de stock, asistencias, actividades cercanas, avisos vistos.
- **Fase C — familiar:** remedios, eventos, personas, invitaciones.
- **Fase D — producto completo:** "ya compré", alerta de umbral en el servidor, vista ELEAM, privacidad editable, WhatsApp con Twilio.

**Fuera de alcance hoy:** onboarding real, Cognito, recuperación de contraseña, pagos, integraciones con farmacias.

**Riesgo principal:** la fase D contiene la ronda ELEAM y el WhatsApp, que eran parte del guion de demo original. Si no llegan, la demo se apoya en el flujo de adulto mayor y familiar que ya existe.

## 8. Seguridad y datos sensibles (para la pregunta del jurado)

- Todos los datos de la demo son ficticios.
- **No guardamos RUT:** no lo usa ninguna funcionalidad y es un identificador nacional que, junto a nombre y medicamentos, permite identificar a la persona. Se eliminó del front, del seed y de la API.
- Sin geolocalización: la distancia de las actividades cercanas es un dato fijo del catálogo.
- Cada petición se limita al grupo del token; los permisos (`admin`, `edita`, `ve`, `adulto`) se validan en el servidor.
- Hoy: login simple con contraseñas de demo.
- En producción: Cognito, CORS restringido, cifrado en tránsito y en reposo (DynamoDB lo trae por defecto) y registro de accesos.

## 9. Pendientes por decidir

- Fusionar `contexto.md` en este archivo y eliminar el duplicado.
- Coordinar con el front el cambio de `AppContext` a la API.
- Tamaño de la "caja estándar" para "ya compré" (propuesta: 30 unidades, editable).
