import {useMemo,useState} from 'react';
import {createCallChat} from './call-chat';
export function useCallChat(scope,userId){
 const [messages,setMessages]=useState([]),[peers,setPeers]=useState(0);
 const transport=useMemo(()=>createCallChat({userId,onMessage:message=>setMessages(previous=>[...previous,message].slice(-100)),onPeers:setPeers,onReset:()=>setMessages([])}),[scope,userId]);
 return {transport,messages,peers};
}
