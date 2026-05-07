# Guía de despliegue · Yappy Oficios AI en Vercel

Tiempo estimado: **10 minutos**.

---

## 0 · Pre-requisitos (una sola vez)

- Cuenta gratuita en https://github.com
- Cuenta gratuita en https://vercel.com (puedes loguearte con GitHub)
- Cuenta gratuita en https://resend.com — para crear la API key del email
- Node.js 18 o superior instalado en tu máquina (https://nodejs.org)

---

## 1 · Probar localmente (recomendado antes de subir)

Desde la carpeta del proyecto:

```bash
# 1.1 · Instalar dependencias (solo Vite)
npm install

# 1.2 · Crear tu archivo .env.local con tus credenciales reales
cp .env.example .env.local
# luego edita .env.local con tu RESEND_API_KEY o MAKE_WEBHOOK_URL

# 1.3 · Arrancar Vite + serverless localmente
#       (opción más completa: instala Vercel CLI y úsala)
npm install -g vercel
vercel dev

# Vercel dev inicia el frontend Y las funciones api/ en http://localhost:3000
```

Alternativa sin Vercel CLI: `npm run dev` arranca solo Vite (la API no funcionará, modo `simulated` cae automático).

Verifica:
- Crea cuenta → te llega OTP en pantalla y/o por email
- Registra un oficio con celular `60000001`, periodo Mar–May 2026, busca → genera carta
- Aprueba la carta → el correo sale por la API

---

## 2 · Subir el código a GitHub

### 2.1 · Crear el repositorio
- Abre https://github.com/new
- **Repository name:** `yappy-oficios-ai`
- **Visibility:** Public *(privado también funciona en Vercel pero tiene límites en plan gratis)*
- **Initialize this repository:** deja todo SIN marcar
- **Create repository**

### 2.2 · Subir los archivos
En la página del repo recién creado, pulsa **"uploading an existing file"**.

Arrastra **todos** los archivos del proyecto (excepto `.env.local`, `.env`, `node_modules/` y `dist/` — los dos primeros nunca, los dos últimos los regenera Vercel):

```
index.html
package.json
vite.config.js
vercel.json
.env.example
.gitignore
README.md
DEPLOY.md
LICENSE
api/send-email.js          ← incluye la carpeta api/
public/                    ← incluye la carpeta vacía (o omítela)
```

Pulsa **Commit changes**.

> **Importante:** confirma que `api/send-email.js` aparezca dentro de la carpeta `api/` en GitHub, no suelto.
> Si subes desde la línea de comandos: `git init && git add . && git commit -m "init" && git push`.

---

## 3 · Conectar el repo a Vercel

### 3.1 · Importar el proyecto
- Entra a https://vercel.com/new
- Pulsa **Import** sobre el repo `yappy-oficios-ai`. Si no aparece, instala la GitHub App de Vercel y dale acceso.

### 3.2 · Configurar el build
Vercel detecta automáticamente Vite. Confirma:

| Campo | Valor |
|---|---|
| **Framework Preset** | Vite |
| **Root Directory** | `./` |
| **Build Command** | `npm run build` *(autodetectado)* |
| **Output Directory** | `dist` *(autodetectado)* |
| **Install Command** | `npm install` *(autodetectado)* |

**No** pulses Deploy aún — primero configura las variables de entorno.

### 3.3 · Variables de entorno (CRÍTICO)
En el formulario de import, expande **Environment Variables** y añade:

```
RESEND_API_KEY      = re_tu_api_key_real_de_resend
MAIL_FROM           = onboarding@resend.dev   # o tu dominio verificado
```

Opcionalmente, si usas Make/Zapier en lugar de Resend:

```
MAKE_WEBHOOK_URL    = https://hook.us2.make.com/tu_webhook
```

Opcional para reforzar seguridad:

```
ALLOWED_ORIGIN      = https://yappy-oficios-ai.vercel.app
```

Marca cada variable como aplicable a **Production, Preview, Development**.

### 3.4 · Deploy
Pulsa **Deploy**. Vercel construye en ~30 s y te da una URL del tipo:

```
https://yappy-oficios-ai.vercel.app
```

(Si el nombre está tomado, Vercel añade un sufijo aleatorio.)

---

## 4 · Verificar producción

1. Abre la URL → debe cargar la pantalla de login.
2. Crea cuenta con un email tuyo real.
3. Comprueba que llega el OTP a tu bandeja de email (vía Resend o tu webhook).
4. Verifica el OTP → entras al portal.
5. Registra un oficio con celular `60000001`, periodo Mar–May 2026 → `Guardar y buscar datos`.
6. Aprueba la carta → debe enviarte un correo con el contenido de la carta.
7. Revisa **Bandeja correo (demo)** y **Bitácora** para ver el rastro.

Si algo falla:
- Vercel → tu proyecto → **Logs** → mira si la función `api/send-email` devolvió algún error.
- Resend → **Logs** → ve cada email enviado y errores de entrega.

---

## 5 · Actualizaciones futuras

```bash
# Cambias index.html localmente
git add .
git commit -m "fix: pequeño ajuste"
git push
```

Vercel detecta el push y redespliega automáticamente en ~30 s.

---

## 6 · Custom domain (opcional)

Vercel → tu proyecto → **Settings → Domains** → **Add Domain**.

- Si tu dominio está en Cloudflare/GoDaddy/Namecheap: añade un registro CNAME apuntando a `cname.vercel-dns.com`.
- Vercel emite un certificado HTTPS automáticamente.

Recuerda actualizar `ALLOWED_ORIGIN` en las env vars con el nuevo dominio.

---

## Solución de problemas comunes

**"El email no llega"**
- ¿`RESEND_API_KEY` está en Vercel Env Vars? (Settings → Environment Variables)
- ¿Hiciste Redeploy después de añadir la variable? Las env vars no se aplican retroactivamente.
- ¿`MAIL_FROM` está usando un dominio verificado en Resend? Mientras tanto: `onboarding@resend.dev`.

**"503 simulated:true"**
- Significa que ni Resend ni Webhook están configurados. Define al menos una variable.

**"401 Unauthorized" desde el cliente**
- Definiste `API_TOKEN` pero el frontend no lo envía. Quita `API_TOKEN` o ajusta el cliente para mandar el header `x-api-token`.

**"403 Origin no permitido"**
- `ALLOWED_ORIGIN` no coincide con la URL real. Cópiala exactamente desde el dashboard de Vercel.

**El build falla con "Cannot find module 'vite'"**
- Asegúrate que `package.json` está en la raíz del repo (no dentro de un subdirectorio).

---

*Built with Claude Cowork + Claude Code · Mayo 2026*
