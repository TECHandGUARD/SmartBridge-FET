import {useState} from 'react';
export default function ShareLinks({path,title}) {
 const [notice,setNotice]=useState('');
 const url = new URL(path,window.location.origin).href;
 async function copy(){try{await navigator.clipboard.writeText(url);setNotice('Link copied');}catch{setNotice('Copy this link: '+url);}}
 return <div className="flex flex-wrap items-center gap-3 text-sm"><a className="underline" href={'https://wa.me/?text='+encodeURIComponent(title+' '+url)} target="_blank" rel="noopener noreferrer">Share on WhatsApp</a><button type="button" className="underline" onClick={copy}>Copy link</button><span role="status" className="break-all">{notice}</span></div>;
}
