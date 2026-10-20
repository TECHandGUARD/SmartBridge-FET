import {useEffect,useRef,useState} from 'react';
import {CameraOff,Clock3,ShieldCheck} from 'lucide-react';
import './call-studio.css';

export function CallButton({icon:Icon=null,children,className='',variant='default',...props}){
  return <button type="button" className={`studio-button studio-button--${variant} ${className}`} {...props}>{Icon&&<Icon size={18} aria-hidden="true"/>}<span>{children}</span></button>;
}

export function CallTimer({active}){
  const started=useRef(null);
  const [seconds,setSeconds]=useState(0);
  useEffect(()=>{
    if(!active){started.current=null;setSeconds(0);return;}
    started.current=Date.now();
    const timer=setInterval(()=>setSeconds(Math.floor((Date.now()-started.current)/1000)),1000);
    return()=>clearInterval(timer);
  },[active]);
  if(!active)return null;
  return <span className="studio-timer" aria-label="Time in this call"><Clock3 size={14} aria-hidden="true"/>{String(Math.floor(seconds/60)).padStart(2,'0')}:{String(seconds%60).padStart(2,'0')}</span>;
}

export function CallWorkspace({title,subtitle,joined,children}){
  return <section className="call-workspace" aria-label={title}>
    <header className="studio-room-header"><div><span className="studio-eyebrow">SmartBridge · Live space</span><h2>{title}</h2><p>{subtitle}</p></div><div className="studio-room-meta"><span className={`studio-presence ${joined?'is-active':''}`}><i aria-hidden="true"/>{joined?'In room':'Ready when you are'}</span><CallTimer active={joined}/><span className="studio-privacy"><ShieldCheck size={15} aria-hidden="true"/> No recording</span></div></header>
    {children}
  </section>;
}

export function VideoPlaceholder({name='You',note='Camera is off'}){
  const initials=name.trim().split(/\s+/).slice(0,2).map(word=>word[0]).join('').toUpperCase()||'SB';
  return <div className="studio-video-placeholder"><span className="studio-avatar" aria-hidden="true">{initials}</span><span>{name}</span><small><CameraOff size={13} aria-hidden="true"/>{note}</small></div>;
}
