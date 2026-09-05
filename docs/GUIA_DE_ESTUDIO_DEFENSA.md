# GUÍA MAESTRA DE ESTUDIO Y DEFENSA DEL PROYECTO
## VOUGHT INTERNATIONAL — SISTEMA DE GESTIÓN Y AUDITORÍA DE GASTOS CORPORATIVOS

> **Propósito de esta guía**: Dotarte de argumentos técnicos profundos, dominio conceptual absoluto y respuestas precisas ante evaluadores, catedráticos o jurado calificador. Aquí se detallan los principios de ingeniería de software, arquitectura de sistemas y patrones de diseño implementados en el proyecto.

---

## 🗺️ 1. DIAGRAMAS INTERACTIVOS DISPONIBLES (ARCHIFY)

El sistema cuenta con dos diagramas interactivos autónomos en formato HTML compilados con **Archify** (100% en español):

1. **[arquitectura-vought.html](file:///c:/Users/asm/Desktop/lvasquez-2025014--BIM4/docs/diagramas/arquitectura-vought.html)**:
   * **Mapa de Arquitectura General**: Muestra la división en capas (Cliente Angular 19 SPA, Servidor Modular NestJS, Capa de Seguridad Passport/RBAC y Persistencia NoSQL MongoDB).
   * **Vistas guiadas**: Flujo completo, capa de seguridad y persistencia/exportación.
2. **[flujo-seguridad.html](file:///c:/Users/asm/Desktop/lvasquez-2025014--BIM4/docs/diagramas/flujo-seguridad.html)**:
   * **Diagrama de Secuencia y Ciclo de Vida**: Traza el ciclo completo de una petición desde la acción del usuario, la inyección del token Bearer por el interceptor, la validación en el guardián, la persistencia en MongoDB y la reactivación visual en menos de 16 ms.
3. **[ciclo-vida-nestjs.html](file:///c:/Users/asm/Desktop/lvasquez-2025014--BIM4/docs/diagramas/ciclo-vida-nestjs.html)**:
   * **Ciclo de Vida de NestJS (Request Lifecycle)**: Muestra el orden secuencial estricto en el backend: *Cliente HTTP ➔ Middlewares (CORS) ➔ Guards (Auth/Roles) ➔ Interceptors (Pre-logging) ➔ Pipes (Validación DTO) ➔ Controlador (@CurrentUser) ➔ Servicio (Lógica) ➔ Interceptors (Post-formateo) ➔ Cliente*.

> 💡 **Tip para la presentación**: Puedes proyectar estos archivos en cualquier navegador. Presiona la tecla **`F`** para entrar en Modo Presentación (pantalla completa), **`S`** para cambiar estilos visuales (Clásico, Flujo de Señales, Plano Técnico) y **`T`** para alternar temas claro/oscuro.

---

## 🎯 2. EL ELEVATOR PITCH (Cómo describir tu proyecto en 30 segundos)

> *"Vought Control de Gastos es una plataforma empresarial full-stack para la auditoría, control de presupuestos y gestión financiera en tiempo real. Fue construida con una **arquitectura desacoplada y orientada a capas**: un frontend reactivo en **Angular 19 Standalone con Signals y gráficas SVG nativas**, un backend modular y seguro en **NestJS con TypeScript**, autenticación híbrida con **JWT y Google OAuth 2.0**, control de acceso basado en roles (**RBAC**), y persistencia optimizada en **MongoDB mediante driver nativo** para garantizar transacciones de baja latencia sin sobrecarga de ORM."*

---

## 🔄 3. EL CICLO DE VIDA DE UNA PETICIÓN (REQUEST LIFECYCLE EN NESTJS)

Una de las preguntas más comunes en defensas de arquitectura es: **"¿Cuál es el orden exacto en el que se procesa una petición desde que llega al servidor hasta que responde?"**

### Diagrama de Flujo del Ciclo de Vida:
```text
[ Cliente HTTP ]
       │  (Petición con Encabezado Authorization: Bearer <token>)
       ▼
1. [ MIDDLEWARES ] ────────► CORS, Helmet, bodyParser, compresión gzip
       │
       ▼
2. [ GUARDS ] ─────────────► Autenticación (JwtAuthGuard) y Autorización (RolesGuard)
       │                    ¿Tiene permiso? NO ➔ 401 Unauthorized / 403 Forbidden
       ▼
3. [ INTERCEPTORS (Pre) ] ─► Logging, auditoría, cronometraje de inicio de ejecución
       │
       ▼
4. [ PIPES ] ──────────────► Transformación (ParseInt) y Validación DTO (class-validator)
       │                    ¿Datos válidos? NO ➔ 400 Bad Request
       ▼
5. [ CONTROLADOR ] ────────► Mapeo de ruta (@Get, @Post), extracción de datos (@CurrentUser, @Body)
       │
       ▼
6. [ SERVICIO ] ───────────► Lógica de negocio (cálculo de balances, deducción de presupuestos)
       │
       ▼
7. [ BASE DE DATOS ] ──────► Consultas directas MongoDB (DatabaseService TCP Driver)
       │
       ▼
8. [ INTERCEPTORS (Post) ] ─► Transformación de respuesta, serialización, cálculo de tiempo total
       │
       ▼
9. [ EXCEPTION FILTERS ] ──► (Solo si ocurre error): Formateo homogéneo de respuestas HTTP
       │
       ▼
[ Respuesta HTTP (JSON) al Cliente ]
```

> [!IMPORTANT]
> **¿Por qué este orden es arquitectónicamente superior?**  
> Porque aplica el **Principio de Falla Rápida (Fail-Fast)**:
> 1. Si el cliente no está autenticado, el **Guard** lo rechaza de inmediato (401/403).
> 2. No se desperdicia CPU procesando ni validando los datos del cuerpo con **Pipes** si la petición no tiene permisos para acceder al endpoint.

---

## 🛡️ 4. FUNDAMENTOS Y TEORÍA DEL FRAMEWORK: GUARDS, DECORATORS, PIPES E INTERCEPTORS

Aquí tienes la explicación conceptual formal y cómo se aplicó cada uno en el código del proyecto:

---

### A. GUARDS (Guardianes de Seguridad)

#### 1. ¿Qué es un Guard en teoría?
Un Guard es un componente que implementa el patrón de diseño **Chain of Responsibility** / **Gatekeeper**. Su única responsabilidad es determinar si una petición entrante debe ser manejada por la ruta de destino o ser rechazada, basándose en condiciones de permisos, tokens de sesión o roles.

#### 2. Guards en NestJS (`CanActivate`)
En NestJS, un Guard implementa la interfaz `CanActivate` y define el método:
```typescript
canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean>
```
* **`ExecutionContext`**: Proporciona acceso contextual al objeto de la petición (`context.switchToHttp().getRequest()`), siendo agnóstico al protocolo (HTTP, WebSockets o Microservicios RPC).
* Si retorna `true`, la petición continúa su ciclo. Si retorna `false` o lanza una excepción, NestJS detiene el flujo y responde con `401 Unauthorized` o `403 Forbidden`.

**Implementación en nuestro backend:**
* **`JwtAuthGuard`** ([backend/src/core/guards/jwt-auth.guard.ts](file:///c:/Users/asm/Desktop/lvasquez-2025014--BIM4/backend/src/core/guards/jwt-auth.guard.ts)):
  1. Extrae el encabezado `Authorization: Bearer <token>`.
  2. Verifica la firma criptográfica usando `jwt.verify(token, process.env.JWT_SECRET)`.
  3. Comprueba que el token contenga un identificador de usuario válido.
  4. Inyecta el usuario decodificado en `request.usuario` y `request.user` para que esté disponible en los controladores.
* **`RolesGuard`** ([backend/src/core/guards/roles.guard.ts](file:///c:/Users/asm/Desktop/lvasquez-2025014--BIM4/backend/src/core/guards/roles.guard.ts)):
  1. Extrae el rol del usuario inyectado por el guard de JWT.
  2. Verifica que el rol sea `'admin'`. Si no lo es, lanza una `ForbiddenException('Acceso denegado: Se requiere rol de Administrador')`.

#### 3. Guards en Angular 19 (`CanActivateFn`)
En Angular 19 se utilizan **Guards Funcionales** en lugar de clases legadas con `@Injectable()`. Utilizan la función `inject()` para resolver dependencias:
* **`authGuard`** ([frontend/src/app/features/auth/guards/auth.guard.ts](file:///c:/Users/asm/Desktop/lvasquez-2025014--BIM4/frontend/src/app/features/auth/guards/auth.guard.ts)):
  * Evalúa `authService.estaAutenticado()` y si la sesión ha expirado.
  * Si es válido, retorna `true`.
  * Si no es válido, retorna un **`UrlTree`** (`router.createUrlTree(['/login'])`).
  * *Ventaja del `UrlTree`*: Cancela la navegación actual y redirige atómicamente sin parpadeos ni ejecuciones residuales de componentes.
* **`adminGuard`** ([frontend/src/app/features/auth/guards/admin.guard.ts](file:///c:/Users/asm/Desktop/lvasquez-2025014--BIM4/frontend/src/app/features/auth/guards/admin.guard.ts)):
  * Protege la ruta `/usuarios`. Si un usuario con rol `'client'` intenta forzar la URL, dispara una alerta mediante `NotificationService` y lo redirige a `/gastos`.

---

### B. DECORATORS (Decoradores y Metaprogramación)

#### 1. ¿Qué es un Decorador en teoría?
Un decorador es una expresión que evalúa una **función de orden superior (Higher-Order Function)** que se aplica a una clase, método, propiedad o parámetro en tiempo de diseño o definición. Permite extender o modificar el comportamiento de la entidad sin alterar su código fuente, aplicando el principio de **Abierto/Cerrado (Open/Closed Principle)**.

#### 2. Mecánica Interna (¿Cómo funcionan por dentro?)
1. TypeScript compila los decoradores a llamadas de funciones envoltura.
2. Utiliza la biblioteca **`reflect-metadata`** para adjuntar metadatos invisibles a la clase o método (`Reflect.defineMetadata`).
3. Cuando la aplicación arranca, el contenedor de inversión de control (IoC) de NestJS inspecciona esos metadatos para armar el mapa de rutas y las reglas de inyección.

#### 3. Decoradores utilizados en el Proyecto:

| Tipo | Decorador | Propósito y Ubicación |
| :--- | :--- | :--- |
| **Clase** | `@Controller('api/expenses')` | Declara la clase como controlador REST y define el prefijo de ruta base. |
| **Clase** | `@Injectable()` | Le indica al contenedor IoC que la clase es un proveedor que puede ser inyectado. |
| **Clase** | `@Module()` | Agrupa controladores, servicios y proveedores en un dominio cohesivo. |
| **Clase (Angular)** | `@Component({ standalone: true })` | Define un componente independiente de Angular con su template, estilos y dependencias. |
| **Método** | `@Get()`, `@Post()`, `@Put()`, `@Delete()` | Mapean el verbo HTTP a una función específica del controlador. |
| **Método** | `@HttpCode(HttpStatus.CREATED)` | Define el código de estado HTTP explícito que retornará el endpoint (201 Created). |
| **Método** | `@UseGuards(JwtAuthGuard)` | Asocia uno o más guardianes al endpoint o a toda la clase. |
| **Parámetro** | `@Body()`, `@Param('id')`, `@Query()` | Extraen segmentos específicos de la petición HTTP (cuerpo, parámetros de ruta, query strings). |
| **Personalizado** | **`@CurrentUser()`** | **Decorador personalizado propio** creado con `createParamDecorator`. |

#### 4. Nuestro Decorador Personalizado: `@CurrentUser()`
Ubicación: [backend/src/core/decorators/current-user.decorator.ts](file:///c:/Users/asm/Desktop/lvasquez-2025014--BIM4/backend/src/core/decorators/current-user.decorator.ts)
```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.usuario;
  },
);
```
> [!TIP]
> **¿Por qué es una buena práctica crear `@CurrentUser()`?**  
> Porque **desacopla el controlador del objeto `Request` de Express**. En lugar de recibir todo el objeto `req` y hacer `req.usuario` manualmente, el controlador solo recibe un string limpio con el usuario. Si mañana NestJS cambia de Express a Fastify, los controladores no sufren cambios.

---

### C. PIPES (Tuberías de Transformación y Validación)

#### 1. ¿Qué es un Pipe en teoría?
Un Pipe implementa el patrón arquitectónico **Pipes and Filters**. Es una función intermedia que procesa los argumentos de entrada antes de que el método del controlador sea ejecutado.

#### 2. Los dos propósitos de los Pipes:
1. **Transformación**: Convierte datos de entrada a la forma requerida.
   * *Ejemplo*: Una URL envía `'123'` (string); un pipe como `ParseIntPipe` lo transforma al tipo primitivo `123` (number).
2. **Validación**: Evalúa los datos entrantes contra reglas predefinidas. Si los datos son válidos, los deja pasar intactos; si no lo son, interrumpe el ciclo y lanza inmediatamente un error HTTP 400 (`BadRequestException`).

#### 3. DTOs (Data Transfer Objects) vs Interfaces
* **¿Por qué usamos DTOs basados en clases (`class`) y no interfaces (`interface`)?**
  * Las **interfaces** de TypeScript son borradas por el compilador durante la transpilación a JavaScript (**Type Erasure**). No existen en tiempo de ejecución.
  * Las **clases DTO**, en cambio, existen en tiempo de ejecución. Esto permite que librerías como `class-validator` inspeccionen las propiedades mediante decoradores (`@IsNotEmpty()`, `@IsNumber()`, `@Min(0.01)`).

#### 4. Pipes en Angular:
En el frontend, los Pipes se usan en las plantillas HTML para formatear la presentación sin modificar los datos del modelo:
* `{{ gasto.monto | currency:'GTQ':'symbol':'1.2-2' }}`: Formatea montos en moneda local.
* `{{ gasto.fecha | date:'dd/MM/yyyy' }}`: Formatea fechas para lectura de usuario.
* **Pipes Puros vs Impuros**: Un Pipe puro solo se recalcula si cambia la referencia de su entrada primitiva, optimizando la detección de cambios de Angular.

---

### D. INTERCEPTORS (Interceptores y Programación Orientada a Aspectos - AOP)

#### 1. ¿Qué es un Interceptor en teoría?
Un Interceptor permite interceptar la ejecución de una llamada tanto **antes** de que sea procesada como **después** de que genere una respuesta. Se basa en los principios de la **Programación Orientada a Aspectos (AOP)** para modularizar tareas transversales (*cross-cutting concerns*).

#### 2. Casos de uso de Interceptores:
* **Logging y Auditoría**: Medir el tiempo de ejecución exacto de cada endpoint (`console.log('Took: ' + (Date.now() - start) + 'ms')`).
* **Transformación de Respuestas**: Envolver todas las respuestas en un formato corporativo estándar:
  ```json
  { "success": true, "statusCode": 200, "data": { ... }, "timestamp": "2026-09-07T21:00:00Z" }
  ```
* **Manejo Global de Excepciones**: Atrapar errores HTTP y transformarlos en códigos de dominio específicos.

#### 3. Interceptores en Angular (`HttpInterceptorFn`):
* En nuestro frontend, cada petición saliente pasa por el interceptor HTTP que:
  1. Lee el token JWT guardado en `localStorage` / `sessionStorage`.
  2. Clona la petición original (ya que `HttpRequest` es inmutable en Angular).
  3. Agrega el encabezado: `Authorization: Bearer <token>`.
  4. Si el servidor responde con un error `401 Unauthorized` (token expirado), borra la sesión y redirige automáticamente al usuario al `/login`.

---

### E. MIDDLEWARES Y EXCEPTION FILTERS

#### 1. Middleware:
* Opera en el nivel más bajo del servidor (capa de Express/Fastify).
* Se ejecuta **antes** de que la petición entre al router de NestJS o a los Guards.
* En nuestro proyecto, configuramos middlewares esenciales en [backend/src/main.ts](file:///c:/Users/asm/Desktop/lvasquez-2025014--BIM4/backend/src/main.ts):
  * **CORS Middleware** (`app.enableCors()`): Permite que el frontend en el puerto `:4200` consuma el backend en el puerto `:3000`, habilitando los verbos REST y los encabezados `Content-Type` y `Authorization`.

#### 2. Exception Filters:
* Atrapan cualquier excepción no controlada que ocurra en controladores, servicios, pipes o guards.
* Convierten el error en una respuesta JSON estandarizada, evitando que el proceso de Node.js se caiga y ocultando información interna sensible (*stack traces*) a posibles atacantes.

---

### F. INVERSIÓN DE CONTROL (IoC) E INYECCIÓN DE DEPENDENCIAS (DI)

#### 1. Principio de Inversión de Dependencias (SOLID):
Los módulos de alto nivel no deben depender de módulos de bajo nivel; ambos deben depender de abstracciones.

#### 2. ¿Cómo funciona en el proyecto?
En lugar de que `ExpenseController` haga:
```typescript
// ❌ ACOPLAMIENTO FUERTE (Sin DI):
const servicio = new ExpenseService();
```
El controlador declara su necesidad en el constructor:
```typescript
// ✅ INYECCIÓN DE DEPENDENCIAS (Con IoC):
constructor(@Inject(ExpenseService) private readonly expenseService: ExpenseService) {}
```
El contenedor de NestJS se encarga de crear la instancia de `ExpenseService`, resolver sus dependencias internas (como `DatabaseService`), y pasar la misma instancia en memoria (**Singleton Scope**).

#### 3. Beneficios inmediatos:
1. **Desacoplamiento**: Se puede sustituir una implementación por otra sin tocar el controlador.
2. **Facilidad de Pruebas**: En pruebas unitarias, se puede inyectar un servicio simulado (*Mock*) sin conectarse a la base de datos real.
3. **Optimización de Recursos**: Una sola conexión a MongoDB sirve a toda la aplicación en lugar de abrir miles de conexiones en cada petición.

---

## 📊 5. TABLA COMPARATIVA: GUARDS vs MIDDLEWARES vs INTERCEPTORS vs PIPES

Esta tabla es ideal para resumir conceptos si el jurado te pide comparar componentes:

| Componente | Momento de Ejecución | ¿Tiene acceso a `ExecutionContext`? | Propósito Principal | Ejemplo en el Proyecto |
| :--- | :--- | :---: | :--- | :--- |
| **Middleware** | Antes de los Guards (Nivel Express) | No (acceso a `req`, `res`, `next`) | Manipulación de bajo nivel (CORS, headers, compresión, logging crudo). | `app.enableCors()` |
| **Guard** | Después de Middlewares, antes de Interceptors | **Sí** | Autenticación y Autorización (decidir si la petición pasa o se rechaza). | `JwtAuthGuard`, `RolesGuard` |
| **Interceptor (Pre)** | Después de Guards, antes de Pipes | **Sí** | Iniciar cronómetros, auditoría, mutar peticiones antes del controlador. | Registro de tiempo de respuesta |
| **Pipe** | Justo antes de ejecutar el método del controlador | No (opera sobre el argumento) | Transformación y validación estricta de parámetros y cuerpos DTO. | Parseo de tipos y DTOs |
| **Interceptor (Post)** | Después de que el controlador retorna datos | **Sí** | Transformar el resultado, mapear datos, serializar o guardar en caché. | Envoltorio estándar JSON |
| **Exception Filter** | Cuando ocurre cualquier error no controlado | **Sí** | Formatear respuestas de error coherentes y registrar el fallo. | Filtro global de errores |

---

## ⚡ 6. ARQUITECTURA DEL FRONTEND: ANGULAR 19 STANDALONE + SIGNALS

Si te preguntan: **"¿Por qué Angular 19 y qué ventajas tiene frente a versiones anteriores?"**

### A. Standalone Components vs NgModules
* En Angular clásico (v2 a v13), cada componente requería estar declarado en un `NgModule`. Esto generaba acoplamiento innecesario, archivos de configuración gigantescos y módulos compartidos sobrecargados (*SharedModule*).
* **Angular 19 Standalone**: Cada componente declara directamente sus propias dependencias en el arreglo `imports: [...]`.
* **Ventajas**:
  * **Tree-shaking superior**: El compilador solo empaqueta el código que realmente se utiliza, reduciendo el peso de la aplicación a ~359 kB.
  * **Carga diferida precisa (Lazy Loading)**: Se pueden cargar rutas o componentes individuales bajo demanda.

### B. Angular Signals vs RxJS
* **¿Qué es un Signal?**  
  Un Signal (`signal(valor)`) es una envoltura reactiva alrededor de un valor que notifica a los consumidores interesados cuando cambia.
* **Granularidad Fina**:
  * Con RxJS tradicional y `zone.js`, cuando ocurría un evento, Angular recorría todo el árbol de componentes buscando qué cambió (*Dirty Checking*).
  * Con **Signals**, Angular sabe exactamente qué nodo del DOM o qué función computada (`computed()`) depende de ese valor específico, actualizando únicamente ese elemento en el navegador sin re-evaluar toda la página.
* **Funciones utilizadas en el proyecto**:
  * `signal()`: Almacena estados mutables (ej: lista de gastos, moneda seleccionada, usuario activo).
  * `computed()`: Valores calculados de forma reactiva y memorizada (ej: suma de gastos, balance total, coordenadas de la gráfica SVG).
  * `effect()`: Efectos secundarios que reaccionan a cambios de señales (ej: guardar la moneda seleccionada en `localStorage`).

---

## 📈 7. MOTOR MATEMÁTICO: GRÁFICAS SVG NATIVAS Y CRUCE POR CERO

Si te preguntan: **"¿Por qué hiciste tus propias gráficas en SVG en lugar de usar Chart.js?"**

### A. El Desafío Financiero del Saldo Acumulado
Un balance financiero no puede representarse con barras estáticas independientes. El saldo real es acumulativo a lo largo del tiempo:
$$\text{Saldo}_i = \text{Saldo}_{i-1} + (\text{Ingreso}_i - \text{Gasto}_i)$$

### B. El Algoritmo de Cruce por Cero y Curva Bicolor
1. **Detección del Punto Cero**:
   Se calcula la posición vertical exacta donde el valor financiero es $0$:
   $$\text{zeroRatio} = \frac{0 - \text{minValor}}{\text{maxValor} - \text{minValor}}, \quad \text{zeroPercent} = (1 - \text{zeroRatio}) \times 100$$
2. **Degradado SVG Condicional**:
   * Cuando el saldo acumulado está por debajo de cero (déficit), el área bajo la curva se colorea en **rojo carmesí (`#f43f5e`)**.
   * Cuando el saldo cruza hacia valores positivos (superávit), el gradiente transiciona suavemente a **verde esmeralda (`#10b981`)**.
3. **Cálculo de Curvas Bézier Cúbicas (`d="M ... C ..."`):**
   * En lugar de líneas poligonales quebradas, el componente calcula puntos de control matemáticos para generar una curva continua y estética a 60 cuadros por segundo sin dependencias pesadas.

---

## 🛡️ 8. CIBERSEGURIDAD Y BLINDAJE DEL SISTEMA

Si te preguntan: **"¿Qué medidas de seguridad implementaste en el sistema?"**, responde con estos 6 pilares:

1. **Protección contra Inyección NoSQL**:
   * En MongoDB, un atacante puede intentar enviar `{ "$gt": "" }` en el cuerpo para saltarse contraseñas.
   * *Nuestra defensa*: Se valida que los campos sean strings estrictos y las contraseñas se comparan exclusivamente con `bcrypt.compare()`.
2. **Protección contra Mass Assignment (Asignación Masiva)**:
   * Si un atacante envía `{ "rol": "admin" }` en el cuerpo del registro o actualización, el backend lo ignora porque el `rol` nunca se toma del body del cliente, sino que se asigna estrictamente en el servidor.
3. **Protección contra Fuga de Datos Multiusuario**:
   * Todas las consultas a la base de datos fuerzan el parámetro `{ usuario }` extraído del token JWT validado criptográficamente. Ningún usuario puede acceder ni alterar transacciones de otro usuario.
4. **Almacenamiento Criptográfico de Contraseñas**:
   * Se utiliza **`bcrypt` con 10 rondas de salt**. Cada hash es único, resistente a ataques de tablas arcoíris (*rainbow tables*) y computacionalmente costoso para mitigar ataques de fuerza bruta.
5. **Autenticación con Google Criptográficamente Verificada**:
   * El backend no confía en un correo enviado en texto plano. Requiere el `idToken` firmado por Google y utiliza la librería oficial `google-auth-library` para verificar la firma contra los certificados públicos de Google.
6. **Tokens JWT con Expiración**:
   * Los tokens cuentan con expiración de 24 horas y firma basada en una clave secreta (`JWT_SECRET`) protegida en el archivo `.env`.

---

## ❓ 9. SIMULACRO DE DEFENSA: 10 PREGUNTAS TRAMPA Y RESPUESTAS MAESTRAS

### P1: "¿Cuál es la diferencia entre un Guard y un Middleware en NestJS?"
> **Respuesta**: *"Un Middleware opera a bajo nivel en la capa de Express; recibe los objetos crudos `req` y `res`, y se ejecuta antes del router de NestJS sin saber qué controlador o método específico atenderá la petición. Un Guard, en cambio, tiene acceso completo a `ExecutionContext`, lo que le permite inspeccionar los metadatos de la ruta que se va a ejecutar (por ejemplo, los roles requeridos mediante `@Roles()`), y decide si la petición tiene permiso de entrar o no."*

### P2: "¿Por qué los Guards se ejecutan antes que los Pipes?"
> **Respuesta**: *"Por eficiencia y seguridad, siguiendo el principio de Falla Rápida (*Fail-Fast*). Si un usuario no tiene autorización para consumir un recurso, es un desperdicio de recursos del servidor parsear y validar el cuerpo de la petición mediante Pipes. El Guard lo rechaza inmediatamente en el paso inicial con un error 401 o 403."*

### P3: "¿Por qué utilizaste clases DTO con validadores en lugar de interfaces de TypeScript?"
> **Respuesta**: *"Porque TypeScript sufre de borrado de tipos (*Type Erasure*): las interfaces desaparecen por completo al compilarse a JavaScript y no existen en tiempo de ejecución. Las clases DTO sí existen en tiempo de ejecución, lo que permite que los decoradores de validación inspeccionen los datos entrantes en el servidor y garanticen la integridad del payload antes de tocar la lógica de negocio."*

### P4: "¿Qué es la Inversión de Control (IoC) y cómo la implementaste?"
> **Respuesta**: *"La Inversión de Control es un principio arquitectónico donde el control de la creación y gestión de instancias se delega a un contenedor central en lugar de instanciarlas manualmente con `new`. En nuestro backend, NestJS gestiona el ciclo de vida de los servicios (`ExpenseService`, `DatabaseService`) y los inyecta en los constructores de los controladores como dependencias Singleton, promoviendo desacoplamiento y testeabilidad."*

### P5: "¿Cómo funciona el decorador personalizado `@CurrentUser()`?"
> **Respuesta**: *"Fue creado con la función `createParamDecorator` de NestJS. Accede al contexto HTTP (`ctx.switchToHttp().getRequest()`) y extrae la propiedad `request.usuario` que previamente inyectó el `JwtAuthGuard`. Su ventaja es que desacopla los controladores del objeto de petición crudo de Express, haciendo el código más limpio, tipado y mantenible."*

### P6: "¿Por qué no usaste Mongoose y preferiste el driver nativo de MongoDB?"
> **Respuesta**: *"Porque Mongoose añade una capa pesada de abstracción, casting de tipos y sobrecarga en memoria que no necesitábamos. Implementamos un servicio singleton `DatabaseService` que administra un pool de conexiones TCP nativo y rápido. Todas las consultas (`insertOne`, `find`, `updateOne`) son directas, ligeras y están tipadas fuertemente con TypeScript."*

### P7: "¿Cuál es la diferencia entre Signals y Observables (RxJS) en Angular 19?"
> **Respuesta**: *"RxJS está diseñado para flujos asíncronos complejos a lo largo del tiempo (eventos de red, websockets, debounce). Signals, en cambio, está diseñado para el estado reactivo síncrono del componente. Signals ofrece reactividad granular fina sin necesidad de desuscribirse manualmente (`unsubscribe`), eliminando fugas de memoria y evitando que Angular ejecute ciclos de detección de cambios masivos en todo el árbol de componentes."*

### P8: "¿Por qué tu exportación a CSV tiene un formato especial?"
> **Respuesta**: *"Porque Excel en Windows en español utiliza punto y coma (`;`) como separador de listas en lugar de coma, y abre los archivos en codificación ANSI por defecto. Nuestro archivo `export.utils.ts` inyecta el prefijo binario BOM UTF-8 (`\uFEFF`) para que Excel reconozca tildes y símbolos de moneda (`Q`, `€`), y utiliza `;` para que cada dato caiga en su columna automáticamente sin requerir el asistente de importación."*

### P9: "¿Cómo aseguras que un usuario regular no entre a la pantalla de gestión de usuarios?"
> **Respuesta**: *"La seguridad está blindada en ambos extremos (*Defense in Depth*): en el frontend, el `adminGuard` bloquea la navegación hacia la ruta `/usuarios` y redirige con un toast de acceso denegado si el usuario no es admin. En el backend, el endpoint `/api/users` está protegido con el `RolesGuard`, por lo que incluso si alguien intentara consultar la API directamente con Postman o cURL, el servidor retornará un error `403 Forbidden`."*

### P10: "¿Cómo evitaste el error de fechas que restaba un día en las gráficas?"
> **Respuesta**: *"En JavaScript, parsear fechas en formato ISO puro (`YYYY-MM-DD`) asume medianoche UTC (`00:00:00Z`). En la zona horaria de Guatemala (UTC-6), el navegador restaba 6 horas, mostrando el día anterior a las 18:00. Diseñamos la función `parseLocalDate()` en `date.utils.ts`, que descompone año, mes y día de forma local y fija la hora al mediodía local (`12:00:00`), garantizando que la fecha mostrada coincida siempre con el registro real."*

---

> 🚀 **Mensaje final para tu defensa**:  
> Conoce la arquitectura de memoria. Habla con términos técnicos: *Patrón Singleton*, *Inyección de Dependencias*, *Inversión de Control*, *Chain of Responsibility*, *Granularidad Reactiva*, *BOM UTF-8* y *Defense in Depth*. Tienes un sistema robusto, limpio y profesional. ¡Éxito en tu presentación!
