export function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}
export function appUrl(path = ''): string {
  const url = new URL(Deno.env.get('APP_BASE_URL')?.trim() || requiredEnv('APP_URL'));
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('APP_BASE_URL must be an HTTPS origin');
  return new URL(path || '/', url.origin).href;
}
export function geminiSettings(): { url: string; apiKey: string } {
  const model = requiredEnv('GEMINI_MODEL');
  if (!/^[a-zA-Z0-9._-]+$/.test(model)) throw new Error('GEMINI_MODEL must be a model ID');
  return {
    url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    apiKey: requiredEnv('GEMINI_API_KEY'),
  };
}

// Compatibility with existing live secret names while migrating to canonical names.
export function serverConnection(): { url: string; key: string } {
  const rawUrl = Deno.env.get('SUPABASE_URL')?.trim() || requiredEnv('DB_URL');
  const url = new URL(rawUrl);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    (Deno.env.get('SMARTBRIDGE_LOCAL_TEST') === 'true' && url.hostname === 'kong' && url.port === '8000');
  if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('SUPABASE_URL must be an HTTPS origin');
  return { url: url.origin, key: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim() || requiredEnv('SERVICE_ROLE_KEY') };
}
export function emailSettings(): { apiKey: string; from: string } {
  try {
    const from = Deno.env.get('EMAIL_FROM')?.trim() || requiredEnv('FROM_EMAIL');
    const address = from.match(/^(?:[^<>\r\n]+ <)?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>?$/)?.[1];
    if (!address || /@yourdomain\.com$/i.test(address)) throw new Error('EMAIL_FROM must be a verified sender address');
    return { apiKey: requiredEnv('RESEND_API_KEY'), from };
  } catch (error) { throw Object.assign(error, { status: 503 }); }
}
