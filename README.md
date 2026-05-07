# Yappy Oficios AI · Vite + Vercel

Aplicación web para automatizar la respuesta a oficios legales de la billetera digital Yappy. Versión productiva con **Vite** (frontend) y una **función serverless** en Vercel que oculta credenciales del proveedor de email.

## Estructura

```
yappy-oficios-ai-vercel/
├── index.html              # App completa (HTML + CSS + JS)
├── api/
│   └── send-email.js       # Función serverless: Resend o Webhook (creds en env vars)
├── public/                 # Assets estáticos (vacío por ahora)
├── package.json
├── vite.config.js
├── vercel.json
├── .env.example            # Plantilla de variables de entorno
├── .gitignore
├── README.md
├── DEPLOY.md               # Guía paso a paso para publicar
└── LICENSE
```

## Comandos

```bash
# Instalar dependencias (solo Vite)
npm install

# Desarrollo local (frontend en http://localhost:5173)
npm run dev

# Desarrollo local CON función serverless (recomendado)
# Requiere: npm i -g vercel
vercel dev

# Build de producción → carpeta dist/
npm run build

# Servir el build localmente para inspección
npm run preview
```

## Variables de entorno

Copia `.env.example` a `.env.local` y rellena. **Nunca** subas `.env.local` al repositorio (ya está en `.gitignore`).

| Variable | Obligatoria | Para qué |
|---|---|---|
| `RESEND_API_KEY` | sí (o webhook) | API key de Resend (https://resend.com/api-keys) |
| `MAKE_WEBHOOK_URL` | sí (o resend) | URL del webhook de Make/Zapier como fallback |
| `MAIL_FROM` | sí | Remitente verificado (en Resend, debes verificar el dominio) |
| `API_TOKEN` | no | Si lo defines, exige header `x-api-token` |
| `ALLOWED_ORIGIN` | no | Si lo defines, exige que el `Origin` coincida |

> En **Vercel**, estas variables se configuran en *Settings → Environment Variables* del proyecto. **NO** se commitean al repo.

## Seguridad

El frontend **nunca** conoce las credenciales de email. La función `api/send-email.js`:

1. **Same-origin por defecto** (Vercel sirve API + frontend en el mismo dominio).
2. **Validación de payload**: método POST, JSON válido, email RFC, asunto ≤ 200 chars, cuerpo ≤ 50.000.
3. **Rate limit en memoria** (best-effort, ~10 req/min/IP).
4. **Token compartido opcional** con `API_TOKEN` y header `x-api-token`.
5. **Whitelist de Origin opcional** con `ALLOWED_ORIGIN`.
6. **Resolución automática** de proveedor: Resend si hay key; si no, Webhook; si tampoco, devuelve 503 `simulated:true`.

## Modos de envío en la app (Configuración → Envío de correos)

| Modo | Cuándo usar |
|---|---|
| **API serverless** | Por defecto en producción. Llama a `/api/send-email`. |
| **Simulado** | Sin envío real. Útil para demos o desarrollo sin Vercel. |
| **Webhook directo desde navegador** | Solo desarrollo local. **NO** usar en producción (URL queda visible). |
| **SMTP** | Informativo. Requiere backend propio. |

## Stack

- **Frontend**: HTML5 + CSS3 + JavaScript vanilla (~2.500 líneas)
- **Build tool**: Vite 5.x
- **Hosting**: Vercel (frontend estático + serverless functions Node.js)
- **Email**: Resend (recomendado) o webhook de Make/Zapier
- **Persistencia cliente**: localStorage del navegador
- **Auth**: SHA-256 + OTP de 6 dígitos enviado por email

## Datos ficticios

Todos los usuarios, transacciones y oficios precargados son sintéticos. **No usar con datos reales de clientes.**

## Licencia

MIT — ver `LICENSE`.

---
Built with Claude Cowork + Claude Code · Mayo 2026
