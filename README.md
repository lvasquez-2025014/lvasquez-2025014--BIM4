# Vought Finance Control — Sistema de Gestión Financiera Full-Stack
### Proyecto Bimestre 4 | Control de Ingresos, Gastos y Presupuestos

![Angular](https://img.shields.io/badge/Angular-18-DD0031?style=for-the-badge&logo=angular&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-12-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Native_Driver-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT_%2B_Google_OAuth-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)

---

## 📌 Descripción del Proyecto

**Vought Finance Control** es una plataforma integral de gestión de finanzas personales y empresariales desarrollada bajo una arquitectura modular y desacoplada. Integra autenticación robusta mediante tokens JWT y Google Sign-In, control de acceso basado en roles (**RBAC**), validaciones financieras en tiempo real y una interfaz gráfica de alta fidelidad inspirada en la estética corporativa de *Vought International*.

---

## 🚀 Características Principales

### 1. 🛡️ Autenticación y Seguridad (RBAC)
- **Autenticación Dual:** Registro e inicio de sesión local mediante contraseñas cifradas con `scrypt` y soporte de inicio de sesión con **Google OAuth 2.0** con fallback resiliente contra desfases horarios.
- **Control de Acceso Basado en Roles:** 
  - `admin`: Gestión total de usuarios, roles, contraseñas, auditoría y parametrización.
  - `user`: Gestión personal de gastos, ingresos, presupuestos y categorías con aislamiento estricto de datos.
- **Guards de Seguridad:** `JwtAuthGuard` y `RolesGuard` protegiendo endpoints sensibles en NestJS y rutas en Angular mediante `AuthGuard` y `AdminGuard`.
- **Gestión de Sesión:** Notificaciones de inactividad, conteo regresivo y renovación silenciosa (`refresh token`).

### 2. 💼 Reglas de Negocio Financieras
- **Control de Saldo Disponible:** Validación reactiva que impide registrar gastos si el monto supera el saldo disponible acumulado en ingresos.
- **Restricción de Fechas Futuras:** Bloqueo de transacciones con fechas posteriores a la fecha actual.
- **Conversor Multidivisa en Tiempo Real:** Visualización instantánea de importes en Quetzales (GTQ), Dólares Estadounidenses (USD) y Euros (EUR).
- **Gestión de Presupuestos:** Asignación mensual por categoría con indicadores de porcentaje consumido y alertas de sobregiro.

### 3. 🎨 Experiencia Visual y Diseño
- **Sistema Multitema:** Soporte para temas corporativos dinámicos (*Vought Dark*, *Emerald*, *Cyberpunk*, *Sapphire*).
- **Cursor Personalizado:** Puntero vectorial dinámico SVG integrado en toda la navegación.
- **Dashboard Analítico:** Gráficos vectoriales SVG reactivos (gráfico de velas OHLC, líneas de tendencia temporal y gráfico de dona por distribución de categoría).
- **Exportación de Datos:** Descarga de reportes de movimientos en formatos CSV estructurados con codificación `UTF-8 BOM`.

---

## 📂 Estructura del Repositorio

```bash
├── backend/                  # API REST construida con NestJS 12 y TypeScript
│   ├── src/
│   │   ├── core/             # Base de datos nativa MongoDB, guards y decoradores
│   │   │   ├── database/     # Conexión persistente mediante DatabaseService
│   │   │   ├── decorators/   # Decorador personalizado @CurrentUser()
│   │   │   └── guards/       # JwtAuthGuard y RolesGuard (RBAC)
│   │   ├── modules/          # Módulos desacoplados de la aplicación
│   │   │   ├── auth/         # Autenticación local y Google OAuth
│   │   │   ├── budget/       # Presupuestos mensuales
│   │   │   ├── category/     # Categorías de gastos/ingresos
│   │   │   ├── expense/      # Gastos e ingresos
│   │   │   └── user/         # Usuarios, hashing scrypt y roles
│   │   ├── app.module.ts     # Módulo raíz de NestJS
│   │   └── main.ts           # Punto de entrada y arranque del servidor
│   └── scripts/              # Scripts auxiliares de administración
│
├── frontend/                 # Aplicación SPA en Angular 18 (Signals & Standalone)
│   ├── src/app/
│   │   ├── core/             # Servicios centrales (API, Divisas, Notificaciones, Temas)
│   │   ├── features/
│   │   │   ├── auth/         # Vistas de login, registro y guards de ruta
│   │   │   └── transactions/ # Páginas y componentes:
│   │   │       ├── pages/    # Dashboard, Gastos, Ingresos, Movimientos,
│   │   │       │             # Presupuestos, Categorías, Usuarios, Reportes, Ajustes
│   │   │       └── components/ # Topbar, Sidebar, Gráficos SVG (Velas, Dona, Líneas)
│   │   └── shared/           # Componentes flotantes (Toasts, Notificaciones)
│
├── docs/                     # Documentación y preparación para defensa de proyecto
│   ├── EXPLICACION_LINEA_POR_LINEA.md # Guía técnica detallada de todo el código
│   ├── GUIA_DE_ESTUDIO_DEFENSA.md     # Guía didáctica para evaluación y preguntas
│   └── diagramas/            # Diagramas interactivos en HTML y JSON
│       ├── ciclo-vida-nestjs.html     # Ciclo de vida de petición en NestJS
│       ├── flujo-seguridad.html       # Flujo JWT y verificación de permisos
│       └── arquitectura-vought.html   # Arquitectura general del sistema
│
├── maquetados/               # Documentos de especificación y maquetación de pantallas (.docx y .pdf)
└── scriptsPowerShell/        # Scripts de automatización y administración de usuarios
    ├── Crear-Usuario-Admin.ps1
    ├── Crear-Usuario-Cliente.ps1
    ├── Promover-Usuario-A-Admin.ps1
    ├── Cambiar-Password-Admin.ps1
    └── Listar-Usuarios.ps1
```

---

## 🛠️ Instalación y Puesta en Marcha

### Prerrequisitos
- **Node.js:** Versión 20 o superior
- **pnpm:** Gestor de paquetes (`npm i -g pnpm`)
- **MongoDB:** Servicio local en ejecución (`mongodb://localhost:27017`) o clúster en MongoDB Atlas

---

### 1. Configuración del Backend

1. Acceder a la carpeta del backend e instalar dependencias:
   ```powershell
   cd backend
   pnpm install
   ```

2. Crear y configurar el archivo `.env` en la raíz de `backend/`:
   ```env
   PORT=3000
   JWT_SECRET=tu_clave_secreta_super_segura_de_produccion_2026
   JWT_EXPIRES_IN=24h
   GOOGLE_CLIENT_ID=3201301134-1sb2cjj5loq57otp2cub80n07usnm9oq.apps.googleusercontent.com
   ```

3. Compilar e iniciar el servidor:
   ```powershell
   # Modo desarrollo (con recarga en vivo)
   pnpm dev

   # Modo producción
   pnpm build
   pnpm start
   ```
   *El servidor quedará escuchando en `http://localhost:3000`.*

---

### 2. Configuración del Frontend

1. Acceder a la carpeta del frontend e instalar dependencias:
   ```powershell
   cd frontend
   pnpm install
   ```

2. Iniciar el servidor de desarrollo de Angular:
   ```powershell
   pnpm start
   ```
   *La aplicación estará disponible en `http://localhost:4200`.*

---

## ⚙️ Administración de Usuarios (PowerShell)

Para facilitar la administración de usuarios sin necesidad de quemar credenciales en el código fuente, se crearon scripts dedicados en la carpeta `scriptsPowerShell/`:

```powershell
# Listar todos los usuarios y sus roles
.\scriptsPowerShell\Listar-Usuarios.ps1

# Crear un nuevo administrador
.\scriptsPowerShell\Crear-Usuario-Admin.ps1 -Usuario "director" -Password "AdminPass2026!" -Nombre "Director General"

# Crear un nuevo cliente / usuario estándar
.\scriptsPowerShell\Crear-Usuario-Cliente.ps1 -Usuario "empleado1" -Password "UserPass2026!" -Nombre "Juan Pérez"

# Elevar privilegios a un usuario existente
.\scriptsPowerShell\Promover-Usuario-A-Admin.ps1 -Usuario "empleado1"

# Restablecer contraseña de administrador
.\scriptsPowerShell\Cambiar-Password-Admin.ps1 -Usuario "admin" -NuevaPassword "NuevaClave2026!"
```

---

## 📊 Documentación de Arquitectura y Diagramas

Dentro de la carpeta [`docs/diagramas/`](file:///docs/diagramas/) se encuentran disponibles diagramas interactivos que pueden abrirse directamente en cualquier navegador:

- **`ciclo-vida-nestjs.html`:** Muestra la traza exacta de una petición atravesando Middleware ➔ Guards ➔ Interceptors ➔ Pipes ➔ Controller ➔ Service ➔ MongoDB.
- **`flujo-seguridad.html`:** Flujo criptográfico de tokens JWT, almacenamiento seguro y resolución de roles.
- **`arquitectura-vought.html`:** Topología general entre el cliente Angular, el backend NestJS y la persistencia NoSQL.

---

## 👨‍💻 Datos del Alumno

* **Nombre:** Ludwing Iván Vásquez Navas
* **Carné:** 2025014
* **Bimestre:** 4to Bimestre
* **Rama de Trabajo:** `lvasquez`