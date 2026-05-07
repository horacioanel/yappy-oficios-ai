/**
 * Yappy Oficios AI · API serverless de envío de correo
 *
 * El frontend NUNCA conoce las credenciales del proveedor de email.
 * Esta función vive en el servidor de Vercel y lee las variables de entorno
 * configuradas en el dashboard del proyecto.
 *
 * Soporta dos modos (resueltos automáticamente):
 *   1. Resend  — si RESEND_API_KEY está definido
 *   2. Webhook — si MAKE_WEBHOOK_URL está definido (Make / Zapier / propio)
 *
 * Si ninguno está configurado, devuelve 503 y el cliente cae a modo simulado.
 *
 * Seguridad:
 *   - Same-origin (Vercel sirve API + frontend en el mismo dominio).
 *   - Validación de método, content-type y formato de email.
 *   - (Opcional) ALLOWED_ORIGIN — si está definido, exige que Origin coincida.
 *   - (Opcional) API_TOKEN     — si está definido, exige header x-api-token.
 *   - Rate limit en memoria (best-effort por instancia, ~10 req/min/IP).
 */

// ----------- Rate limit muy básico en memoria (por instancia) -----------
const RL_BUCKET = new Map(); // key -> { count, resetAt }
const RL_MAX = 10;
const RL_WINDOW_MS = 60_000;
function rateLimitOk(ip) {
  const now = Date.now();
  const entry = RL_BUCKET.get(ip);
  if (!entry || entry.resetAt < now) {
    RL_BUCKET.set(ip, { count: 1, resetAt: now + RL_WINDOW_MS });
    return true;
  }
  if (entry.count >= RL_MAX) return false;
  entry.count += 1;
  return true;
}

// Limpieza ocasional para que el bucket no crezca sin límite
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of RL_BUCKET) if (v.resetAt < now) RL_BUCKET.delete(k);
}, 5 * 60_000).unref?.();

// ----------- Helpers -----------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_SUBJECT = 200;
const MAX_BODY = 50_000;

function clientIp(req) {
  const xfwd = req.headers['x-forwarded-for'];
  if (typeof xfwd === 'string') return xfwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

// ----------- Handler -----------
export default async function handler(req, res) {
  // 1. Método
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. Origin (opcional)
  const allowedOrigin = process.env.ALLOWED_ORIGIN;
  if (allowedOrigin) {
    const origin = req.headers.origin || req.headers.referer || '';
    if (!origin.startsWith(allowedOrigin)) {
      return res.status(403).json({ error: 'Origin no permitido' });
    }
  }

  // 3. Token compartido (opcional)
  const apiToken = process.env.API_TOKEN;
  if (apiToken) {
    if (req.headers['x-api-token'] !== apiToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  // 4. Rate limit por IP
  const ip = clientIp(req);
  if (!rateLimitOk(ip)) {
    return res.status(429).json({ error: 'Demasiadas peticiones. Intenta en un minuto.' });
  }

  // 5. Validación del payload
  let payload = req.body;
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); } catch { payload = null; }
  }
  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({ error: 'JSON inválido' });
  }
  const { to, subject, body } = payload;
  if (!to || !subject || !body) {
    return res.status(400).json({ error: 'Faltan campos: to, subject, body' });
  }
  if (typeof to !== 'string' || !EMAIL_RE.test(to)) {
    return res.status(400).json({ error: 'Email destino inválido' });
  }
  if (typeof subject !== 'string' || subject.length > MAX_SUBJECT) {
    return res.status(400).json({ error: 'Asunto inválido o demasiado largo' });
  }
  if (typeof body !== 'string' || body.length > MAX_BODY) {
    return res.status(400).json({ error: 'Cuerpo inválido o demasiado largo' });
  }

  const from = process.env.MAIL_FROM || 'onboarding@resend.dev';

  // 6. Resolver proveedor
  if (process.env.RESEND_API_KEY) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject,
          text: body,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        return res.status(502).json({
          error: 'Resend rechazó la petición',
          provider: 'resend',
          status: r.status,
          detail: data?.message || data?.error || null,
        });
      }
      return res.status(200).json({ ok: true, provider: 'resend', id: data?.id || null });
    } catch (e) {
      return res.status(502).json({ error: 'Error contactando con Resend: ' + e.message, provider: 'resend' });
    }
  }

  if (process.env.MAKE_WEBHOOK_URL) {
    try {
      const r = await fetch(process.env.MAKE_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, subject, body }),
      });
      if (!r.ok) {
        return res.status(502).json({
          error: 'Webhook respondió con error',
          provider: 'webhook',
          status: r.status,
        });
      }
      return res.status(200).json({ ok: true, provider: 'webhook' });
    } catch (e) {
      return res.status(502).json({ error: 'Error contactando con el webhook: ' + e.message, provider: 'webhook' });
    }
  }

  // 7. Sin proveedor configurado
  return res.status(503).json({
    error: 'Ningún proveedor configurado. Define RESEND_API_KEY o MAKE_WEBHOOK_URL en Vercel.',
    simulated: true,
  });
}
