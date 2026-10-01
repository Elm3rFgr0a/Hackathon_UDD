# CONTEXTO.md — Hack4Seniors UDD 2026

Documento de contexto del proyecto: problema, solución, decisiones técnicas, modelo de tenants y orden de prioridades. Complementa al `CLAUDE.md` (modelo de datos detallado, API y guion de demo).

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

Una persona mayor que toma varios medicamentos de forma permanente depende de información repartida entre ella, su familia y, si vive en un ELEAM (Establecimiento de Larga Estadía para Adultos Mayores), el personal que la cuida. Nadie tiene la visión completa. Como consecuencia:

- Los medicamentos se acaban sin aviso.
- Las dosis se pierden en los cambios de turno.
- Los cuidadores pierden tiempo coordinando por teléfono, cuadernos, Excel y grupos de WhatsApp.

Las herramientas existentes vigilan a la persona como a un paciente y le quitan autonomía sobre su tratamiento.

**Desafío:** una sola fuente de información sobre los medicamentos que ahorre tiempo de coordinación a la familia y al ELEAM, sin quitarle a la persona mayor el control de su tratamiento.

**Usuario principal:** la persona cuidadora (familiar o personal del ELEAM). **Usuario participante:** la persona mayor.

## 3. Solución propuesta

Un sistema multi-tenant con dos tipos de tenant (`ELEAM` y `FAMILIA`) y tres vistas:

| Vista | Rol | Qué hace |
|---|---|---|
| Persona mayor | `ADULTO_MAYOR` | Ve sus tomas del día, marca "Ya me la tomé", ve cuántos días le quedan y decide qué comparte. |
| Grupo familiar | `FAMILIAR` | Ve stock y días restantes, registra "ya compré", recibe alertas por WhatsApp. Sirve tanto para familias en casa como para apoderados de un residente de ELEAM. |
| ELEAM | `CUIDADOR_ELEAM` / `ADMIN_ELEAM` | Ronda por horario, registro de excepciones, semáforo de stock de todos los residentes. |

**Mecanismos centrales:**

1. **Ronda con excepciones.** "Marcar todas como dadas" y se registra solo lo que falló (`OMITIDA`, `RECHAZADA`, `SIN_STOCK`).
2. **Consumo automático de stock.** Cada dosis dada o tomada descuenta unidades.
3. **Predicción de quiebre.** `diasRestantes = floor(stockActual / (dosisPorToma × horarios.length))`. Semáforo: rojo ≤ 3 días, amarillo ≤ `umbralDiasAlerta` (7 por defecto), verde en el resto.
4. **Alerta por WhatsApp** al responsable de compra cuando se cruza el umbral (máximo una cada 24 h por tratamiento), con respuesta "COMPRADO" que actualiza el stock.

**Principios de diseño (obligatorios):**

1. **Autonomía primero.** La persona mayor marca sus tomas; los demás intervienen solo si ella no puede o no responde.
2. **Minimización de datos.** Sin fotos de la persona, geolocalización ni diagnósticos. Sin campos "por si acaso".
3. **La persona decide qué comparte** con su familia.
4. **Accesible.** Letra grande, alto contraste, botones grandes, pocas acciones por pantalla, español de Chile.
5. **WhatsApp antes que app.**

## 4. Modelo de tenants y acceso

Una duda clave es cómo se relaciona una persona que vive en un ELEAM con su familia, que vive en otra parte.

**Regla: el tenant es quien custodia y opera los datos.** Un residente pertenece al tenant del ELEAM y no existe un tenant `FAMILIA` para él. Su familiar es un `Usuario` con rol `FAMILIAR` dentro del tenant del ELEAM, ligado al residente por un `VinculoFamiliar`.

Una persona mayor es visible para:

- el personal de su tenant,
- ella misma, si usa la app,
- los familiares vinculados, filtrados por sus preferencias de privacidad.

Así se mantiene la regla "toda consulta filtra por `tenantId`" y no hay consultas entre tenants.

**Reglas derivadas:**

