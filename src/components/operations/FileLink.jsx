import {useState} from 'react';
import {supabase} from '@/lib/supabaseClient';
import {resolveFile} from '@/lib/private-storage';
import {toast} from 'sonner';
export default function FileLink({reference,children,className=''}){
 const [opening,setOpening]=useState(false);
 const open=async()=>{
  const tab=window.open('about:blank','_blank');if(tab)tab.opener=null;setOpening(true);
  try{const url=await resolveFile(supabase,reference);if(tab)tab.location.href=url;else throw new Error('Allow pop-ups to open this file.');}
  catch(error){tab?.close();toast.error(error.message||'File access unavailable.');}finally{setOpening(false);}
 };
 return <button type="button" className={className||'text-primary hover:underline inline-flex items-center gap-1'} aria-label={typeof children==='string'?undefined:'Open file'} disabled={opening} onClick={open}>{opening?'Opening…':children}</button>;
}
