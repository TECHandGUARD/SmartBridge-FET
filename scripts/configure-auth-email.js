// Default is a dry run. No credential value is printed or saved.
const names=['SUPABASE_ACCESS_TOKEN','SUPABASE_PROJECT_REF','APP_BASE_URL','AUTH_SMTP_HOST','AUTH_SMTP_PORT','AUTH_SMTP_USER','AUTH_SMTP_PASSWORD','AUTH_FROM_EMAIL'];
const value=name=>process.env[name]?.trim();
const missing=names.filter(name=>!value(name));
if(missing.length){console.error(`Missing settings: ${missing.join(', ')}`);process.exitCode=1;}else{
 const ref=value('SUPABASE_PROJECT_REF');if(!/^[a-z]{20}$/.test(ref))throw new Error('Invalid project reference');
 const origin=new URL(value('APP_BASE_URL'));if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw new Error('APP_BASE_URL must be an HTTPS origin');
 const port=Number(value('AUTH_SMTP_PORT'));if(![465,587].includes(port))throw new Error('Use an approved SMTP TLS port');
 if(!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value('AUTH_FROM_EMAIL')))throw new Error('Invalid sender address');
 const patch={site_url:origin.origin,external_email_enabled:true,mailer_autoconfirm:false,mailer_secure_email_change_enabled:true,smtp_host:value('AUTH_SMTP_HOST'),smtp_port:port,smtp_user:value('AUTH_SMTP_USER'),smtp_pass:value('AUTH_SMTP_PASSWORD'),smtp_admin_email:value('AUTH_FROM_EMAIL'),smtp_sender_name:value('AUTH_SENDER_NAME')||'SmartBridge FET'};
 if(!process.argv.includes('--apply'))console.log(`Dry run: auth email configuration is ready for project ${ref}. No changes made. Pass --apply only for the approved target.`);
 else{
  const base=`https://api.supabase.com/v1/projects/${ref}/config/auth`,headers={Authorization:`Bearer ${value('SUPABASE_ACCESS_TOKEN')}`,'Content-Type':'application/json'};
  const current=await fetch(base,{headers,signal:AbortSignal.timeout(15000)});if(!current.ok)throw new Error(`Cannot inspect auth configuration (HTTP ${current.status})`);
  const config=await current.json();patch.uri_allow_list=[...new Set([...(config.uri_allow_list||'').split(',').filter(Boolean),`${origin.origin}/auth/callback`,`${origin.origin}/reset-password`])].join(',');
  const response=await fetch(base,{method:'PATCH',headers,body:JSON.stringify(patch),signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error(`Auth email configuration failed (HTTP ${response.status})`);
  console.log('Authentication email configuration saved. Verify domain authentication and real confirmation/recovery flows using dedicated test accounts.');
 }
}
