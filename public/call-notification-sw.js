/* SmartBridge FET notification worker: no private content cached. */
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>{
 let message={};try{message=event.data?.json()||{};}catch{message={};}
 const isCall=message.type==='incoming_adult_call';
 const title=isCall?'Incoming SmartBridge call':'SmartBridge FET';
 const options={body:isCall?'An approved contact is calling you. Tap to open SmartBridge and answer.':'You have a new notification.',tag:isCall?'smartbridge-incoming-call':'smartbridge-notice',renotify:isCall,requireInteraction:isCall,vibrate:isCall?[350,180,350,180,350]:[150],icon:'/icons/smartbridge-192.png',badge:'/icons/smartbridge-192.png',data:{url:'/meetings'}};
 event.waitUntil(self.registration.showNotification(title,options));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 event.waitUntil((async()=>{
 const target=new URL('/meetings',self.location.origin);
 const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
 for(const client of windows){if(new URL(client.url).origin===target.origin){await client.navigate(target.href);return client.focus();}}
 return self.clients.openWindow(target.href);
 })());
});