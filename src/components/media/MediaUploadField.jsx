import {useEffect,useRef,useState} from 'react';
import {supabase} from '@/lib/supabaseClient';

const IMAGE_TYPES=['image/jpeg','image/png','image/webp','image/gif'];
const VIDEO_TYPES=['video/mp4','video/webm'];
const field='block w-full rounded-xl border bg-background px-3 py-2 text-sm';
export default function MediaUploadField({bucket,pathPrefix,value,onChange,onUploaded=()=>{},disabled=false,compact=false}){
 const input=useRef(null),[busy,setBusy]=useState(false),[dragging,setDragging]=useState(false),[preview,setPreview]=useState(''),[error,setError]=useState('');
 useEffect(()=>{let live=true;setPreview('');if(!value?.path)return;const resolve=async()=>{const {data,error:problem}=await supabase.storage.from(bucket).createSignedUrl(value.path,3600);if(!live)return;setPreview(data?.signedUrl||'');if(problem)setError(problem.message);};resolve();return()=>{live=false;};},[bucket,value?.path]);
 const upload=async file=>{if(!file||busy||disabled)return;setError('');const allowed=[...IMAGE_TYPES,...VIDEO_TYPES];if(!allowed.includes(file.type)){setError('Choose a JPG, PNG, WebP, GIF, MP4 or WebM file.');return;}const isVideo=file.type.startsWith('video/'),limit=(isVideo?30:10)*1024*1024;if(file.size>limit){setError(`Choose a ${isVideo?'video under 30 MB':'image under 10 MB'}.`);return;}setBusy(true);try{const ext=(file.name.split('.').pop()|| (isVideo?'mp4':'jpg')).toLowerCase().replace(/[^a-z0-9]/g,'');const path=`${pathPrefix}/${crypto.randomUUID()}.${ext}`;const {error:problem}=await supabase.storage.from(bucket).upload(path,file,{contentType:file.type,upsert:false});if(problem)throw problem;onUploaded(path);onChange({path,kind:isVideo?'video':'image',name:file.name,caption:value?.caption||''});}catch(e){setError(e.message||'Upload failed. Try again.');}finally{setBusy(false);if(input.current)input.current.value='';}};
 const remove=()=>{if(!value?.path||busy)return;onChange(null);setError('');};
 return <div className="space-y-3">
  {!value?.path?<button type="button" disabled={disabled||busy} onClick={()=>input.current?.click()} onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);upload(e.dataTransfer.files?.[0]);}} className={`group flex min-h-32 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-5 text-center transition-all ${dragging?'border-primary bg-primary/10':'border-border hover:border-primary/60 hover:bg-muted/40'} disabled:opacity-50`}>
   <span className="mb-2 grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary text-xl">＋</span><span className="font-semibold">{busy?'Uploading media…':'Add image or video'}</span><span className="mt-1 text-xs text-muted-foreground">Drop a file here or browse · Images up to 10 MB · Videos up to 30 MB</span>
  </button>:<div className="overflow-hidden rounded-2xl border bg-card">
   {preview&&value.kind==='image'&&<img src={preview} alt={value.caption||value.name||'Uploaded media'} className={compact?'max-h-40 w-full object-contain bg-muted':'max-h-72 w-full object-contain bg-muted'}/>}
   {preview&&value.kind==='video'&&<video src={preview} controls playsInline preload="metadata" className={compact?'max-h-48 w-full bg-black':'max-h-80 w-full bg-black'} />}
   <div className="flex flex-wrap items-center justify-between gap-2 p-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{value.name||'Uploaded media'}</p><p className="text-xs text-muted-foreground">{value.kind==='video'?'Video':'Image'} · Stored in SmartBridge · changes apply when you save</p></div><button type="button" disabled={busy||disabled} onClick={remove} className="rounded-lg border px-3 py-2 text-xs font-semibold text-destructive disabled:opacity-50" >Remove media</button></div>
  </div>}
  <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" className="sr-only" disabled={disabled||busy} onChange={e=>upload(e.target.files?.[0])}/>
  {value?.path&&<label className="block space-y-1 text-sm">Media caption / alternative text<input className={field} maxLength={240} value={value.caption||''} onChange={e=>onChange({...value,caption:e.target.value})} placeholder="Describe this visual for learners and accessibility"/></label>}
  {busy&&<div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full w-2/3 animate-pulse rounded-full bg-primary"/></div>}
  {error&&<p role="alert" className="text-xs text-destructive">{error}</p>}
 </div>;
}
