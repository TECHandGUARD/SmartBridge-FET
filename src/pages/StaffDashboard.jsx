import WorkspaceHeader from '@/components/dashboard/WorkspaceHeader';
import {lazy,Suspense,useCallback,useEffect,useRef,useState} from 'react';
import {useAuth} from '@/lib/AuthContext';
import {supabase} from '@/lib/supabaseClient';
import {withTimeout} from '@/lib/auth-utils';
import {STAFF_DUTIES,staffPermissions} from '@/lib/staff-access';
import {Button} from '@/components/ui/button';
const PANELS={
 resources:lazy(()=>import('@/components/admin/StaffResourceReview')),
 assessments:lazy(()=>import('@/components/admin/AssessmentModerationPanel')),
 study_moderation:lazy(()=>import('@/components/admin/StudyModerationPanel')),
 announcements:lazy(()=>import('@/components/admin/AnnouncementManager')),
 universities:lazy(()=>import('@/components/admin/UniversityDirectoryAdmin')),
};
export default function StaffDashboard(){
 const {user,isAdmin}=useAuth();
 const [access,setAccess]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[selected,setSelected]=useState('');
 const generation=useRef(0);
 const load=useCallback(async()=>{const version=++generation.current;try{
  const {data,error}=await withTimeout(supabase.rpc('get_staff_access'));if(error)throw error;
  if(version===generation.current){setAccess(data);setError('');}
 }catch(e){if(version===generation.current){setAccess(null);setError(e.message);}}finally{if(version===generation.current)setLoading(false);}},[]);
 useEffect(()=>{load();const timer=setInterval(load,30000);window.addEventListener('focus',load);return()=>{++generation.current;clearInterval(timer);window.removeEventListener('focus',load);};},[load]);
 const permissions=isAdmin?STAFF_DUTIES.map(d=>d.key):staffPermissions(access);
 const active=permissions.includes(selected)?selected:permissions[0];const Panel=PANELS[active];
 return <div className="mx-auto max-w-6xl space-y-6 px-3 py-4 sm:px-6 sm:py-8 lg:px-8">
 <WorkspaceHeader
   title="Staff workspace"
   description={`${user?.full_name || 'Staff'} · Review the duties assigned to your account.`}
   actions={<Button variant="outline" onClick={load}>Refresh access</Button>}
 />

 {loading?<p role="status">Checking staff permissions…</p>:error?<p role="alert">Could not check staff access: {error}. Use Refresh access to retry.</p>:!permissions.length?<p role="alert">Staff access is not enabled for this account. Ask your full administrator to assign duties.</p>:<><nav aria-label="Staff duties" className="flex flex-wrap gap-2">{STAFF_DUTIES.filter(d=>permissions.includes(d.key)).map(d=><Button key={d.key} variant={active===d.key?'default':'outline'} aria-pressed={active===d.key} onClick={()=>setSelected(d.key)}>{d.label}</Button>)}</nav><Suspense fallback={<p role="status">Loading workspace…</p>}><Panel key={active}/></Suspense></>}
 </div>;
}
