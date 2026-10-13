// Preserve the live templates and provider contract, with stable retry keys and bounded calls.
export async function emailFetch(options: RequestInit, client?: any): Promise<Response> {
  const body = String(options.body || '');
  const payload = JSON.parse(body);
  const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];
  if (!recipients.length || recipients.some((address: unknown) => typeof address !== 'string' || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(address))) throw new Error('Email recipient is invalid');
  const normalized = recipients.map((address: string)=>address.toLowerCase());
  if(client){
    const {data,error}=await client.rpc('email_recipients_allowed',{recipient_emails:normalized});
    if(error||data!==true)throw new Error('Email recipient is suppressed or delivery checks unavailable');
  }
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body)));
  const headers = new Headers(options.headers);
  headers.set('Idempotency-Key', `smartbridge-${Array.from(digest, byte=>byte.toString(16).padStart(2,'0')).join('')}`);
  let response: Response | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    response = await fetch('https://api.resend.com/emails', { ...options, headers, signal: AbortSignal.timeout(15000) });
    if (response.ok) {
      const accepted = await response.clone().json();
      if (!accepted.id) throw new Error('Email provider returned no message ID');
      if(client){const {error}=await client.rpc('record_email_acceptance',{provider_id:accepted.id,recipient_emails:normalized});if(error)throw new Error('Email accepted but delivery tracking unavailable');}
      return response;
    }
    if ((response.status !== 429 && response.status < 500) || attempt === 2) return response;
    await response.body?.cancel();
    await new Promise(resolve=>setTimeout(resolve, 500 * 2 ** attempt));
  }
  return response!;
}
