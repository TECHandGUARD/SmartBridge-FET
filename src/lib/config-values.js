// Public deployment settings only. This module is also used by build validation.
export function readPublicConfig(env = {}, currentOrigin = '') {
  const errors = [];
  const value = key => String(env[key] || '').trim();
  const url = (key, fallback = '', allowedHost = '', originOnly = false) => {
    const raw = value(key) || fallback;
    if (!raw) return '';
    try {
      const parsed = new URL(raw);
      const local = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
      if ((parsed.protocol !== 'https:' && !(local && parsed.protocol === 'http:')) || parsed.username || parsed.password || (allowedHost && parsed.hostname !== allowedHost) || (originOnly && (parsed.pathname !== '/' || parsed.search || parsed.hash))) throw new Error();
      return parsed.href.replace(/\/$/, '');
    } catch { errors.push(`${key} must be a valid HTTPS URL${allowedHost ? ` on ${allowedHost}` : ''}.`); return ''; }
  };
  const supabaseUrl = url('VITE_SUPABASE_URL', '', '', true);
  const supabaseKey = value('VITE_SUPABASE_PUBLISHABLE_KEY') || value('VITE_SUPABASE_ANON_KEY');
  if (!supabaseUrl) errors.push('VITE_SUPABASE_URL is required.');
  if (!supabaseKey) errors.push('VITE_SUPABASE_PUBLISHABLE_KEY (or legacy VITE_SUPABASE_ANON_KEY) is required.');
  let publicKey = supabaseKey.startsWith('sb_publishable_');
  if (!publicKey && supabaseKey) {
    try {
      const payload = supabaseKey.split('.')[1];
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      publicKey = JSON.parse(atob(normalized)).role === 'anon';
    } catch { /* An invalid or privileged key must never initialize the browser client. */ }
  }
  if (supabaseKey && !publicKey) errors.push('Use a Supabase publishable key or legacy anon key; server secrets are forbidden.');
  const publicPasswordSettings = new Set(['VITE_RESET_PASSWORD_ROUTE', 'VITE_FORGOT_PASSWORD_ROUTE', 'VITE_MIN_PASSWORD_LENGTH']);
  for (const key of Object.keys(env)) {
    if (!publicPasswordSettings.has(key) && /^VITE_.*(SECRET|SERVICE_ROLE|PASSWORD|PRIVATE_KEY|ACCESS_TOKEN|GEMINI_API_KEY|OPENAI_API_KEY|RESEND_API_KEY|YOCO_API_KEY)/i.test(key)) errors.push(`${key} is server-only and must not have a VITE_ prefix.`);
  }
  const connectionErrors = [...errors];
  const price = (key, fallback) => {
    if (!value(key)) return fallback;
    const amount = Number(value(key));
    if (!Number.isFinite(amount) || amount <= 0) { errors.push(`${key} must be a positive number.`); return fallback; }
    return amount;
  };
  const bank = {
    name: value('VITE_EFT_BANK_NAME'), accountName: value('VITE_EFT_ACCOUNT_NAME'),
    accountNumber: value('VITE_EFT_ACCOUNT_NUMBER'), branchCode: value('VITE_EFT_BRANCH_CODE'),
  };
  const bankValues = Object.values(bank);
  if (bankValues.some(Boolean) && !bankValues.every(Boolean)) errors.push('EFT requires all four VITE_EFT_* settings.');
  let supportEmail = value('VITE_SUPPORT_EMAIL') || 'aneleq@techandguard.co.za';
  if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(supportEmail)) {
    errors.push('VITE_SUPPORT_EMAIL must be a valid email address.');
    supportEmail = 'aneleq@techandguard.co.za';
  }
  if(value('VITE_PAYMENTS_API_ENABLED') && !['true','false'].includes(value('VITE_PAYMENTS_API_ENABLED'))) errors.push('VITE_PAYMENTS_API_ENABLED must be true or false.');
  const config = {
    paymentsApiEnabled: value('VITE_PAYMENTS_API_ENABLED') === 'true',
    supabaseUrl, supabaseKey: publicKey ? supabaseKey : '',
    appBaseUrl: url('VITE_APP_BASE_URL', currentOrigin, '', true),
    company: {
      name: value('VITE_COMPANY_NAME') || 'Tech & GUARD Pty Ltd',
      registrationNumber: value('VITE_CIPC_REGISTRATION') || '2026/15509/07',
      registrationDate: value('VITE_REGISTRATION_DATE') || '21 February 2026',
      supportEmail,
      website: url('VITE_CORPORATE_WEBSITE', 'https://www.techandguard.co.za'),
      logoUrl: url('VITE_CORPORATE_LOGO_URL'),
    },
    prices: { student: price('VITE_STUDENT_MONTHLY_PRICE', 20), parent: price('VITE_PARENT_MONTHLY_PRICE', 50), tutor_pro: price('VITE_TUTOR_PRO_MONTHLY_PRICE', 150) },
    bank: bankValues.every(Boolean) ? bank : null,
  };
  return { config, errors, connectionErrors };
}
