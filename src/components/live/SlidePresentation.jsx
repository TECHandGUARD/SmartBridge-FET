import {useEffect,useRef,useState} from 'react';
import {getDocument,GlobalWorkerOptions} from 'pdfjs-dist';
import {supabase} from '@/lib/supabaseClient';
import {useAuth} from '@/lib/AuthContext';
import PresentationEditor from '@/components/presentations/PresentationEditor';
import {addPdfBrand,renderDeckSlide,exportDeckPdf} from '@/lib/presentation-decks';
import {withTimeout} from '@/lib/auth-utils';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
GlobalWorkerOptions.workerSrc=workerUrl;

export default function SlidePresentation({transport,received,canPresent}) {
  const {user}=useAuth();
  const [liveEdit,setLiveEdit]=useState(false),[slideDraft,setSlideDraft]=useState({title:'',body:''}),[liveNotice,setLiveNotice]=useState(''),[saveBusy,setSaveBusy]=useState(false);
  const lastSaved=useRef(null),saveLock=useRef(false);
  const [pdfCorrections,setPdfCorrections]=useState({}),[pdfDraft,setPdfDraft]=useState('');
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
      if(pdfCorrections[page]){const ctx=element.getContext('2d'),size=Math.max(16,Math.round(element.width/45)),lines=pdfCorrections[page].split('\n').slice(0,6),height=(lines.length+1)*size*1.4;ctx.fillStyle='#fffbe8';ctx.fillRect(0,element.height-height,element.width,height);ctx.fillStyle='#111827';ctx.font=size+'px sans-serif';lines.forEach((line,i)=>ctx.fillText(line,16,element.height-height+(i+1)*size*1.4,element.width-32));}

      transport.publish({image:element.toDataURL('image/jpeg',0.8),title,page,total:document.numPages});
    })().catch(e=>{if(!cancelled)setError(e.message||'Unable to present this page.');}).finally(()=>{if(!cancelled)setRendering(false);});
    return()=>{cancelled=true;renderTask?.cancel();};
  },[document,nativeDeck,page,title,transport,showAuthor,author,pdfCorrections]);
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
      setPdfCorrections({});setPdfDraft('');setNativeDeck(null);setDocument(pdf);setPage(1);setTitle(file.name.slice(0,120));
    }catch(e){if(attempt===generation.current)setError(e.name==='PasswordException'?'Remove the PDF password before presenting.':e.message||'Unable to open this PDF.');}
    finally{if(attempt===generation.current)setBusy(false);}
  };
  const stop=()=>{setLiveEdit(false);setLiveNotice('');generation.current++;renderRevision.current++;transport.publish(null);setDocument(null);setNativeDeck(null);task.current?.destroy();task.current=null;setBusy(false);setRendering(false);setError('');};
  const chooseDeck=deck=>{lastSaved.current=deck.id?structuredClone(deck):null;setLiveEdit(false);setLiveNotice('');generation.current++;renderRevision.current++;transport.publish(null);task.current?.destroy();task.current=null;setDocument(null);setNativeDeck(structuredClone(deck));setPage(1);setTitle(deck.title);setEditing(false);setBusy(false);setError('');};
  const loadDecks=async()=>{setError('');try{const {data,error:problem}=await withTimeout(supabase.from('presentation_decks').select('*').eq('owner_id',user.id).order('updated_at',{ascending:false}).limit(50));if(problem)throw problem;setDecks(data||[]);if(!data?.length)setError('No saved presentations yet. Use Build slides to create one.');}catch(e){setError(e.message);}};
  const beginLiveEdit=()=>{const slide=nativeDeck.content.slides[page-1];setSlideDraft({title:slide.title,body:slide.body});setLiveEdit(true);setLiveNotice('');};
  const applyLiveEdit=()=>{
    if(!slideDraft.title.trim()){setError('Add a slide title before showing the correction.');return;}
    setNativeDeck(previous=>({...previous,content:{...previous.content,slides:previous.content.slides.map((slide,i)=>i===page-1?{...slide,...slideDraft}:slide)}}));
    setLiveEdit(false);setError('');setLiveNotice('Correction is live for everyone in the call. Save changes to keep it in your deck.');
  };
  const saveLiveChanges=async()=>{
    if(saveLock.current||!nativeDeck?.id||!lastSaved.current)return;
    saveLock.current=true;setSaveBusy(true);setError('');
    const snapshot=structuredClone(nativeDeck),revision=lastSaved.current.revision,attempt=generation.current;
    try{
      const {data,error:problem}=await withTimeout(supabase.from('presentation_decks').update({title:snapshot.title,content:snapshot.content}).eq('id',snapshot.id).eq('owner_id',user.id).eq('revision',revision).select('*').maybeSingle());
      if(problem)throw problem;if(!data)throw new Error('The saved deck changed on another device. Your live correction is still being shown; download a copy before reloading.');
      if(attempt!==generation.current)return;lastSaved.current=data;setNativeDeck(previous=>previous?.id===data.id?{...previous,revision:data.revision}:previous);setLiveNotice('Live slide changes saved to your account.');
    }catch(e){setError(e.message||'Could not save. Your live correction is still visible.');}finally{saveLock.current=false;setSaveBusy(false);}
  };
  const downloadCorrectedPage=async()=>{try{const {jsPDF}=await import('jspdf');const element=canvas.current;const pdf=new jsPDF({orientation:element.width>element.height?'landscape':'portrait',unit:'px',format:[element.width,element.height]});pdf.addImage(element.toDataURL('image/jpeg',0.9),'JPEG',0,0,element.width,element.height);pdf.save('corrected-slide-'+page+'.pdf');}catch(e){setError(e.message);}};
  const total=nativeDeck?nativeDeck.content.slides.length:document?.numPages;
  return <section className="space-y-3 rounded-xl border p-3" aria-label="Slide presentation">
    {canPresent&&<><div className="flex flex-wrap gap-2"><button className="rounded border px-3 py-2" onClick={()=>setEditing(value=>!value)}>{editing?'Close slide builder':'Build slides'}</button><button className="rounded border px-3 py-2" onClick={loadDecks}>Choose saved presentation</button></div>{editing&&<div className="rounded-xl border p-3"><PresentationEditor onPresent={chooseDeck}/></div>}{!!decks.length&&<label className="block text-sm">Saved presentation<select aria-label="Saved presentation" className="block w-full rounded border bg-background p-2" value={nativeDeck?.id||''} onChange={e=>{const selected=decks.find(d=>d.id===e.target.value);if(selected)chooseDeck(selected);}}><option value="">Select a deck to present</option>{decks.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}</select></label>}<label className="block text-sm font-semibold">Present PDF slides<input type="file" accept="application/pdf,.pdf" onChange={upload} disabled={busy||rendering} className="mt-2 block max-w-full text-sm"/></label><p className="text-xs text-muted-foreground">Export PowerPoint or Canva slides as PDF. Up to 20 MB and 150 pages. Works on phones. The uploaded PDF is not saved; saved decks remain private to your account.</p><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={showAuthor} onChange={e=>setShowAuthor(e.target.checked)}/>Show author on uploaded PDF slides: {author}</label></>}
    {busy&&<p role="status">Opening slides…</p>}
    {error&&<p role="alert">{error}</p>}
    {(document||nativeDeck)&&<div className="space-y-2"><p className="break-words text-sm font-semibold">{title} · Page {page} of {total}</p><canvas ref={canvas} className="mx-auto h-auto max-w-full" aria-label="Your presented slide"/><div className="flex flex-wrap gap-2"><button className="rounded border px-3 py-2" disabled={page===1||rendering} onClick={()=>{setLiveEdit(false);setPdfDraft(pdfCorrections[page-1]||'');setPage(p=>p-1);}}>Previous slide</button><button className="rounded border px-3 py-2" disabled={page===total||rendering} onClick={()=>{setLiveEdit(false);setPdfDraft(pdfCorrections[page+1]||'');setPage(p=>p+1);}}>Next slide</button><button className="rounded border px-3 py-2" onClick={stop}>Stop presenting</button></div>{document&&canPresent&&<div className="space-y-2 rounded border p-3"><label className="block text-sm">Correction on PDF slide<textarea aria-label="Correction on PDF slide" rows={3} maxLength={360} className="block w-full rounded border bg-background p-2" value={pdfDraft} onChange={e=>setPdfDraft(e.target.value)}/></label><p className="text-xs text-muted-foreground">Add up to six short lines to the current slide, including maths symbols. This annotation is shared live; the original PDF text stays in place.</p><div className="flex flex-wrap gap-2"><button className="rounded border px-3 py-2" onClick={()=>setPdfCorrections(previous=>({...previous,[page]:pdfDraft}))}>Show PDF correction</button><button className="rounded border px-3 py-2" onClick={()=>{setPdfDraft('');setPdfCorrections(previous=>({...previous,[page]:''}));}}>Clear PDF correction</button><button disabled={rendering} className="rounded border px-3 py-2" onClick={downloadCorrectedPage}>Download corrected page</button></div></div>}{nativeDeck&&canPresent&&<div className="space-y-3 rounded-lg border p-3"><div className="flex flex-wrap gap-2"><button className="rounded border px-3 py-2" onClick={beginLiveEdit}>Edit current slide</button><button disabled={saveBusy} className="rounded border px-3 py-2 disabled:opacity-50" onClick={saveLiveChanges}>{saveBusy?'Saving…':'Save live changes'}</button><button className="rounded border px-3 py-2" onClick={()=>exportDeckPdf(nativeDeck,author).catch(e=>setError(e.message))}>Download corrected PDF</button></div>{liveEdit&&<div className="space-y-2"><label className="block text-sm">Live slide title<input aria-label="Live slide title" maxLength={100} className="block w-full rounded border bg-background p-2" value={slideDraft.title} onChange={e=>setSlideDraft({...slideDraft,title:e.target.value})}/></label><label className="block text-sm">Live slide content<textarea aria-label="Live slide content" rows={6} maxLength={1600} className="block w-full rounded border bg-background p-2" value={slideDraft.body} onChange={e=>setSlideDraft({...slideDraft,body:e.target.value})}/></label><p className="text-xs text-muted-foreground">Use mathematical symbols such as ², √, × and ÷. Show correction updates everyone's slide without ending the call.</p><div className="flex gap-2"><button className="rounded border px-3 py-2" onClick={applyLiveEdit}>Show correction</button><button className="rounded border px-3 py-2" onClick={()=>setLiveEdit(false)}>Cancel correction</button></div></div>}{liveNotice&&<p role="status" className="text-sm">{liveNotice}</p>}</div>}{nativeDeck?.content.slides[page-1].notes&&<p className="rounded-lg bg-muted p-3 text-sm">Your speaker notes: {nativeDeck.content.slides[page-1].notes}</p>}{rendering&&<p role="status">Preparing slide…</p>}</div>}
    {Object.entries(received).map(([id,slide])=><figure key={id} className="space-y-2"><figcaption className="break-words text-sm font-semibold">{slide.title} · Page {slide.page} of {slide.total}</figcaption><img src={slide.image} alt={'Shared slide '+slide.page+' of '+slide.total} className="mx-auto h-auto max-w-full"/></figure>)}
    {!canPresent&&!Object.keys(received).length&&<p className="text-sm text-muted-foreground">Slides will appear here when a tutor or administrator presents.</p>}
  </section>;
}
