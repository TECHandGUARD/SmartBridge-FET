import ReactMarkdown from 'react-markdown';
import { LEGAL_CATEGORIES } from '@/lib/legal-files';

/**
 * Read-only rendering of a document using the same typography and content
 * treatment as the public /terms reader. Does not publish or accept terms.
 */
export default function LegalDocumentPreview({ document, onClose }) {
  if (!document) return null;
  return (
    <section aria-label="Legal document draft preview" className="min-w-0 space-y-4 rounded-2xl border-2 border-amber-400/70 bg-card p-3 shadow-lg sm:p-6">
      <div role="status" className="rounded-xl border border-amber-400/60 bg-amber-50 p-4 text-amber-950 dark:bg-amber-950 dark:text-amber-100">
        <p className="text-sm font-bold uppercase tracking-wide">Draft preview — not legally approved</p>
        <p className="mt-1 text-sm leading-6">For the business owner's review before legal advice. This document is not published to users, is not an active agreement, and cannot be accepted here.</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">Mobile and desktop preview</h3>
        <button type="button" onClick={onClose} className="inline-flex min-h-11 items-center rounded-xl border px-4 text-sm font-semibold hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">Close preview</button>
      </div>
      <div className="mx-auto w-full max-w-3xl min-w-0 overflow-hidden rounded-2xl border bg-background shadow-sm">
        <header className="bg-gradient-to-br from-emerald-950 to-emerald-800 p-5 text-white sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-100">SmartBridge FET · Legal documents</p>
          <h3 className="mt-2 break-words font-playfair text-2xl font-bold sm:text-3xl">{document.title}</h3>
          <p className="mt-2 text-sm text-emerald-50">{LEGAL_CATEGORIES[document.category] || 'Legal document'} · Version {document.version}</p>
        </header>
        <div className="min-w-0 p-4 sm:p-8">
          {document.content ? (
            <article className="prose prose-sm max-w-none break-words dark:prose-invert sm:prose-base"><ReactMarkdown>{document.content}</ReactMarkdown></article>
          ) : (
            <p className="text-sm text-muted-foreground">No document text. This document may require a PDF to be uploaded.</p>
          )}
          <p className="mt-8 border-t pt-4 text-xs text-muted-foreground">Preview only. No signature, consent, payment or legal acceptance is collected.</p>
        </div>
      </div>
    </section>
  );
}
