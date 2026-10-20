import { useId, useRef } from 'react';
import { Expand, X } from 'lucide-react';
import visuals from '@/data/study-visuals.json';

// These are original, local topic diagrams, never remote AI-generated HTML.
export default function TopicVisual({ pack, preview = false }) {
  const visual = visuals[pack.id];
  const dialog = useRef(null);
  const titleId = useId();
  if (!visual) return null;
  if (preview) return <img className="topic-preview" src={visual.src} alt={visual.alt} width="640" height="380" loading="lazy" decoding="async" />;
  return <figure className="topic-visual">
    <div className="topic-visual-heading"><figcaption>{visual.caption}</figcaption>
      <button type="button" onClick={() => dialog.current?.showModal()} aria-label={`Enlarge diagram: ${pack.title}`}><Expand size={16} aria-hidden="true" /> Enlarge</button>
    </div>
    <img src={visual.src} alt={visual.alt} width="640" height="380" decoding="async" />
    <p className="topic-visual-caption">Trace the arrows and compare the labels, then use the notes below to explain the idea.</p>
    <dialog ref={dialog} className="topic-dialog" aria-labelledby={titleId}>
      <div className="topic-dialog-heading"><h2 id={titleId}>{pack.title}</h2><button type="button" onClick={() => dialog.current?.close()} aria-label="Close diagram"><X size={20} /></button></div>
      <div className="topic-dialog-scroll"><img src={visual.src} alt={visual.alt} width="960" height="570" /></div>
      <p>Scroll across the diagram on a small screen. Press Escape or Close to return.</p>
    </dialog>
  </figure>;
}
