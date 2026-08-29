# lvasquez-2025014--BIM4

Proyecto de gestion de gastos del cuarto bimestre. Aplicacion full-stack compuesta por un frontend en Angular y una API REST en Node.js con almacenamiento en MongoDB.

## Estructura

- `frontend/`: aplicacion Angular 18 con dashboard, graficas SVG, autenticacion JWT y Google Sign-In.
- `backend/`: API REST en Node.js y TypeScript (node:http) con autenticacion JWT y MongoDB.

## Requisitos

- Node.js 20 o superior
- MongoDB local (`mongodb://localhost:27017`) o MongoDB Atlas
- pnpm como gestor de dependencias

## Instalacion

### Backend

```bash
cd backend
pnpm install
pnpm dev
```

Configurar las variables de entorno en `backend/.env`:

```
PORT=3000
JWT_SECRET=<secreto>
JWT_EXPIRES_IN=1h
GOOGLE_CLIENT_ID=<client-id-de-google>
```

### Frontend

```bash
cd frontend
pnpm install
pnpm start
```

## Funcionalidades

- Registro e inicio de sesion con usuario y contrasena (JWT).
- Inicio de sesion con cuenta de Google.
- Registro de gastos e ingresos con categorias.
- Dashboard con resumen, graficas de flujo de caja, distribucion de gastos y acciones rapidas.
- Monitoreo de expiracion de sesion con renovacion automatica del token.