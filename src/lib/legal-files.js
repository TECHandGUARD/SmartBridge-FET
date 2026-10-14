export const LEGAL_BUCKET = 'legal-documents';
export const LEGAL_CATEGORIES = { agreements: 'Agreements', compliance: 'Compliance documents', terms: 'Terms & Conditions', policy: 'Policies' };
export const LEGAL_AUDIENCES = { public: 'Public', tutor: 'Tutors', parent: 'Parents', student: 'Learners', owner: 'Specific user and admins', admin: 'Admins only' };
export async function validateLegalPdf(file) {
  if (!file || file.size < 5 || file.size > 10 * 1024 * 1024) throw new Error('Choose a PDF up to 10 MB.');
  const bytes = await file.arrayBuffer();
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-') throw new Error('The file must be a PDF.');
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), value => value.toString(16).padStart(2, '0')).join('');
}
export async function downloadLegalFile(client, document) {
  const { data, error } = await client.storage.from(LEGAL_BUCKET).download(document.file_path);
  if (error) throw error;
  const url = URL.createObjectURL(data);
  const link = window.document.createElement('a');
  link.href = url; link.download = document.doc_key + '.pdf';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
