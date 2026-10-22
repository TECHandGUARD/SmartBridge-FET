import {useEffect,useState} from 'react';
import {Link,useParams} from 'react-router-dom';
import {supabase} from '@/lib/supabaseClient';
import {withTimeout} from '@/lib/auth-utils';
import {safePublicUrl} from '@/lib/marketing';
import PublicShell from '@/components/marketing/PublicShell';
import ShareLinks from '@/components/marketing/ShareLinks';
export default function PublicTutors(){
 const {tutorId}=useParams();const [rows,setRows]=useState([]),[query,setQuery]=useState(''),[state,setState]=useState('Loading tutors…');
 useEffect(()=>{let live=true;setState('Loading tutors…');setRows([]);withTimeout(supabase.rpc('public_tutors',{p_id:tutorId||null})).then(({data,error})=>{if(live){setRows(error?[]:data||[]);setState(error?'Tutors could not be loaded. Please try again.':'');}}).catch(()=>{if(live)setState('Tutors could not be loaded. Please try again.');});return()=>{live=false;};},[tutorId]);
 const filtered=rows.filter(t=>(t.full_name+' '+(t.subjects||[]).join(' ')).toLowerCase().includes(query.toLowerCase()));
 return <PublicShell><div className="max-w-3xl mb-8"><p className="learn-eyebrow">EXPLORE BEFORE YOU JOIN</p><h1 className="text-4xl font-bold mb-3">{tutorId?'Meet your tutor':'Find a tutor'}</h1><p>Browse approved tutor profiles. Sign in to check availability, message a tutor or request a booking.</p></div>{!tutorId&&<label className="block mb-8">Search by name or subject<input className="block p-3 border rounded-xl w-full max-w-xl bg-white" value={query} onChange={e=>setQuery(e.target.value)}/></label>}
 {state?<p role="status">{state}</p>:!filtered.length?<p>No matching tutor profiles are available.</p>:<div className="grid md:grid-cols-2 gap-6">{filtered.map(t=><article className="bg-white border rounded-2xl p-6 space-y-4 min-w-0" key={t.id}>{safePublicUrl(t.avatar_url)&&<img className="w-20 h-20 object-cover rounded-full" alt={t.full_name} src={safePublicUrl(t.avatar_url)} loading="lazy" referrerPolicy="no-referrer"/>}<p className="text-sm">Approved tutor</p><h2 className="text-2xl font-bold break-words">{t.full_name}</h2><p className="whitespace-pre-wrap break-words">{t.bio}</p><p>{(t.subjects||[]).join(' · ')}</p><p>{(t.grades||[]).join(' · ')}</p>{t.hourly_rate!=null&&<p>R{Number(t.hourly_rate).toFixed(2)} per hour</p>}{t.offers_free_intro&&<p>Offers a free introductory session</p>}<Link className="learn-button" to="/tutors">Sign in to contact or book</Link>{!tutorId&&<Link className="block underline" to={'/find-tutors/'+t.id}>Open profile</Link>}<ShareLinks path={'/find-tutors/'+t.id} title={'Meet '+t.full_name+' on SmartBridge FET'}/></article>)}</div>}</PublicShell>;
}
