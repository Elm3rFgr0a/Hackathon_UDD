# Hackathon UDD

Full Stack Application with Serverless Backend (Node.js + AWS Lambda) and Frontend (React + Vite)

## Estructura del Proyecto

```
hackathon-udd/
├── backend/          # Serverless Backend
│   ├── src/
│   │   └── handlers/ # Lambda Functions
│   ├── serverless.yml
│   └── package.json
├── frontend/         # React + Vite
│   ├── src/
│   │   ├── components/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── vite.config.js
│   └── package.json
└── README.md
```

## 🚀 Quick Start

### Backend (Serverless)

```bash
cd backend
npm install
npm run dev
```

El backend correrá en `http://localhost:3000`

### Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

El frontend correrá en `http://localhost:5173`

## 📱 App "Autia" (frontend)

Logo en `frontend/assets/autia-logo-original.png`. El nombre usa **Roca Two Bold** (fuente comercial, no incluida): ver `frontend/public/fonts/LEEME.md`.

App móvil (React + Vite + React Router) con dos flujos según el rol de la cuenta:

- **Adulto mayor** (`/adulto`): pocos botones, texto grande, un color por sección (remedios, mi día, consultas, próximos días, cerca de mí).
- **Familiar** (`/familiar`): elige al adulto mayor que acompaña y gestiona resumen, agenda, remedios y personas.

Cuentas de prueba (contraseña `1234`): `rosa@cerca.cl`, `hector@cerca.cl` (adulto mayor), `camila@cerca.cl` (familiar) y `cuidadora@losaromos.cl` (personal del ELEAM Los Aromos, solo con servidor).

- **ELEAM** (`/eleam`): ronda de remedios por hora con todos los residentes del establecimiento. Un botón marca todas las dosis como dadas; las que fallan se registran con su motivo y se avisa a la familia (WhatsApp con Twilio o simulado). Detalle en [docs/PLAN_BACKEND.md](docs/PLAN_BACKEND.md).

- Los datos de demostración viven en `src/data/seed.js` y se guardan en `localStorage`. En el login se pueden restablecer.
- Las notificaciones se calculan en `src/lib/notifications.js` (1 h antes y 1 h después de cada actividad, remedios, consultas, stock bajo, etc.).
- La hora de la demo se fija desde el login ("Hora de la demo" → "Aplicar y reiniciar"). En el navegador también sirve `?hora=13:02` en la URL.
- Prototipo sin backend: todo se guarda en el dispositivo.

### Generar el APK (Android)

Requiere JDK 17+ y el SDK de Android (`ANDROID_HOME`).

```bash
cd frontend
npm install
npm run android:apk     # compila la web, la sincroniza y arma el APK
```

Queda en `frontend/android/app/build/outputs/apk/debug/app-debug.apk`. Para abrirlo en Android Studio: `npm run android:open`.

## Deployment

### Backend - AWS Lambda

```bash
cd backend
npm run deploy
```

Requiere credenciales AWS configuradas.

### Frontend - AWS S3 + CloudFront

```bash
cd frontend
npm run build
```

Luego sube la carpeta `dist/` a S3.

## 📝 API Endpoints

- `GET /hello` - Health check
- `GET /users` - Obtener lista de usuarios
- `POST /users` - Crear nuevo usuario

## 🛠 Stack

**Backend:**
- Node.js 18.x
- Serverless Framework
- AWS Lambda

**Frontend:**
- React 18
- Vite
- React Router
- Capacitor (APK Android)

## 📌 Notas

- Asegúrate de tener Node.js 18+ instalado
- El backend usa `serverless-offline` para desarrollo local

## 👨‍💻 Autor

Hackathon UDD Team
