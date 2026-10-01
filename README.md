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
