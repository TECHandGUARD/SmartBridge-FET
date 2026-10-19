import {getAccountDestination} from './navigation.js';
const key='smartbridge-meeting-return';
export const meetingReturnPath=value=>typeof value==='string'&&/^\/meetings\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)?value:null;
export function rememberMeetingReturn(path,storage=undefined){
  const safe=meetingReturnPath(path);if(!safe)return;
  try{(storage||window.sessionStorage).setItem(key,JSON.stringify({path:safe,expires:Date.now()+30*60000}));}catch{/* Sign-in still works when tab storage is unavailable. */}
}
export function pendingMeetingReturn(storage=undefined){
  try{const saved=JSON.parse((storage||window.sessionStorage).getItem(key)||'null');return saved?.expires>Date.now()?meetingReturnPath(saved.path):null;}catch{return null;}
}
export function clearMeetingReturn(path,storage=undefined){
  try{if(pendingMeetingReturn(storage)===path)(storage||window.sessionStorage).removeItem(key);}catch{/* Storage may be disabled. */}
}
export function meetingSignInDestination(user,path){
  const destination=getAccountDestination(user);
  if(destination==='/onboarding'||!user||(!user.is_super_admin&&!['admin','parent','tutor','sace_tutor','student_tutor'].includes(user.role)))return destination;
  return meetingReturnPath(path)||destination;
}
