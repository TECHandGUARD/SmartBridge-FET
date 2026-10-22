export function safePublicUrl(value) {
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password ? u.href : null; } catch { return null; }
}
export function captureAttribution(search, storage, now = Date.now()) {
  try {
    storage ??= window.sessionStorage;
    const q = new URLSearchParams(search), ref = q.get('ref'), campaign = q.get('campaign');
    if ((ref && /^[a-f0-9]{32}$/.test(ref)) || (campaign && /^[a-z0-9][a-z0-9-]{2,79}$/.test(campaign))) {
      if (!storage.getItem('smartbridge-attribution')) storage.setItem('smartbridge-attribution', JSON.stringify({ref:/^[a-f0-9]{32}$/.test(ref || '')?ref:null,campaign:/^[a-z0-9][a-z0-9-]{2,79}$/.test(campaign || '')?campaign:null,at:now}));
    }
  } catch { /* Optional attribution never blocks learning. */ }
}
export function readAttribution(storage, now = Date.now()) {
  try { storage ??= window.sessionStorage; const a = JSON.parse(storage.getItem('smartbridge-attribution')); return a && now-a.at>=0 && now-a.at<7*86400000 ? a : null; } catch { return null; }
}
