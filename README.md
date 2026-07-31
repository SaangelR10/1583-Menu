# Café 1583 — Digital Menu

Interactive digital menu for **Café 1583** (Cali, Colombia). Customers scan a QR code and instantly browse the full menu — no app, no installation required. Content (categories, products, prices, photos, store info) is managed through a secured admin dashboard backed by a real database, instead of the original Excel-based pipeline.

🔗 **Menú público:** https://1583-menu.vercel.app *(también publicado en [GitHub Pages](https://saangelr10.github.io/1583-Menu/))*
🔒 **Panel de administración:** https://1583-menu-qcus.vercel.app/admin/login

---

## 💼 Portfolio / CV Section

---

### CAFÉ 1583 — INTERACTIVE DIGITAL MENU + ADMIN BACKEND
*Personal Project · 2024 – Present · [Live demo](https://1583-menu.vercel.app)*

- Designed and built a production-ready **single-page digital menu (SPA)** using **HTML5, CSS3, and Vanilla JavaScript** (no frameworks); customers access the full menu by scanning a QR code — no app or installation required.
- Architected and shipped a **full admin backend** (Next.js App Router + TypeScript, PostgreSQL/Prisma, Cloudinary) replacing a manual Excel → JSON pipeline, with a secured dashboard for non-technical staff to manage categories, products, stock, and store info in real time.
- Implemented **production-grade auth security**: JWT access tokens (15 min) + rotating refresh tokens in httpOnly/secure/SameSite=strict cookies with reuse detection, bcrypt password hashing, optional TOTP 2FA, brute-force rate limiting with account lockout, and CSRF double-submit protection.
- Built a **signed, direct-to-Cloudinary upload flow** (client-side crop, drag-and-drop or camera capture, server-issued signatures) with automatic cleanup of replaced/deleted assets.
- Kept the public menu's JSON contract byte-identical while swapping its data source from a static file to a live API — zero downtime, zero frontend rewrite, with an automatic local-file fallback if the backend is unreachable.
- Implemented a bilingual **(ES/EN) i18n system** with real-time language switching, `localStorage` persistence, and synchronization across independent UI selectors via DOM event propagation.
- Built an animated **splash screen** with a dynamic product carousel driven by runtime API data, touch swipe support, and iOS Safari scroll-lock (`overscroll-behavior`, `position: fixed` on body) — gracefully skipped when no combo images are present.
- Applied front-end **performance optimizations**: `<link rel="preload">` for LCP, lazy loading + async decoding on product images, in-memory `Map` cache for modal images, and hover-triggered image prefetch for near-instant modal opens.
- Delivered a fully **responsive, mobile-first UI** with a bottom-sheet modal pattern, 44 px minimum touch targets (WCAG / Apple HIG), safe-area inset support for notch devices, and `prefers-reduced-motion` compliance.

---

## 🧱 Stack

**Menú público** (`/`, sin cambios de arquitectura)
HTML5 · CSS3 · JavaScript ES2020+ · Tailwind CSS 2.2 (CDN) · Google Fonts · Font Awesome · GitHub Pages / Vercel (hosting estático)

**Backend + Panel de administración** (`/backend`)
Next.js 16 (App Router) + TypeScript · PostgreSQL (Neon) + Prisma ORM · Cloudinary (subida firmada + recorte) · `jose` (JWT) + `bcryptjs` + `otplib` (2FA TOTP) · Zod (validación) · Vercel (hosting)

---

## 🧭 Cómo funciona (arquitectura)

Son **dos despliegues independientes** que se comunican por HTTP:

```
┌─────────────────────────┐         GET /api/v1/menu          ┌──────────────────────────┐
│   Menú público (SPA)    │  ────────────────────────────────▶ │   Backend (Next.js)      │
│   index.html            │ ◀──────────────────────────────── │   backend/                │
│   GitHub Pages / Vercel │      JSON (mismo shape de          │   Vercel                  │
│                          │       menu-data.json, siempre)     │                            │
└─────────────────────────┘                                    │  ┌──────────────────────┐  │
        │ fallback si la API falla                              │  │ PostgreSQL (Neon)     │  │
        ▼                                                        │  └──────────────────────┘  │
   data/menu-data.json                                          │  ┌──────────────────────┐  │
   (copia local de respaldo)                                    │  │ Cloudinary (fotos)    │  │
                                                                  │  └──────────────────────┘  │
                                                                  │                            │
                                                                  │  /admin  ← panel protegido  │
                                                                  └──────────────────────────┘
```

- El **menú público** (`index.html`) nunca cambió de contrato de datos: sigue esperando exactamente el mismo JSON que antes generaba `scripts/build-menu-data.js`. Solo cambió *de dónde* lo pide — antes un archivo estático, ahora `GET /api/v1/menu` en el backend. Si esa API no responde, cae automáticamente al JSON local (`data/menu-data.json`) — el menú nunca se queda en blanco.
- El **panel de administración** (`/admin`) es una app separada que solo el dueño/staff autenticado puede usar. Cada cambio (crear producto, desactivar categoría, subir foto, etc.) se guarda en PostgreSQL al instante y queda disponible de inmediato para `GET /api/v1/menu` — no hay paso de "build" ni "publicar".
- Las **imágenes** se suben directo del navegador a Cloudinary usando una firma que genera el backend (el secreto de Cloudinary nunca llega al cliente), con recorte previo y borrado automático de la imagen anterior al reemplazarla.
- Cada mutación queda registrada en una tabla de auditoría (quién, qué, cuándo, desde qué IP).

Documentación técnica completa del backend (esquema de base de datos, endpoints, variables de entorno, cómo desplegar) en **[backend/README.md](backend/README.md)**.
Guía de uso operativo del panel (sin jerga técnica) en `LEEME.txt` (local, no se sube al repo).

---

### Architecture at a Glance

```
1583-Menu/
├── index.html                 ← menú público (SPA, HTML + CSS + JS, ~2 500 líneas)
├── data/
│   └── menu-data.json         ← copia local de respaldo (fallback si el backend falla)
├── images/
│   └── productos/             ← fotos originales del sitio público
├── Cargue productos/
│   └── Menu Web.xlsx          ← Excel original (referencia histórica, ya no es la fuente activa)
├── scripts/                   ← pipeline Excel → JSON (legado, solo para migración/emergencia)
└── backend/                   ← API pública/privada + panel admin + base de datos
    ├── app/api/v1/menu, /store-info        ← API pública (consumida por index.html)
    ├── app/api/v1/admin/*                  ← API privada (CRUD, auth, uploads)
    ├── app/admin/*                          ← UI del panel
    ├── prisma/schema.prisma                 ← esquema de la base de datos
    ├── prisma/migrate-from-excel.ts         ← migración única desde el Excel
    └── README.md                            ← guía técnica de despliegue
```

---

## 🍽️ Modo de uso del sistema

**Día a día (gestión del menú):** todo se hace desde el panel de administración —
https://1583-menu-qcus.vercel.app/admin/login — crear/editar categorías y productos,
subir fotos (drag-and-drop o cámara), marcar productos agotados, reordenar por
drag-and-drop, editar horarios/WhatsApp/Instagram, y ver el historial de cambios.
Guía paso a paso sin jerga técnica en `LEEME.txt`.

**Flujo viejo del Excel (legado / solo emergencia):** el pipeline original sigue
funcionando por si se necesita un respaldo manual, pero ya no es el flujo normal.

```bash
npm run build:data        # Convierte Menu Web.xlsx → data/menu-data.json
npm run organize:images    # Reorganiza imágenes en carpetas por categoría
npm run check:images       # Revisa formatos y tamaños de las imágenes
npm run optimize:images    # Redimensiona/comprime fotos (sharp)
npm run cleanup:large      # Elimina archivos de imagen demasiado pesados
```

**Backend / desarrollo local:** ver [backend/README.md](backend/README.md) para
correr el panel en tu máquina, variables de entorno y despliegue en Vercel.

---

*Developed by [@sergioangel.00](https://instagram.com/sergioangel.00)*