1. **Quién crea el vínculo:** lo crea el `ADMIN_ELEAM`, no la familiar. El ELEAM controla quién ve a un residente.
2. **Quién decide la privacidad:** la persona mayor, si es `AUTOVALENTE` o `PARCIAL`. Si es `DEPENDIENTE`, decide el ELEAM junto con su apoderado.
3. **Qué ve un familiar por defecto:** stock y días restantes sí; historial de tomas no, salvo que se habilite.
4. **Webhook de WhatsApp:** es la única consulta que no parte de un tenant conocido. Resuelve teléfono → usuario → vínculo → tratamiento, así que necesita un índice por teléfono.

**Limitación conocida:** una persona con familiares en dos lugares (una madre en un ELEAM y un padre en casa) necesitaría dos usuarios. En producción, la evolución natural es un usuario con **membresías en varios tenants**. Va en la lámina de próximos pasos.

## 5. Estado actual del repositorio

El repo es un starter genérico, sin lógica de dominio:

- **Backend:** Serverless Framework v3, Node 18, dos handlers Lambda (`/hello`, `/users`) con `serverless-offline`. JS plano; datos en un arreglo en memoria.
- **Frontend:** React 18 + Vite + Axios, una pantalla de usuarios. Las URLs a `localhost:3000` están hardcodeadas y el proxy `/api` de Vite no se usa.
- **Infra:** `docker-compose.yml` y Dockerfiles por servicio.
- **Falta todo el dominio:** modelo, seed, lógica de stock, tres vistas, notificaciones, tests, TypeScript y persistencia real.

**Problemas conocidos del starter:** sin validación en `POST /users`, ids con `users.length + 1`, dependencia `aws-lambda` innecesaria, README menciona un despliegue a S3/CloudFront que no existe.

## 6. Decisiones tecnológicas

| Tema | Decisión | Estado |
|---|---|---|
| Lenguaje | TypeScript estricto en front y back | Por migrar |
| Frontend | React + Vite; accesibilidad antes que estética | Base existe |
| Backend | Node + TypeScript sobre **AWS Lambda siempre**. Una sola función con un router (Express) envuelto con `serverless-http`, en vez de una función por ruta | Por construir |
| Base de datos | **DynamoDB desde el inicio** | Por construir |
| Notificaciones | Interfaz `Notifier`: `MockNotifier` (respaldo de la demo) y `TwilioWhatsAppNotifier`, elegidos con `NOTIFIER=mock\|twilio` | Por construir |
| Credenciales | Solo en `.env`; `.env.example` en el repo | Por hacer |

**Por qué DynamoDB desde el inicio:** en Lambda la memoria no persiste entre cold starts ni se comparte entre instancias, así que un repositorio en memoria no sirve para probar en AWS. El `Repository` tendrá dos implementaciones desde el comienzo: memoria (tests y trabajo offline) y DynamoDB (local y AWS).

### Definiciones base

- **DynamoDB:** base de datos NoSQL administrada por AWS, sin servidores que mantener y con cobro por uso. Sirve para multi-tenant porque cada entidad lleva `tenantId` y se consulta por él. Se accede por clave (partition key + sort key), no con consultas libres como en SQL, por lo que los patrones de acceso se diseñan de antemano.
- **Patrón repositorio:** la lógica de negocio llama a una interfaz (por ejemplo `TratamientoRepository`) y no a la base directamente. Permite cambiar memoria por DynamoDB sin tocar la lógica.
- **Multi-tenant:** un mismo sistema atiende a varios clientes (un ELEAM o una familia) con datos aislados por `tenantId`.
- **Serverless / Lambda:** el código corre como funciones que AWS levanta bajo demanda, con bajo costo si hay poco uso.
- **API Gateway:** puerta de entrada HTTP que enruta las peticiones a la Lambda.
- **Seed:** datos ficticios iniciales. `POST /api/demo/reset` los restaura.
- **Mock vs Twilio:** el mock guarda los mensajes y los muestra en una bandeja dentro de la app. Twilio los manda por WhatsApp real y necesita un webhook público (ngrok en local).
- **Reloj de demo:** una fecha y hora configurables, para mostrar "la ronda de las 08:00" a cualquier hora del día.

