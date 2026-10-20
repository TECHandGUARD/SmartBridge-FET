import {useEffect,useRef,useState} from 'react';
import {getDocument,GlobalWorkerOptions} from 'pdfjs-dist';
import {supabase} from '@/lib/supabaseClient';
import {useAuth} from '@/lib/AuthContext';
import PresentationEditor from '@/components/presentations/PresentationEditor';
import {addPdfBrand,renderDeckSlide} from '@/lib/presentation-decks';
import {withTimeout} from '@/lib/auth-utils';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
GlobalWorkerOptions.workerSrc=workerUrl;

export default function SlidePresentation({transport,received,canPresent}) {
  const {user}=useAuth();
  const [nativeDeck,setNativeDeck]=useState(null),[decks,setDecks]=useState([]),[editing,setEditing]=useState(false),[showAuthor,setShowAuthor]=useState(false);
  const author=user?.full_name?.trim()||'SmartBridge educator';
  const [document,setDocument]=useState(null),[page,setPage]=useState(1),[title,setTitle]=useState('');
  const [busy,setBusy]=useState(false),[rendering,setRendering]=useState(false),[error,setError]=useState('');
  const canvas=useRef(null),task=useRef(null),generation=useRef(0),renderRevision=useRef(0);
  useEffect(()=>()=>{generation.current++;task.current?.destroy();},[]);
  useEffect(()=>{
    if((!document&&!nativeDeck)||!canvas.current)return;
    const revision=++renderRevision.current;let cancelled=false,renderTask;
    setRendering(true);setError('');
    (async()=>{
      if(nativeDeck){renderDeckSlide(canvas.current,nativeDeck.content.slides[page-1],nativeDeck.content.theme,page,nativeDeck.content.slides.length,nativeDeck.content.show_author?author:'');transport.publish({image:canvas.current.toDataURL('image/jpeg',0.8),title,page,total:nativeDeck.content.slides.length});return;}
      const slide=await document.getPage(page);if(cancelled)return;
      const base=slide.getViewport({scale:1});const viewport=slide.getViewport({scale:Math.min(1280/base.width,1280/base.height,2)});
      const element=canvas.current;element.width=Math.ceil(viewport.width);element.height=Math.ceil(viewport.height)+Math.max(36,Math.round(viewport.width*0.05));
      renderTask=slide.render({canvas:element,viewport});await renderTask.promise;
      if(cancelled||revision!==renderRevision.current)return;
      addPdfBrand(element,page,document.numPages,showAuthor?author:'');
      transport.publish({image:element.toDataURL('image/jpeg',0.8),title,page,total:document.numPages});
    })().catch(e=>{if(!cancelled)setError(e.message||'Unable to present this page.');}).finally(()=>{if(!cancelled)setRendering(false);});
    return()=>{cancelled=true;renderTask?.cancel();};
  },[document,nativeDeck,page,title,transport,showAuthor,author]);
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
      setNativeDeck(null);setDocument(pdf);setPage(1);setTitle(file.name.slice(0,120));
    }catch(e){if(attempt===generation.current)setError(e.name==='PasswordException'?'Remove the PDF password before presenting.':e.message||'Unable to open this PDF.');}
    finally{if(attempt===generation.current)setBusy(false);}
  };
  const stop=()=>{generation.current++;renderRevision.current++;transport.publish(null);setDocument(null);setNativeDeck(null);task.current?.destroy();task.current=null;setBusy(false);setRendering(false);setError('');};
  const chooseDeck=deck=>{generation.current++;renderRevision.current++;transport.publish(null);task.current?.destroy();task.current=null;setDocument(null);setNativeDeck(structuredClone(deck));setPage(1);setTitle(deck.title);setEditing(false);setBusy(false);setError('');};
  const loadDecks=async()=>{setError('');try{const {data,error:problem}=await withTimeout(supabase.from('presentation_decks').select('*').eq('owner_id',user.id).order('updated_at',{ascending:false}).limit(50));if(problem)throw problem;setDecks(data||[]);if(!data?.length)setError('No saved presentations yet. Use Build slides to create one.');}catch(e){setError(e.message);}};
  const total=nativeDeck?nativeDeck.content.slides.length:document?.numPages;
  return <section className="space-y-3 rounded-xl border p-3" aria-label="Slide presentation">
    {canPresent&&<><div className="flex flex-wrap gap-2"><button className="rounded border px-3 py-2" onClick={()=>setEditing(value=>!value)}>{editing?'Close slide builder':'Build slides'}</button><button className="rounded border px-3 py-2" onClick={loadDecks}>Choose saved presentation</button></div>{editing&&<div className="rounded-xl border p-3"><PresentationEditor onPresent={chooseDeck}/></div>}{!!decks.length&&<label className="block text-sm">Saved presentation<select aria-label="Saved presentation" className="block w-full rounded border bg-background p-2" value={nativeDeck?.id||''} onChange={e=>{const selected=decks.find(d=>d.id===e.target.value);if(selected)chooseDeck(selected);}}><option value="">Select a deck to present</option>{decks.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}</select></label>}<label className="block text-sm font-semibold">Present PDF slides<input type="file" accept="application/pdf,.pdf" onChange={upload} disabled={busy||rendering} className="mt-2 block max-w-full text-sm"/></label><p className="text-xs text-muted-foreground">Export PowerPoint or Canva slides as PDF. Up to 20 MB and 150 pages. Works on phones. The uploaded PDF is not saved; saved decks remain private to your account.</p><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={showAuthor} onChange={e=>setShowAuthor(e.target.checked)}/>Show author on uploaded PDF slides: {author}</label></>}
    {busy&&<p role="status">Opening slides…</p>}
    {error&&<p role="alert">{error}</p>}
    {(document||nativeDeck)&&<div className="space-y-2"><p className="break-words text-sm font-semibold">{title} · Page {page} of {total}</p><canvas ref={canvas} className="mx-auto h-auto max-w-full" aria-label="Your presented slide"/><div className="flex flex-wrap gap-2"><button className="rounded border px-3 py-2" disabled={page===1||rendering} onClick={()=>setPage(p=>p-1)}>Previous slide</button><button className="rounded border px-3 py-2" disabled={page===total||rendering} onClick={()=>setPage(p=>p+1)}>Next slide</button><button className="rounded border px-3 py-2" onClick={stop}>Stop presenting</button></div>{nativeDeck?.content.slides[page-1].notes&&<p className="rounded-lg bg-muted p-3 text-sm">Your speaker notes: {nativeDeck.content.slides[page-1].notes}</p>}{rendering&&<p role="status">Preparing slide…</p>}</div>}
    {Object.entries(received).map(([id,slide])=><figure key={id} className="space-y-2"><figcaption className="break-words text-sm font-semibold">{slide.title} · Page {slide.page} of {slide.total}</figcaption><img src={slide.image} alt={'Shared slide '+slide.page+' of '+slide.total} className="mx-auto h-auto max-w-full"/></figure>)}
    {!canPresent&&!Object.keys(received).length&&<p className="text-sm text-muted-foreground">Slides will appear here when a tutor or administrator presents.</p>}
  </section>;
}
