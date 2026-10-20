import {useMemo,useRef,useState} from 'react';
import {createSlideTransport} from './slide-transport';
export function useSlidePresentation(scope,userId,presenters) {
  const [received,setReceived]=useState({});
  const allowed=useRef(presenters);allowed.current=presenters;
  const transport=useMemo(()=>createSlideTransport({
    canReceive:id=>allowed.current.includes(id),
    onSlide:(id,slide)=>setReceived(previous=>{const next={...previous};if(slide)next[id]=slide;else delete next[id];return next;})
  }),[scope,userId]);
  return {transport,received};
}
