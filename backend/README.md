# Café 1583 — Backend + Panel Admin

Backend real (PostgreSQL + Prisma), panel de administración y API pública que **reemplaza** el
flujo de Excel del sitio original, manteniendo el JSON público 100% compatible con lo que hoy
consume `index.html` en la raíz del repo.

## Stack

- **Next.js 16 (App Router) + TypeScript** — un solo deploy sirve la API pública, la API admin y el panel.
- **PostgreSQL + Prisma ORM** (driver adapter `@prisma/adapter-pg`).
- **Cloudinary** — subida firmada, recorte en el cliente, borrado automático al reemplazar imágenes.
- **Auth propia**: JWT de acceso (15 min) + refresh token rotativo en cookie `httpOnly`/`secure`/`sameSite=strict`, bcrypt, 2FA TOTP opcional, rate limiting + bloqueo por cuenta, CSRF de doble-submit, headers de seguridad (CSP/HSTS/etc.).
- **Vercel** — hosting recomendado (gratis, zero-config para Next.js).

## 1. Configuración local

### Requisitos

- Node.js 20+
- Una base de datos PostgreSQL (local o [Neon](https://neon.tech), gratis)
- Una cuenta de Cloudinary

### Pasos

```bash
cd backend
npm install
cp .env.example .env
```

Completa `.env` (ver sección 2). Luego:

```bash
npm run prisma:migrate    # crea las tablas
npm run prisma:seed       # crea el admin con ADMIN_EMAIL / ADMIN_PASSWORD
npm run dev                # http://localhost:3000 -> redirige a /admin
```

Inicia sesión en `http://localhost:3000/admin/login` con las credenciales del seed.

## 2. Variables de entorno

Ver [.env.example](.env.example). Notas:

- `JWT_ACCESS_SECRET`: `openssl rand -base64 48`
- `TWO_FACTOR_ENC_KEY`: `openssl rand -base64 32` (debe tener al menos 32 caracteres)
- `PUBLIC_ORIGIN_ALLOWLIST`: dominios que pueden hacer `fetch()` a `/api/v1/menu` y
  `/api/v1/store-info` desde el navegador (GitHub Pages del sitio público + `localhost` en dev).

## 3. Migrar los datos del Excel existente

Una sola vez, contra la base de datos que vayas a usar (local primero para probar, luego producción):

```bash
npm run migrate:excel
```

Lee `../Cargue productos/Menu Web.xlsx` (misma carpeta que usa hoy `scripts/build-menu-data.js` en
la raíz del repo), crea las categorías y productos en el mismo orden del Excel, y si la columna
"Imagen" apunta a un archivo local en `images/productos/1583 menu/`, lo sube a Cloudinary
automáticamente. No se pierde ningún producto, precio ni imagen existente.

## 4. Despliegue en producción

### 4.1 Base de datos (Neon)

1. Crea una cuenta en [neon.tech](https://neon.tech) y un proyecto nuevo.
2. Copia el connection string (con `sslmode=require`) a `DATABASE_URL`.

### 4.2 Cloudinary

Copia **Cloud name**, **API Key** y **API Secret** desde tu Dashboard a las variables `CLOUDINARY_*`.

### 4.3 Hosting (Vercel)

1. Sube este repo a GitHub (ya lo está).
2. Importa el proyecto en [vercel.com/new](https://vercel.com/new) y en **Root Directory** selecciona
   `backend/` (así el deploy de GitHub Pages del sitio público, que sirve desde la raíz del repo, no
   se ve afectado).
3. Agrega todas las variables de la sección 2 en **Environment Variables**.
4. Despliega.
5. Desde tu máquina, con el `DATABASE_URL` de producción en `.env`:
   ```bash
   npm run prisma:deploy   # aplica las migraciones en produccion
   npm run prisma:seed     # crea el admin en produccion
   npm run migrate:excel   # migra los datos del Excel (una sola vez)
   ```
6. Confirma que `https://<tu-proyecto>.vercel.app/api/v1/menu` responde con el mismo shape que
   `data/menu-data.json` de la raíz del repo.

### 4.4 Conectar el sitio público (GitHub Pages)

En `index.html` (raíz del repo) se cambiaron las 3 llamadas `fetch('data/menu-data.json', ...)` para
apuntar primero a la API en vivo, con **fallback automático** al JSON local si el backend no
responde — ver la constante `MENU_API_URL` cerca del inicio del `<script>` en `index.html` y
actualízala con la URL real de tu despliegue en Vercel.

## 5. Seguridad implementada

- Contraseñas con `bcryptjs` (costo 12); no existe endpoint de registro público, solo `prisma:seed`.
- Access token JWT de 15 min enviado como `Authorization: Bearer`, nunca en cookie ni localStorage.
- Refresh token opaco, hasheado en DB, rotativo, en cookie `httpOnly`/`secure`/`sameSite=strict`;
  detección de reuso revoca toda la sesión.
- CSRF de doble-submit + verificación de `Origin` en `/auth/refresh` y `/auth/logout` (las demás
  mutaciones ya están protegidas por requerir el header `Authorization`, que un sitio cruzado no
  puede adjuntar).
- Rate limiting en memoria por IP + bloqueo durable por cuenta en DB (5 intentos / 15 min) en login.
- 2FA TOTP opcional, secreto cifrado en reposo (AES-256-GCM).
- Validación de entrada con Zod en todos los endpoints admin.
- Cabeceras de seguridad (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy,
  Permissions-Policy) en `next.config.ts`.
- CORS restringido por allowlist en los endpoints públicos; los endpoints admin no llevan CORS
  (mismo origen únicamente).
- Subida de imágenes firmada desde el servidor — el `API_SECRET` de Cloudinary nunca toca el cliente.
- `AuditLog` registra cada mutación (crear/editar/borrar/reordenar) con estado antes/después, IP y
  user-agent.

## 6. Comandos útiles

```bash
npm run dev              # desarrollo
npm run build             # build de produccion
npm run lint              # linter
npm run prisma:studio     # explorar la base de datos con UI
npm run prisma:migrate    # crear una nueva migracion tras editar prisma/schema.prisma
npm run migrate:excel     # migracion unica desde el Excel
```
