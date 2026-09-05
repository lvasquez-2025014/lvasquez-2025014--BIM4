# EXPLICACIÓN TÉCNICA LÍNEA POR LÍNEA Y ARCHIVO POR ARCHIVO
## VOUGHT INTERNATIONAL — SISTEMA DE GESTIÓN Y AUDITORÍA FINANCIERA

> **Manual de Estudio y Defensa Definitivo**: Este documento analiza los 17 archivos más críticos de la arquitectura full-stack del proyecto. Explica cada importación, cada clase, cada decorador y cada algoritmo línea por línea, preparándote para responder cuando el evaluador señale una línea de código en pantalla.

---

# ÍNDICE GENERAL DE ARCHIVOS

### 🟢 PARTE 1: BACKEND (NestJS + MongoDB + Seguridad)
1. [`backend/src/main.ts`](#1-backendsrcmaints--punto-de-entrada-y-bootstrap) — Inicialización, CORS y servidor HTTP.
2. [`backend/src/app.module.ts`](#2-backendsrcappmodulets--módulo-raíz) — Árbol de dependencias e inyección.
3. [`backend/src/core/database/database.service.ts`](#3-backendsrccoredatabasedatabaseservicets--driver-nativo-mongodb-singleton) — Pool nativo TCP de MongoDB.
4. [`backend/src/core/guards/jwt-auth.guard.ts`](#4-backendsrccoreguardsjwt-authguardts--guardián-de-autenticación-jwt) — Validación de Bearer Token y firma digital.
5. [`backend/src/core/guards/roles.guard.ts`](#5-backendsrccoreguardsrolesguardts--guardián-rbac-de-roles) — Control de acceso restringido para Administradores.
6. [`backend/src/core/decorators/current-user.decorator.ts`](#6-backendsrccoredecoratorscurrent-userdecoratorts--decorador-personalizado) — Extracción limpia del usuario validado.
7. [`backend/src/modules/auth/auth.service.ts`](#7-backendsrcmodulesauthauthservicets--servicio-de-autenticación-y-google-oauth) — Login local, verificación con Google y emisión de JWT.
8. [`backend/src/modules/expense/expense.controller.ts`](#8-backendsrcmodulesexpenseexpensecontrollerts--controlador-rest-de-gastos) — Mapeo de rutas REST y decoradores HTTP.
9. [`backend/src/modules/expense/services/expense.service.ts`](#9-backendsrcmodulesexpenseservicesexpenseservicets--lógica-crud-con-driver-nativo) — Consultas a colecciones MongoDB y aislamiento de usuario.

### 🔵 PARTE 2: FRONTEND (Angular 19 Standalone + Signals + SVG)
10. [`frontend/src/app/app.routes.ts`](#10-frontendsrcappapproutests--enrutador-con-lazy-loading) — Configuración de rutas y guards de navegación.
11. [`frontend/src/app/features/auth/guards/auth.guard.ts`](#11-frontendsrcappfeaturesauthguardsauthguardts--guard-funcional-de-sesión) — Protección de rutas y redirección atómica con `UrlTree`.
12. [`frontend/src/app/features/auth/guards/admin.guard.ts`](#12-frontendsrcappfeaturesauthguardsadminguardts--guard-funcional-de-administrador) — Bloqueo de acceso no autorizado a usuarios.
13. [`frontend/src/app/core/services/api.service.ts`](#13-frontendsrcappcoreservicesapiservicets--cliente-http-e-inyección-de-token) — Inyector centralizado de encabezado `Authorization: Bearer`.
14. [`frontend/src/app/core/utils/export.utils.ts`](#14-frontendsrcappcoreutilsexportutilsts--motor-de-exportación-excel-utf-8-bom) — Generador de archivos CSV con BOM `\uFEFF` y delimitador `;`.
15. [`frontend/src/app/core/utils/date.utils.ts`](#15-frontendsrcappcoreutilsdateutilsts--blindaje-contra-desfase-de-zona-horaria-utc-6) — Algoritmo `parseLocalDate()` a mediodía local.
16. [`frontend/src/app/features/transactions/components/candlestick-chart/candlestick-chart.component.ts`](#16-frontendsrcappfeaturestransactionscomponentscandlestick-chartcandlestick-chartcomponentts--gráfica-svg-nativa-y-cruce-por-cero) — Saldo acumulativo, cruce por cero y curvas Bézier.
17. [`frontend/src/app/core/services/currency.service.ts`](#17-frontendsrcappcoreservicescurrencyservicets--conversor-multidivisa-reactivo) — Gestión de tasas de cambio reactivas con Signals (`GTQ`, `USD`, `EUR`).

---

# PARTE 1: BACKEND (NestJS + MongoDB + Seguridad)

---

### 1. `backend/src/main.ts` — Punto de Entrada y Bootstrap

Ubicación: [backend/src/main.ts](file:///c:/Users/asm/Desktop/lvasquez-2025014--BIM4/backend/src/main.ts)

```typescript
1: import 'reflect-metadata';
2: import * as dotenv from 'dotenv';
3: dotenv.config();
4: 
5: import { NestFactory } from '@nestjs/core';
6: import { AppModule } from './app.module.js';
7: 
8: async function bootstrap() {
9:   const app = await NestFactory.create(AppModule);
10: 
11:   app.enableCors({
12:     origin: '*',
13:     methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
14:     allowedHeaders: 'Content-Type, Authorization',
15:     credentials: true,
16:   });
17: 
18:   const port = process.env.PORT || 3000;
19:   await app.listen(port, '0.0.0.0');
20:   console.log(`[NestJS] Servidor corriendo con éxito en http://localhost:${port}`);
21: }
22: 
23: bootstrap().catch((err) => {
24:   console.error('[NestJS] Error fatal iniciando la aplicación:', err);
25:   process.exit(1);
26: });
```

#### Desglose Línea por Línea:
* **Línea 1 (`import 'reflect-metadata';`)**: Habilita el polyfill de reflexión de metadatos en tiempo de ejecución. Sin esto, TypeScript no puede guardar ni leer los tipos de dependencias inyectadas en los decoradores (`@Injectable`, `@Controller`).
* **Líneas 2-3 (`import * as dotenv from 'dotenv'; dotenv.config();`)**: Lee el archivo `.env` en la raíz del backend y carga variables sensibles (`MONGO_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`) en la memoria del proceso `process.env` **antes** de que cualquier módulo se instancie.
* **Línea 5 (`import { NestFactory } from '@nestjs/core';`)**: Clase central de NestJS encargada de fabricar la instancia de la aplicación.
* **Línea 6 (`import { AppModule } from './app.module.js';`)**: Importa el módulo raíz que contiene el árbol de componentes.
* **Línea 8 (`async function bootstrap()`)**: Función asíncrona de arranque (*bootstrap pattern*).
* **Línea 9 (`const app = await NestFactory.create(AppModule);`)**: Crea el contenedor de inversión de control (IoC) y monta el servidor HTTP sobre Express.
* **Líneas 11-16 (`app.enableCors({ ... })`)**: Configura el middleware de **CORS (Cross-Origin Resource Sharing)**. Permite que el frontend en el puerto `:4200` envíe peticiones al backend en el puerto `:3000` con los encabezados `Content-Type` y `Authorization` (donde viaja el Bearer token).
* **Líneas 18-19 (`const port = ...; await app.listen(port, '0.0.0.0');`)**: Levanta el socket TCP en el puerto 3000 escuchando en `0.0.0.0` (todas las interfaces de red, permitiendo conexiones locales y de red de área local).
* **Líneas 23-26 (`bootstrap().catch(...)`)**: Captura cualquier fallo catastrófico al arrancar (ej. puerto ocupado) y finaliza el proceso de Node con código de salida 1 (`process.exit(1)`).

> 🎤 **Pregunta de Examen**: *"¿Por qué `app.listen` escucha en `'0.0.0.0'` y no en `'localhost'`?"*  
> **Respuesta**: *"Porque `localhost` o `127.0.0.1` solo acepta tráfico interno de la misma máquina. Al usar `0.0.0.0`, el servidor escucha en todas las tarjetas de red de la máquina, permitiendo pruebas desde dispositivos móviles en la misma red Wi-Fi o contenedores Docker."*

---

### 2. `backend/src/app.module.ts` — Módulo Raíz

Ubicación: [backend/src/app.module.ts](file:///c:/Users/asm/Desktop/lvasquez-2025014--BIM4/backend/src/app.module.ts)

```typescript
1: import { Module } from '@nestjs/common';
2: import { DatabaseModule } from './core/database/database.module.js';
3: import { AuthModule } from './modules/auth/auth.module.js';
4: import { ExpenseModule } from './modules/expense/expense.module.js';
5: import { CategoryModule } from './modules/category/category.module.js';
6: import { BudgetModule } from './modules/budget/budget.module.js';
7: import { UserModule } from './modules/user/user.module.js';
8: 
9: @Module({
10:   imports: [
11:     DatabaseModule,
12:     AuthModule,
13:     ExpenseModule,
14:     CategoryModule,
15:     BudgetModule,
16:     UserModule,
17:   ],
18: })
19: export class AppModule {}
```

#### Desglose Línea por Línea:
* **Línea 1**: Importa el decorador `@Module` de NestJS.
* **Líneas 2-7**: Importa los módulos de dominio que componen la arquitectura limpia de la aplicación. Cada carpeta en `modules/` representa un límite de contexto (*Bounded Context*) según principios de Domain-Driven Design (DDD).
* **Líneas 9-18 (`@Module({ imports: [...] })`)**: Metadatos que definen la estructura del grafo de inyección de dependencias. Al arrancar, NestJS construye un Grafo Acíclico Dirigido (DAG) para resolver qué servicio necesita a cuál sin generar dependencias circulares.
* **Línea 19**: Exporta la clase vacía `AppModule`, que sirve como punto de anclaje de la arquitectura.

---

### 3. `backend/src/core/database/database.service.ts` — Driver Nativo MongoDB (Singleton)

Ubicación: [backend/src/core/database/database.service.ts](file:///c:/Users/asm/Desktop/lvasquez-2025014--BIM4/backend/src/core/database/database.service.ts)

```typescript
1: import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
2: import { MongoClient, Db, Collection, type Document } from 'mongodb';
3: 
4: @Injectable()
5: export class DatabaseService implements OnModuleInit, OnModuleDestroy {
6:   private client: MongoClient;
7:   private dbInstance!: Db;
8: 
9:   constructor() {
10:     const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';
11:     this.client = new MongoClient(mongoUrl);
12:   }
13: 
14:   async onModuleInit() {
15:     const dbName = process.env.DB_NAME || 'gastos-proyect';
16:     await this.client.connect();
17:     this.dbInstance = this.client.db(dbName);
18:     console.log(`[NestJS] Conectado exitosamente con MongoDB en base de datos: ${dbName}`);
19:   }
20: 
21:   async onModuleDestroy() {
22:     await this.client.close();
23:     console.log('[NestJS] Conexión con MongoDB cerrada');
24:   }
25: 
26:   get db(): Db {
27:     return this.dbInstance;
28:   }
29: 
30:   getCollection<T extends Document = Document>(name: string): Collection<T> {
31:     return this.dbInstance.collection<T>(name);
32:   }
33: }
```

#### Desglose Línea por Línea:
* **Línea 1**: `OnModuleInit` y `OnModuleDestroy` son interfaces del ciclo de vida (*Lifecycle Hooks*) de NestJS.
* **Línea 2**: Importa las clases del **driver oficial nativo de MongoDB** (`mongodb`), sin la sobrecarga de Mongoose.
* **Línea 4 (`@Injectable()`)**: Registra la clase como proveedor inyectable en el contenedor IoC. Por defecto tiene **ámbito Singleton** (solo se crea una instancia para toda la aplicación).
* **Líneas 6-7**: Propiedades privadas. `client` almacena el pool de conexiones TCP; `dbInstance` almacena la referencia a la base de datos activa.
* **Líneas 9-12 (`constructor()`)**: Lee `process.env.MONGO_URL` y crea la instancia de `MongoClient`. El cliente administra automáticamente un *Connection Pool* de conexiones concurrentes reutilizables.
* **Líneas 14-19 (`onModuleInit()`)**: Se ejecuta automáticamente cuando NestJS inicializa el módulo. Abre la conexión TCP con `await this.client.connect()` y selecciona la base de datos `dbName`.
* **Líneas 21-24 (`onModuleDestroy()`)**: Cierre ordenado (*Graceful Shutdown*). Cuando el servidor se detiene (Ctrl+C), cierra las conexiones abiertas con MongoDB para evitar fugas de sockets en el sistema operativo.
* **Líneas 30-32 (`getCollection<T>(name)`)**: Método tipado mediante genéricos de TypeScript (`<T extends Document>`). Devuelve una colección de MongoDB fuertemente tipada para que métodos como `.find()` o `.insertOne()` sepan qué campos tiene el documento.

---

### 4. `backend/src/core/guards/jwt-auth.guard.ts` — Guardián de Autenticación JWT

Ubicación: [backend/src/core/guards/jwt-auth.guard.ts](file:///c:/Users/asm/Desktop/lvasquez-2025014--BIM4/backend/src/core/guards/jwt-auth.guard.ts)

```typescript
1: import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
2: import jwt from 'jsonwebtoken';
3: 
4: @Injectable()
5: export class JwtAuthGuard implements CanActivate {
6:   canActivate(context: ExecutionContext): boolean {
7:     const request = context.switchToHttp().getRequest();
8:     const authHeader = request.headers.authorization;
9: 
10:     if (!authHeader || !authHeader.startsWith('Bearer ')) {
11:       throw new UnauthorizedException('No autorizado');
12:     }
13: 
14:     const token = authHeader.slice(7);
15:     const jwtSecret = process.env.JWT_SECRET;
16: 
17:     if (!jwtSecret) {
18:       throw new UnauthorizedException('Configuración de JWT ausente en servidor');
19:     }
20: 
21:     try {
22:       const payload = jwt.verify(token, jwtSecret) as { usuario?: string; rol?: string };
23:       if (!payload.usuario) {
24:         throw new UnauthorizedException('Token inválido: falta usuario');
25:       }
26:       request.usuario = payload.usuario;
27:       request.rol = payload.rol || 'user';
28:       request.user = { usuario: payload.usuario, rol: request.rol };
29:       return true;
30:     } catch {
31:       throw new UnauthorizedException('Token inválido o expirado');
32:     }
33:   }
34: }
```

#### Desglose Línea por Línea:
* **Línea 1**: Importa `CanActivate` (interfaz que exige el método `canActivate`) y `ExecutionContext`.
* **Línea 5**: `implements CanActivate` garantiza que NestJS reconozca la clase como un Guard válido para usar con `@UseGuards(JwtAuthGuard)`.
* **Línea 6 (`canActivate(context: ExecutionContext): boolean`)**: Punto de decisión. Si retorna `true`, la petición avanza; si lanza una excepción, se detiene.
* **Línea 7 (`context.switchToHttp().getRequest()`)**: Convierte el contexto general al protocolo HTTP y extrae el objeto `request` de Express.
* **Línea 8 (`const authHeader = request.headers.authorization;`)**: Obtiene el encabezado `Authorization`.
* **Líneas 10-12**: Verifica si el encabezado existe y si inicia con el prefijo estándar `Bearer `. Si no lo tiene, lanza `UnauthorizedException` (código HTTP 401).
* **Línea 14 (`const token = authHeader.slice(7);`)**: Corta los primeros 7 caracteres (`"Bearer "` = 7 caracteres) para quedarse únicamente con el token JWT en base64url.
* **Línea 22 (`jwt.verify(token, jwtSecret)`)**: Función criptográfica que:
  1. Recalcula la firma HMAC-SHA256 del header y payload del token usando el secreto del servidor.
  2. Compara la firma calculada con la firma que viene en el token. Si difieren (token manipulado), lanza error.
  3. Comprueba el claim de expiración `exp`. Si la hora actual superó `exp`, lanza error.
* **Líneas 26-28**: Inyecta los datos del usuario autenticado en el objeto `request`. Esto permite que cualquier componente downstream (decoradores, controladores) acceda al usuario verificado sin tener que volver a decodificar el token.
* **Línea 29 (`return true;`)**: Otorga acceso a la ruta.
* **Líneas 30-32 (`catch`)**: Captura cualquier error de firma o expiración y responde con un error 401 unificado.

---

### 5. `backend/src/core/guards/roles.guard.ts` — Guardián RBAC de Roles

Ubicación: [backend/src/core/guards/roles.guard.ts](file:///c:/Users/asm/Desktop/lvasquez-2025014--BIM4/backend/src/core/guards/roles.guard.ts)

```typescript
1: import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
2: 
3: @Injectable()
4: export class RolesGuard implements CanActivate {
5:   canActivate(context: ExecutionContext): boolean {
6:     const request = context.switchToHttp().getRequest();
7:     const rol = request.rol || request.user?.rol;
8: 
9:     if (rol !== 'admin') {
10:       throw new ForbiddenException('Acceso denegado: Se requiere rol de Administrador');
11:     }
12: 
13:     return true;
14:   }
15: }
```

#### Desglose Línea por Línea:
* **Línea 1**: Importa `ForbiddenException` (código HTTP 403 Forbidden).
* **Línea 7**: Lee el rol que previamente adjuntó el `JwtAuthGuard`. Se diseñó para ejecutarse después de `JwtAuthGuard`.
* **Líneas 9-11**: Si el rol no es estrictamente `'admin'`, lanza un error HTTP 403 indicando que el usuario está autenticado pero **no tiene privilegios** para este recurso (Principio de Menor Privilegio).
* **Línea 13**: Retorna `true` y concede acceso a endpoints sensibles como la administración de usuarios (`/api/users`).

---

### 6. `backend/src/core/decorators/current-user.decorator.ts` — Decorador Personalizado

Ubicación: [backend/src/core/decorators/current-user.decorator.ts](file:///c:/Users/asm/Desktop/lvasquez-2025014--BIM4/backend/src/core/decorators/current-user.decorator.ts)

```typescript
1: import { createParamDecorator, ExecutionContext } from '@nestjs/common';
2: 
3: export const CurrentUser = createParamDecorator(
4:   (data: unknown, ctx: ExecutionContext): string => {
5:     const request = ctx.switchToHttp().getRequest();
6:     return request.usuario;
7:   },
8: );
```

#### Desglose Línea por Línea:
* **Línea 1**: `createParamDecorator` es una utilidad de NestJS para fabricar decoradores de parámetros personalizados.
* **Líneas 3-4**: Se exporta la constante `CurrentUser`. Recibe una función de fábrica con dos parámetros: `data` (argumentos opcionales pasados al decorador) y `ctx` (`ExecutionContext`).
* **Línea 5**: Obtiene la petición HTTP actual.
* **Línea 6 (`return request.usuario;`)**: Extrae el nombre de usuario previamente inyectado por el `JwtAuthGuard` y lo inyecta como valor directo en el parámetro del método del controlador.

> 🎤 **Pregunta de Examen**: *"¿Qué ventaja tiene escribir `@CurrentUser() usuario: string` en lugar de `@Req() req: Request`?"*  
> **Respuesta**: *"Tiene 3 ventajas: 1) **Seguridad**: El controlador no tiene acceso a todo el objeto de petición crudo; 2) **Tipado fuerte**: El controlador recibe un `string` limpio en vez de un objeto `any`; 3) **Testeabilidad**: En pruebas unitarias, se puede pasar un string como `'admin'` directamente al método del controlador sin necesidad de fabricar un objeto `Request` falso con headers y cookies."*

---

### 7. `backend/src/modules/auth/auth.service.ts` — Servicio de Autenticación y Google OAuth

Ubicación: [backend/src/modules/auth/auth.service.ts](file:///c:/Users/asm/Desktop/lvasquez-2025014--BIM4/backend/src/modules/auth/auth.service.ts)

```typescript
54:   async loginWithGoogle(idToken?: string) {
55:     if (!idToken) {
56:       throw new BadRequestException('Token de Google requerido');
57:     }
58: 
59:     try {
60:       const ticket = await this.googleClient.verifyIdToken({
61:         idToken,
62:         audience: this.googleClientId,
63:       });
64:       const payload = ticket.getPayload();
65: 
66:       if (!payload || !payload.email) {
67:         throw new UnauthorizedException('Token de Google inválido');
68:       }
69: 
70:       const email = payload.email;
71:       const nombre = payload.name || '';
72:       const foto = payload.picture || '';
73: 
74:       // 1. ¿El usuario que está ingresando con Google existe en mi base de datos?
75:       let user = await this.userService.findByUsuario(email);
76: 
77:       if (!user) {
78:         // Si NO existe: se crea como nuevo usuario (rol 'user')
79:         console.log(`[Google Auth] Usuario ${email} NO existe en la base de datos. Creándolo con rol 'user'...`);
80:         user = await this.userService.create(email, crypto.randomUUID(), nombre, 'user');
81:         if (foto) {
82:           await this.userService.updateProfile(email, { foto });
83:         }
84:       } else {
85:         // Si YA existe: se deja pasar respetando el rol que tiene registrado en la base de datos
86:         console.log(`[Google Auth] Usuario ${email} SÍ existe en la base de datos con rol '${user.rol}'. Acceso concedido.`);
87:         if (foto && !user.foto) {
88:           await this.userService.updateProfile(email, { foto });
89:         }
90:       }
91: 
92:       const rol = user.rol || 'user';
93:       const token = jwt.sign({ usuario: email, rol }, this.jwtSecret, { expiresIn: this.getExpiresIn() as any });
94: 
95:       return {
96:         token,
97:         usuario: email,
98:         nombre: user.nombre || nombre,
99:         foto: user.foto || foto,
100:         rol,
101:       };
102:     } catch (err) {
103:       console.error('[NestJS Auth] Error verificando token de Google:', err);
104:       throw new UnauthorizedException('Token de Google inválido o expirado');
105:     }
106:   }
```

#### Desglose Línea por Línea:
* **Línea 55-57**: Validación previa: el `idToken` emitido por Google Sign-In en el navegador es obligatorio.
* **Líneas 60-63 (`this.googleClient.verifyIdToken`)**: Valida criptográficamente el token contra los servidores de claves públicas de Google. `audience: this.googleClientId` garantiza que el token fue emitido específicamente para nuestra aplicación y no para otra web que use Google Sign-In.
* **Línea 64 (`const payload = ticket.getPayload();`)**: Si la firma es válida, extrae el contenido del token (email verificado, nombre, URL de foto de perfil).
* **Línea 75 (`let user = await this.userService.findByUsuario(email);`)**: Consulta si este email ya existe en la base de datos MongoDB.
* **Líneas 77-83**: **Regla de Negocio para Nuevos Usuarios**: Si es la primera vez que entra con Google (o la base de datos fue limpiada), se crea un registro persistente con una contraseña aleatoria de alta entropía (`crypto.randomUUID()`) y rol `'user'`. Se guarda su foto de perfil de Google.
* **Líneas 84-90**: **Regla de Negocio para Usuarios Existentes**: Si el usuario ya fue registrado previamente (por ejemplo, si un administrador le asignó rol `'admin'`), **se respeta su rol existente** y se actualiza su avatar si no tenía uno.
* **Línea 93 (`jwt.sign(...)`)**: Emite nuestro propio JWT interno de Vought con expiración de 24 horas y el rol correspondiente.
* **Líneas 95-101**: Devuelve el payload estructurado con token, correo, nombre y foto para que el frontend configure la sesión en un solo paso.

---

### 8. `backend/src/modules/expense/expense.controller.ts` — Controlador REST de Gastos

Ubicación: [backend/src/modules/expense/expense.controller.ts](file:///c:/Users/asm/Desktop/lvasquez-2025014--BIM4/backend/src/modules/expense/expense.controller.ts)

```typescript
7: @Controller('api/expenses')
8: @UseGuards(JwtAuthGuard)
9: export class ExpenseController {
10:   constructor(@Inject(ExpenseService) private readonly expenseService: ExpenseService) {}
11: 
12:   @Get()
13:   async getAll(@CurrentUser() usuario: string) {
14:     return this.expenseService.getAll(usuario);
15:   }
16: 
17:   @Post()
18:   @HttpCode(HttpStatus.CREATED)
19:   async create(
20:     @CurrentUser() usuario: string,
21:     @Body() body: Partial<Omit<Expense, '_id'>>
22:   ) {
23:     return this.expenseService.create({
24:       usuario,
25:       descripcion: body.descripcion ?? '',
26:       monto: Number(body.monto) || 0,
27:       tipo: body.tipo === 'Ingreso' ? 'Ingreso' : 'Gasto',
28:       categoria: body.categoria ?? '',
29:       fecha: body.fecha ? new Date(body.fecha) : new Date(),
30:     });
31:   }
```

#### Desglose Línea por Línea:
* **Línea 7 (`@Controller('api/expenses')`)**: Enruta todas las peticiones con prefijo `/api/expenses` hacia los métodos de esta clase.
* **Línea 8 (`@UseGuards(JwtAuthGuard)`)**: Aplica el guardián de JWT a **todos** los métodos del controlador a nivel de clase. Ninguna petición anónima puede tocar ningún endpoint de gastos.
* **Línea 10 (`constructor(...)`)**: Inyección de Dependencias. El contenedor IoC pasa la instancia singleton de `ExpenseService`.
* **Líneas 12-15 (`@Get() getAll(@CurrentUser() usuario)`)**: Mapea `GET /api/expenses`. El decorador `@CurrentUser()` inyecta el usuario autenticado y el servicio busca únicamente los gastos que pertenecen a ese usuario (`getAll(usuario)`).
* **Línea 17-18 (`@Post() @HttpCode(HttpStatus.CREATED)`)**: Mapea `POST /api/expenses` y fuerza el retorno del código HTTP `201 Created` en lugar del 200 por defecto.
* **Línea 20 (`@CurrentUser() usuario: string`)**: Extrae el usuario del token.
* **Línea 21 (`@Body() body`)**: Extrae el cuerpo JSON enviado por el cliente.
* **Líneas 23-30**: Normalización defensiva de datos: asegura que el monto sea un número, que el tipo sea estrictamente `'Ingreso'` o `'Gasto'`, y que la fecha se almacene como objeto `Date` nativo.

---

### 9. `backend/src/modules/expense/services/expense.service.ts` — Lógica CRUD con Driver Nativo

Ubicación: [backend/src/modules/expense/services/expense.service.ts](file:///c:/Users/asm/Desktop/lvasquez-2025014--BIM4/backend/src/modules/expense/services/expense.service.ts)

```typescript
18:   private getCol(): Collection<Expense> {
19:     if (!this.collection) {
20:       this.collection = this.databaseService.getCollection<Expense>('expenses');
21:     }
22:     return this.collection;
23:   }
24: 
25:   async getAll(usuario: string): Promise<ExpenseDto[]> {
26:     const docs = await this.getCol().find({ usuario }).toArray();
27:     return docs.map(toDto);
28:   }
29: 
30:   async getById(id: string, usuario: string): Promise<ExpenseDto | null> {
31:     const doc = await this.getCol().findOne({ _id: id, usuario });
32:     return doc ? toDto(doc) : null;
33:   }
34: 
35:   async create(data: Omit<Expense, '_id'>): Promise<ExpenseDto> {
36:     const doc: Expense = {
37:       _id: crypto.randomUUID(),
38:       usuario: data.usuario,
39:       descripcion: data.descripcion,
40:       monto: data.monto,
41:       tipo: data.tipo,
42:       categoria: data.categoria,
43:       fecha: data.fecha,
44:     };
45:     await this.getCol().insertOne(doc);
46:     return toDto(doc);
47:   }
```

#### Desglose Línea por Línea:
* **Líneas 18-23 (`getCol()`)**: Patrón *Lazy Initialization*. Obtiene la colección `'expenses'` de MongoDB la primera vez que se requiere y la guarda en caché para evitar llamadas redundantes.
* **Línea 26 (`this.getCol().find({ usuario }).toArray()`)**: Consulta nativa a MongoDB. Utiliza el filtro `{ usuario }` para garantizar aislamiento por usuario a nivel de base de datos.
* **Línea 31 (`this.getCol().findOne({ _id: id, usuario })`)**: Busca un gasto por su ID **y** por el usuario. Si un usuario intenta consultar el ID de un gasto ajeno, MongoDB retorna `null` y el controlador arroja `404 Not Found`.
* **Línea 37 (`_id: crypto.randomUUID()`)**: Genera identificadores únicos universales (UUID v4) mediante el módulo criptográfico nativo de Node.js en lugar de depender de los `ObjectId` de 12 bytes de Mongo, facilitando la exportación y compatibilidad con bases de datos relacionales o JSON.
* **Línea 45 (`await this.getCol().insertOne(doc)`)**: Inserción asíncrona directa mediante el driver TCP sin intermediarios ORM.

---

# PARTE 2: FRONTEND (Angular 19 Standalone + Signals + SVG)

---

### 10. `frontend/src/app/app.routes.ts` — Enrutador con Lazy Loading

Ubicación: [frontend/src/app/app.routes.ts](file:///c:/Users/asm/Desktop/lvasquez-2025014--BIM4/frontend/src/app/app.routes.ts)

```typescript
export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/auth/pages/login-page/login-page.component').then(m => m.LoginPageComponent) },
  { path: 'gastos', canActivate: [authGuard], loadComponent: () => import('./features/transactions/pages/gastos-page/gastos-page.component').then(m => m.GastosPageComponent) },
  { path: 'ingresos', canActivate: [authGuard], loadComponent: () => import('./features/transactions/pages/ingresos-page/ingresos-page.component').then(m => m.IngresosPageComponent) },
  { path: 'presupuestos', canActivate: [authGuard], loadComponent: () => import('./features/transactions/pages/presupuestos-page/presupuestos-page.component').then(m => m.PresupuestosPageComponent) },
  { path: 'reportes', canActivate: [authGuard], loadComponent: () => import('./features/transactions/pages/reportes-page/reportes-page.component').then(m => m.ReportesPageComponent) },
  { path: 'usuarios', canActivate: [authGuard, adminGuard], loadComponent: () => import('./features/transactions/pages/usuarios-page/usuarios-page.component').then(m => m.UsuariosPageComponent) },
  { path: '', redirectTo: 'gastos', pathMatch: 'full' },
  { path: '**', redirectTo: 'gastos' }
];
```

#### Desglose Línea por Línea:
* **`loadComponent: () => import(...)`**: Implementa **Lazy Loading (Carga Perezosa)** a nivel de componente Standalone. El navegador no descarga el código de la página de reportes ni de usuarios al abrir el login; solo descarga los fragmentos JavaScript (*chunks*) cuando el usuario hace clic en esa ruta.
* **`canActivate: [authGuard]`**: Asocia el guardián de autenticación. Si el usuario no tiene token válido, la navegación se aborta.
* **`canActivate: [authGuard, adminGuard]` en `/usuarios`**: **Seguridad en capas**:
  1. Primero se ejecuta `authGuard`: ¿Está autenticado?
  2. Luego se ejecuta `adminGuard`: ¿Tiene rol de Administrador?
* **`{ path: '**', redirectTo: 'gastos' }`**: Comodín (*Wildcard*). Cualquier URL desconocida redirige al dashboard principal en lugar de mostrar una pantalla blanca.

---

### 11. `frontend/src/app/features/auth/guards/auth.guard.ts` — Guard Funcional de Sesión

Ubicación: [frontend/src/app/features/auth/guards/auth.guard.ts](file:///c:/Users/asm/Desktop/lvasquez-2025014--BIM4/frontend/src/app/features/auth/guards/auth.guard.ts)

```typescript
1: import { inject } from '@angular/core';
2: import { CanActivateFn, Router } from '@angular/router';
3: import { AuthService } from '../services/auth.service';
4: 
5: export const authGuard: CanActivateFn = () => {
6:   const auth = inject(AuthService);
7:   const router = inject(Router);
8: 
9:   if (auth.estaAutenticado() && !auth.isSessionExpired()) {
10:     return true;
11:   }
12:   return router.createUrlTree(['/login']);
13: };
```

#### Desglose Línea por Línea:
* **Línea 2 (`CanActivateFn`)**: Tipo de TypeScript de Angular que define una función guardiana pura en lugar de una clase.
* **Líneas 6-7 (`inject(...)`)**: Nueva API de Inyección de Dependencias funcional de Angular. Permite resolver servicios dentro de funciones sin constructores.
* **Línea 9**: Evalúa dos condiciones: que exista un token guardado (`estaAutenticado()`) y que su timestamp de expiración no haya pasado (`!isSessionExpired()`).
* **Línea 10 (`return true;`)**: Permite que la ruta se cargue.
* **Línea 12 (`return router.createUrlTree(['/login']);`)**: Devuelve un árbol de navegación `UrlTree`. Esto cancela inmediatamente la ruta solicitada y realiza una redirección atómica a `/login` sin efectos colaterales.

---

### 12. `frontend/src/app/features/auth/guards/admin.guard.ts` — Guard Funcional de Administrador

Ubicación: [frontend/src/app/features/auth/guards/admin.guard.ts](file:///c:/Users/asm/Desktop/lvasquez-2025014--BIM4/frontend/src/app/features/auth/guards/admin.guard.ts)

```typescript
6: export const adminGuard: CanActivateFn = () => {
7:   const auth = inject(AuthService);
8:   const router = inject(Router);
9:   const notification = inject(NotificationService);
10: 
11:   if (!auth.estaAutenticado() || auth.isSessionExpired()) {
12:     return router.createUrlTree(['/login']);
13:   }
14: 
15:   if (auth.isAdmin()) {
16:     return true;
17:   }
18: 
19:   notification.show({
20:     type: 'error',
21:     message: 'Acceso denegado: Esta sección requiere rol de Administrador.'
22:   });
23: 
24:   return router.createUrlTree(['/gastos']);
25: };
```

#### Desglose Línea por Línea:
* **Línea 9**: Inyecta el `NotificationService` para avisar visualmente al usuario.
* **Líneas 11-13**: Si no está autenticado, lo manda a `/login`.
* **Líneas 15-17 (`if (auth.isAdmin()) return true;`)**: Comprueba el rol decodificado del JWT. Si es `'admin'`, concede el acceso.
* **Líneas 19-22**: Si un usuario con rol `'client'` intenta forzar la URL `/usuarios`, se dispara un toast flotante de error.
* **Línea 24**: Redirige al cliente a su panel seguro en `/gastos`.

---

### 13. `frontend/src/app/core/services/api.service.ts` — Cliente HTTP e Inyección de Token

Ubicación: [frontend/src/app/core/services/api.service.ts](file:///c:/Users/asm/Desktop/lvasquez-2025014--BIM4/frontend/src/app/core/services/api.service.ts)

```typescript
22:   private getHeaders(): HttpHeaders {
23:     const token = this.authService.getToken();
24:     let headers = new HttpHeaders({
25:       'Content-Type': 'application/json',
26:     });
27:     if (token) {
28:       headers = headers.set('Authorization', `Bearer ${token}`);
29:     }
30:     return headers;
31:   }
```

#### Desglose Línea por Línea:
* **Línea 23**: Lee el token de sesión actual almacenado en el navegador.
* **Líneas 24-26**: Crea una instancia inmutable de `HttpHeaders` con el tipo de contenido JSON.
* **Línea 28 (`headers = headers.set('Authorization', Bearer ${token})`)**: Inyecta el encabezado `Authorization`. Como `HttpHeaders` es inmutable en Angular, el método `.set()` retorna una nueva instancia con el encabezado agregado.
* **Línea 30**: Retorna los encabezados listos para usarse en llamadas `httpClient.get()`, `post()`, etc.

---

### 14. `frontend/src/app/core/utils/export.utils.ts` — Motor de Exportación Excel (UTF-8 BOM)

Ubicación: [frontend/src/app/core/utils/export.utils.ts](file:///c:/Users/asm/Desktop/lvasquez-2025014--BIM4/frontend/src/app/core/utils/export.utils.ts)

```typescript
18: export function exportToCsv(options: ExportCsvOptions): void {
19:   const { filename, headers, rows, delimiter = ';' } = options;
20: 
21:   const escapeCell = (val: string | number | undefined | null): string => {
22:     if (val === null || val === undefined) return '';
23:     const str = String(val);
24:     if (str.includes(delimiter) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
25:       return `"${str.replace(/"/g, '""')}"`;
26:     }
27:     return str;
28:   };
29: 
30:   const headerLine = headers.map(escapeCell).join(delimiter);
31:   const dataLines = rows.map(r => r.map(escapeCell).join(delimiter));
32:   const csvBody = [headerLine, ...dataLines].join('\r\n');
33: 
34:   // \uFEFF es el Byte Order Mark (BOM) UTF-8 que le indica a Excel
35:   // que el archivo está codificado en UTF-8 y no en ANSI (Windows-1252).
36:   const blob = new Blob(['\uFEFF' + csvBody], {
37:     type: 'text/csv;charset=utf-8;'
38:   });
39: 
40:   const url = URL.createObjectURL(blob);
41:   const link = document.createElement('a');
42:   link.setAttribute('href', url);
43:   link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
44:   document.body.appendChild(link);
45:   link.click();
46:   document.body.removeChild(link);
47:   URL.revokeObjectURL(url);
48: }
```

#### Desglose Línea por Línea:
* **Línea 19 (`delimiter = ';'`)**: En sistemas Windows en español (Guatemala y Latinoamérica), Excel usa `;` como separador de listas. Usar `,` amontonaría todos los datos en la primera columna.
* **Líneas 21-28 (`escapeCell`)**: Algoritmo de escape RFC 4180: si una celda contiene comillas, saltos de línea o el delimitador, se envuelve en comillas dobles y las comillas internas se duplican (`""`).
* **Línea 32 (`.join('\r\n')`)**: Utiliza retornos de carro y salto de línea estándar CRLF (`\r\n`) requeridos por el parser de Windows Excel.
* **Línea 36 (`new Blob(['\uFEFF' + csvBody])`)**: **La clave del archivo**: Inyecta el **Byte Order Mark (BOM) UTF-8 (`\uFEFF`)** al inicio del binario. Sin este prefijo, Excel asume codificación ANSI y corrompe tildes (`Categoría` se vería como `CategorÃ­a`).
* **Líneas 40-47**: Crea una URL de objeto temporal en memoria (`URL.createObjectURL`), genera un elemento `<a>` invisible en el DOM, simula un clic para disparar la descarga en el navegador del usuario y revoca la URL (`URL.revokeObjectURL`) para evitar fugas de memoria RAM.

---

### 15. `frontend/src/app/core/utils/date.utils.ts` — Blindaje contra Desfase de Zona Horaria (UTC-6)

Ubicación: [frontend/src/app/core/utils/date.utils.ts](file:///c:/Users/asm/Desktop/lvasquez-2025014--BIM4/frontend/src/app/core/utils/date.utils.ts)

```typescript
11: export function parseLocalDate(input: string | Date | undefined | null): Date {
12:   if (!input) return new Date();
13:   if (input instanceof Date) return input;
14:   const str = String(input).trim();
15:   const datePart = str.includes('T') ? str.split('T')[0] : str;
16:   const parts = datePart.split('-');
17:   if (parts.length === 3) {
18:     const year = parseInt(parts[0], 10);
19:     const month = parseInt(parts[1], 10) - 1;
20:     const day = parseInt(parts[2], 10);
21:     if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
22:       return new Date(year, month, day, 12, 0, 0);
23:     }
24:   }
25:   const d = new Date(input);
26:   return isNaN(d.getTime()) ? new Date() : d;
27: }
```

#### Desglose Línea por Línea:
* **Líneas 14-16**: Descompone la fecha aislando la parte de año, mes y día, ignorando componentes de hora UTC que vengan en formato ISO (`2026-09-07T00:00:00.000Z`).
* **Línea 19 (`month = parseInt(parts[1], 10) - 1`)**: En JavaScript, los meses en el objeto `Date` van de 0 a 11 (enero = 0, septiembre = 8). Restar 1 al mes numérico es mandatorio.
* **Línea 22 (`new Date(year, month, day, 12, 0, 0)`)**: **La solución arquitectónica**: Construye la fecha fijando la hora a las **12:00:00 (mediodía en la hora local del usuario)**.
  * *¿Por qué funciona?*: En Guatemala (UTC-6), si una fecha se crea a las `00:00:00` UTC, el navegador resta 6 horas y muestra las `18:00` del día anterior (-1 día). Al fijarla a las 12:00:00 local, cualquier conversión o redondeo horario queda siempre dentro del mismo día calendario.

---

### 16. `frontend/src/app/features/transactions/components/candlestick-chart/candlestick-chart.component.ts` — Gráfica SVG Nativa y Cruce por Cero

Ubicación: [frontend/src/app/features/transactions/components/candlestick-chart/candlestick-chart.component.ts](file:///c:/Users/asm/Desktop/lvasquez-2025014--BIM4/frontend/src/app/features/transactions/components/candlestick-chart/candlestick-chart.component.ts)

```typescript
87:     // Calcular saldo acumulado para una línea continua
88:     const cumulative: number[] = [];
89:     let acc = 0;
90:     for (const v of net) {
91:       acc += (v || 0);
92:       cumulative.push(acc);
93:     }
...
109:     const zeroY = y(0);
110:     const zeroRatio = Math.max(0, Math.min(1, (0 - min) / range));
111:     const zeroPercent = Math.max(0, Math.min(100, (1 - zeroRatio) * 100));
...
123:         <linearGradient id="${lineGradId}" x1="0" y1="0" x2="0" y2="1">
124:           <stop offset="0%" stop-color="#10b981"/>
125:           <stop offset="${Math.max(0, zeroPercent - 0.5).toFixed(1)}%" stop-color="#10b981"/>
126:           <stop offset="${Math.min(100, zeroPercent + 0.5).toFixed(1)}%" stop-color="#f43f5e"/>
127:           <stop offset="100%" stop-color="#f43f5e"/>
128:         </linearGradient>
...
163:     const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
164:     const areaPath = pathD + ` L${points[points.length - 1].x.toFixed(2)},${zeroY.toFixed(2)} L${points[0].x.toFixed(2)},${zeroY.toFixed(2)} Z`;
165:     svg += `<path d="${areaPath}" fill="url(#${areaGradId})"/>`;
168:     svg += `<path d="${pathD}" fill="none" stroke="url(#${lineGradId})" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" filter="url(#${glowId})"/>`;
```

#### Desglose Línea por Línea:
* **Líneas 87-93 (`cumulative`)**: Suma prefija acumulativa. Cada día acumula el resultado de los días anteriores: $\text{Saldo}_i = \text{Saldo}_{i-1} + \text{Neto}_i$. Si ayer se gastaron Q5 y hoy se ganaron Q10, el balance pasa de -5 a 0 y termina en +5.
* **Líneas 109-111 (`zeroRatio` y `zeroPercent`)**:
  * `zeroRatio`: Porcentaje proporcional donde se ubica el cero en el eje Y relativo al rango `[min, max]`.
  * `zeroPercent`: Porcentaje en el degradado SVG (0% es arriba, 100% es abajo).
* **Líneas 123-128 (`<linearGradient>`)**: Genera un degradado vectorial dinámico:
  * Desde el 0% hasta `zeroPercent`: Color verde esmeralda (`#10b981`, superávit).
  * Desde `zeroPercent` hasta el 100%: Color rojo carmesí (`#f43f5e`, déficit).
* **Líneas 163-165 (`pathD` y `areaPath`)**:
  * `pathD`: Traza el comando vectorial SVG (`M x,y L x,y ...`) conectando todos los puntos.
  * `areaPath`: Cierra el polígono hacia la línea horizontal del cero (`zeroY`) y aplica el degradado semitransparente.
* **Línea 168**: Renderiza la línea con filtro de resplandor (*glow filter* de SVG) y trazo bicolor.

---

### 17. `frontend/src/app/core/services/currency.service.ts` — Conversor Multi-Divisa Reactivo

Ubicación: [frontend/src/app/core/services/currency.service.ts](file:///c:/Users/asm/Desktop/lvasquez-2025014--BIM4/frontend/src/app/core/services/currency.service.ts)

```typescript
16: export class CurrencyService {
17:   readonly code = signal<CurrencyCode>('GTQ');
18: 
19:   private readonly rates: Record<CurrencyCode, number> = {
20:     GTQ: 1.0,
21:     USD: 0.13,
22:     EUR: 0.12
23:   };
...
32:   convert(amountInGtq: number, targetCurrency: CurrencyCode = this.code()): number {
33:     const rate = this.rates[targetCurrency] ?? 1.0;
34:     return Number((amountInGtq * rate).toFixed(2));
35:   }
```

#### Desglose Línea por Línea:
* **Línea 17 (`readonly code = signal<CurrencyCode>('GTQ')`)**: Estado reactivo con **Angular Signals**. Almacena la divisa activa. Cuando este valor cambia mediante `.set('USD')`, todas las funciones `computed()` y plantillas suscritas en el frontend se recalculan de inmediato sin tocar el DOM manualmente.
* **Líneas 19-23**: Tasas de conversión fijadas respecto a la moneda base Quetzales (GTQ).
* **Líneas 32-35 (`convert`)**: Multiplica el valor almacenado en base de datos (siempre en GTQ) por la tasa de cambio seleccionada y redondea a 2 decimales para evitar problemas de coma flotante IEEE 754.

---

## 🎓 RESUMEN EJECUTIVO PARA LA PRESENTACIÓN

Si tienes que resumir la arquitectura en 4 oraciones clave durante tu defensa:

1. **Modularidad**: *"El backend está organizado en módulos de dominio de NestJS, separando estrictamente autenticación, gastos, presupuestos y base de datos con inyección de dependencias."*
2. **Seguridad Robusta**: *"Implementé una defensa en profundidad: `authGuard` y `adminGuard` en Angular, `JwtAuthGuard` y `RolesGuard` en NestJS, validación con Google OAuth2 y contraseñas hasheadas con bcrypt."*
3. **Alto Rendimiento**: *"Elegí el driver nativo de MongoDB en un servicio Singleton para evitar la sobrecarga de Mongoose, logrando consultas sub-milisegundo y aislamiento estricto por usuario."*
4. **Experiencia Reactiva**: *"En el frontend utilicé Angular 19 Standalone y Signals, calculando saldos acumulados y renderizando gráficas SVG nativas con cruce por cero y exportación a Excel con UTF-8 BOM."*