### Diseño inicial de DynamoDB (propuesta, por confirmar)

- Tabla única con `PK = TENANT#<tenantId>` y `SK = <ENTIDAD>#<id>` (por ejemplo `TRATAMIENTO#t1`, `TOMA#2026-10-01T08:00#t1`). Un solo query por tenant trae lo que la vista necesita.
- Índice secundario (GSI) por `telefonoWhatsApp`, para resolver el webhook.
- Las tomas se ordenan por fecha en el `SK`, para consultar "la ronda de las 08:00" con un rango.
- Para desarrollo local: DynamoDB Local (contenedor Docker) o directamente una tabla en AWS.
- Modo de cobro `PAY_PER_REQUEST`; nada que dimensionar.

## 7. Priorización de módulos

**Nivel 0 — base (todo depende de esto)**

1. Monorepo TypeScript, tipos del dominio e interfaces de `Repository`.
2. Tabla DynamoDB, repositorio sobre DynamoDB y repositorio en memoria para tests.
3. Seed (ELEAM "Hogar Los Aromos", Familia Pérez) y reset.
4. Lógica de stock (días restantes, semáforo, consumo) con tests simples.
5. Reloj de demo.

**Nivel 1 — núcleo de la demo**

6. API en una sola Lambda: perfiles de demo, tratamientos con semáforo, ronda, marcar todas y excepciones, compras.
7. Selector de perfil (login simulado).
8. Vista ELEAM: ronda y semáforo.
9. `MockNotifier`, bandeja de WhatsApp simulada y regla de alerta (umbral, una cada 24 h).
10. Vista familiar: stock, "ya compré" desde la web y respuesta "COMPRADO" simulada.
11. Vista persona mayor: tomas del día, "Ya me la tomé" y días restantes.

**Nivel 2 — si el núcleo está listo**

12. Preferencias de privacidad editables y respetadas en la vista familiar (sube al Nivel 1 si sobra tiempo: respalda el principio 3 y la pregunta del jurado sobre quién accede a los datos).
13. Alerta escalonada de dosis omitida.
14. Reporte de adherencia.

**Nivel 3 — lo último**

15. Twilio real (webhook y ngrok).
16. QR por residente, aviso de vencimiento de receta, lectura de receta con IA.

**Fuera de alcance hoy:** onboarding y registro, autenticación real, recuperación de contraseña, pagos, integraciones con farmacias, calendario de actividades (solo como lámina de próximos pasos).

**Paralelización:** una vez listos el API y el seed, las tres vistas (8, 10, 11) pueden repartirse entre el equipo. El Nivel 0 conviene hacerlo entre pocos para no pelear por el contrato.

**Riesgo principal:** el Nivel 1 es ambicioso para un día. Si el tiempo aprieta, el sacrificio razonable es la vista familiar completa, porque la alerta y la compra ya se pueden mostrar desde la bandeja simulada.

## 8. Seguridad y datos sensibles (para la pregunta del jurado)

- Todos los datos de la demo son ficticios.
- Cada consulta filtra por `tenantId`; los vínculos familiares los crea el administrador del ELEAM.
- La persona mayor controla (o su apoderado, si es dependiente) qué comparte con su familia.
- Hoy: login simulado y CORS abierto, solo para la demo.
- En producción: autenticación real con el `tenantId` y el rol dentro del token, CORS restringido, cifrado en tránsito y en reposo (DynamoDB lo ofrece por defecto) y registro de accesos.

## 9. Pendientes por decidir

- Tamaño de la "caja estándar" por defecto para "ya compré" (propuesta: 30 unidades, editable en la web).
- Si la tabla DynamoDB de desarrollo será local (Docker) o directamente en AWS.
- Reparto de tareas entre las 4 personas.
- Cuánto tiempo queda para Twilio.
