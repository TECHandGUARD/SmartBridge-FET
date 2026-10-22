// Exact HTTPS destinations only. Never follow a stored URL to another host.
export const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;
export const MAX_ZIP_BYTES = 32 * 1024 * 1024;
export const MAX_DOCUMENTS = 20;
export function documentUrl(raw: string, projectUrl: string): URL {
  const url = new URL(raw);
  const official = ['education.gov.za', 'www.education.gov.za'].includes(url.hostname);
  const storage = url.origin === new URL(projectUrl).origin && url.pathname.startsWith('/storage/v1/object/public/caps-documents/');
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || (!official && !storage)) throw new Error('Document destination is not allowed');
  return url;
}
export async function fetchDocument(raw: string, projectUrl: string, fetcher = fetch, timeoutMs = 12000): Promise<Uint8Array> {
  const url = documentUrl(raw, projectUrl);
  const response = await fetcher(url.href, {redirect:'error', signal:AbortSignal.timeout(timeoutMs)});
  if (!response.ok || !response.body) throw new Error('Document download failed');
  const length = Number(response.headers.get('content-length'));
  if (length > MAX_DOCUMENT_BYTES) { await response.body.cancel(); throw new Error('Document exceeds download limit'); }
  const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const part = await reader.read(); if (part.done) break;
      size += part.value.length;
      if (size > MAX_DOCUMENT_BYTES) throw new Error('Document exceeds download limit');
      chunks.push(part.value);
    }
  } catch (error) { await reader.cancel(); throw error; } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  if (new TextDecoder().decode(bytes.slice(0,5)) !== '%PDF-') throw new Error('Document is not a PDF');
  return bytes;
}
