import {useEffect,useRef,useState} from 'react';
import {getDocument,GlobalWorkerOptions} from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
GlobalWorkerOptions.workerSrc=workerUrl;

export default function SlidePresentation({transport,received,canPresent}) {
  const [document,setDocument]=useState(null),[page,setPage]=useState(1),[title,setTitle]=useState('');
  const [busy,setBusy]=useState(false),[rendering,setRendering]=useState(false),[error,setError]=useState('');
  const canvas=useRef(null),task=useRef(null),generation=useRef(0),renderRevision=useRef(0);
  useEffect(()=>()=>{generation.current++;task.current?.destroy();},[]);
  useEffect(()=>{
    if(!document||!canvas.current)return;
    const revision=++renderRevision.current;let cancelled=false,renderTask;
    setRendering(true);setError('');
    (async()=>{
      const slide=await document.getPage(page);if(cancelled)return;
      const base=slide.getViewport({scale:1});const viewport=slide.getViewport({scale:Math.min(1280/base.width,1280/base.height,2)});
      const element=canvas.current;element.width=Math.ceil(viewport.width);element.height=Math.ceil(viewport.height);
      renderTask=slide.render({canvas:element,viewport});await renderTask.promise;
      if(cancelled||revision!==renderRevision.current)return;
      transport.publish({image:element.toDataURL('image/jpeg',0.8),title,page,total:document.numPages});
    })().catch(e=>{if(!cancelled)setError(e.message||'Unable to present this page.');}).finally(()=>{if(!cancelled)setRendering(false);});
    return()=>{cancelled=true;renderTask?.cancel();};
  },[document,page,title,transport]);
  const upload=async event=>{
    const file=event.target.files?.[0];event.target.value='';if(!file)return;
    const attempt=++generation.current;setError('');
    if(file.size>20*1024*1024){setError('Choose a PDF smaller than 20 MB.');return;}
    if(!file.name.toLowerCase().endsWith('.pdf')){setError('Export your slides as a PDF first.');return;}
    setBusy(true);
    try {
      const data=new Uint8Array(await file.arrayBuffer());
      if(attempt!==generation.current)return;
      const loading=getDocument({data,isEvalSupported:false});const pdf=await loading.promise;
      if(attempt!==generation.current){await loading.destroy();return;}
      if(pdf.numPages>150){await loading.destroy();throw new Error('Choose a PDF with 150 pages or fewer.');}
      transport.publish(null);task.current?.destroy();task.current=loading;
      setDocument(pdf);setPage(1);setTitle(file.name.slice(0,120));
    }catch(e){if(attempt===generation.current)setError(e.name==='PasswordException'?'Remove the PDF password before presenting.':e.message||'Unable to open this PDF.');}
    finally{if(attempt===generation.current)setBusy(false);}
  };
  const stop=()=>{generation.current++;renderRevision.current++;transport.publish(null);setDocument(null);task.current?.destroy();task.current=null;setBusy(false);setRendering(false);setError('');};
  return <section className="space-y-3 rounded-xl border p-3" aria-label="Slide presentation">
    {canPresent&&<><label className="block text-sm font-semibold">Present PDF slides<input type="file" accept="application/pdf,.pdf" onChange={upload} disabled={busy||rendering} className="mt-2 block max-w-full text-sm"/></label><p className="text-xs text-muted-foreground">Export PowerPoint or Canva slides as PDF. Up to 20 MB and 150 pages. Works on phones; slides are shared only with people in this call and are not saved.</p></>}
    {busy&&<p role="status">Opening slides…</p>}
    {error&&<p role="alert">{error}</p>}
    {document&&<div className="space-y-2"><p className="break-words text-sm font-semibold">{title} · Page {page} of {document.numPages}</p><canvas ref={canvas} className="mx-auto h-auto max-w-full" aria-label="Your presented slide"/><div className="flex flex-wrap gap-2"><button className="rounded border px-3 py-2" disabled={page===1||rendering} onClick={()=>setPage(p=>p-1)}>Previous slide</button><button className="rounded border px-3 py-2" disabled={page===document.numPages||rendering} onClick={()=>setPage(p=>p+1)}>Next slide</button><button className="rounded border px-3 py-2" onClick={stop}>Stop presenting</button></div>{rendering&&<p role="status">Preparing slide…</p>}</div>}
    {Object.entries(received).map(([id,slide])=><figure key={id} className="space-y-2"><figcaption className="break-words text-sm font-semibold">{slide.title} · Page {slide.page} of {slide.total}</figcaption><img src={slide.image} alt={'Shared slide '+slide.page+' of '+slide.total} className="mx-auto h-auto max-w-full"/></figure>)}
    {!canPresent&&!Object.keys(received).length&&<p className="text-sm text-muted-foreground">Slides will appear here when a tutor or administrator presents.</p>}
  </section>;
}
