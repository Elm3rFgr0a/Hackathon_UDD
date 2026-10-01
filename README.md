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

## 📱 App "Cerca" (frontend)

App móvil (React + Vite + React Router) con dos flujos según el rol de la cuenta:

- **Adulto mayor** (`/adulto`): pocos botones, texto grande, un color por sección (remedios, mi día, consultas, próximos días, cerca de mí).
- **Familiar** (`/familiar`): elige al adulto mayor que acompaña y gestiona resumen, agenda, remedios y personas.

Cuentas de prueba (contraseña `1234`): `rosa@cerca.cl`, `hector@cerca.cl` (adulto mayor) y `camila@cerca.cl` (familiar).

- Los datos de demostración viven en `src/data/seed.js` y se guardan en `localStorage`. En el login se pueden restablecer.
- Las notificaciones se calculan en `src/lib/notifications.js` (1 h antes y 1 h después de cada actividad, remedios, consultas, stock bajo, etc.).
- Para probarlas, simula la hora con `?hora=13:02` en la URL. Con `?hora=real` vuelve a la hora real.
- Al añadir un adulto mayor se llama a `POST /users` del backend; si la API no responde, se guarda solo en el navegador.

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
- Axios

## 📌 Notas

- Asegúrate de tener Node.js 18+ instalado
- El backend usa `serverless-offline` para desarrollo local
- El frontend proxy las requests a `/api/*` al backend

## 👨‍💻 Autor

Hackathon UDD Team
