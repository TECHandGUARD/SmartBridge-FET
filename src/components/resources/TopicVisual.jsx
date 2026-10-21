import { useId, useRef, useState } from 'react';
import { Expand, ScanLine, X, ZoomIn, ZoomOut } from 'lucide-react';
import visuals from '@/data/study-visuals.json';

// These are original, local topic diagrams, never remote AI-generated HTML.
export default function TopicVisual({ pack, preview = false }) {
  const visual = visuals[pack.id];
  const dialog = useRef(null);
  const titleId = useId();
  const [zoom, setZoom] = useState(100);
  const open = () => { setZoom(100); dialog.current?.showModal(); };
  if (!visual) return null;
  if (preview) return <img className="topic-preview" src={visual.src} alt={visual.alt} width="800" height="520" loading="lazy" decoding="async" />;
  return <figure className="topic-visual">
    <div className="topic-visual-heading"><div><span className="topic-visual-kicker"><ScanLine size={14} aria-hidden="true" /> Visual explanation</span><figcaption>{visual.caption}</figcaption></div>
      <button type="button" onClick={open} aria-label={`Enlarge diagram: ${pack.title}`}><Expand size={16} aria-hidden="true" /> Enlarge</button>
    </div>
    <img src={visual.src} alt={visual.alt} width="800" height="520" decoding="async" />
    <p className="topic-visual-caption">Look closely. Trace the relationships, compare the labels, then explain the idea in your own words. Enlarge for a closer view.</p>
    <dialog ref={dialog} className="topic-dialog" aria-labelledby={titleId}>
      <div className="topic-dialog-heading"><h2 id={titleId}>{pack.title}</h2><button type="button" onClick={() => dialog.current?.close()} aria-label="Close diagram"><X size={20} /></button></div>
      <div className="topic-zoom-controls" aria-label="Diagram zoom">
        <button type="button" aria-label="Zoom out" disabled={zoom <= 100} onClick={() => setZoom(v => Math.max(100, v - 25))}><ZoomOut size={18} /></button>
        <output aria-live="polite">{zoom}%</output>
        <button type="button" aria-label="Zoom in" disabled={zoom >= 250} onClick={() => setZoom(v => Math.min(250, v + 25))}><ZoomIn size={18} /></button>
        <button type="button" onClick={() => setZoom(100)}>Reset view</button>
      </div>
      <div className="topic-dialog-scroll" tabIndex={0} role="region" aria-label="Scrollable enlarged diagram"><img src={visual.src} alt={visual.alt} width="800" height="520" style={{ width: `${zoom}%` }} /></div>
      <p>Use the zoom controls and scroll to inspect details. Press Escape or Close to return.</p>
    </dialog>
  </figure>;
}
