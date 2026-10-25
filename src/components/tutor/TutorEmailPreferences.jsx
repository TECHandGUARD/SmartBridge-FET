import {useEffect,useState} from 'react';
import {supabase} from '@/lib/supabaseClient';
import {Button} from '@/components/ui/button';

export default function TutorEmailPreferences({user}) {
  const [preference,setPreference]=useState(null);
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState('');
  useEffect(()=>{
    let mounted=true;
    if(!user?.id || !supabase)return undefined;
    supabase.from('users').select('communication_preferences').eq('id',user.id).single()
      .then(({data,error})=>{
        if(!mounted)return;
        if(error){setMessage('Your email preference is unavailable.');return;}
        setPreference(data?.communication_preferences ?? '');
      });
    return()=>{mounted=false;};
  },[user?.id]);
  const allowed=preference!==null && preference!=='none';
  async function save(next) {
    if(!supabase || !user?.id || saving)return;
    setSaving(true);setMessage('');
    const desired=next?'email':'none';
    const {data,error}=next
      ? await supabase.rpc('coo_reenable_reminders')
      : await supabase.from('users').update({communication_preferences:desired})
          .eq('id',user.id).select('communication_preferences').single();
    setSaving(false);
    if(error){setMessage('Could not save your choice. Please try again.');return;}
    setPreference(next?'email':data.communication_preferences);
    setMessage(next?'Profile reminder emails enabled.':'Optional profile reminder emails disabled.');
  }
  return <section className="rounded-xl border bg-card p-4 space-y-3" aria-label="Tutor profile email preferences">
    <h2 className="font-semibold">Tutor profile email reminders</h2>
    <p className="text-sm text-muted-foreground">Administrators may send account-support reminders if your tutor profile stays incomplete for 2–3 days. These are not promotional emails. You can stop future reminders here or through a link in each email.</p>
    <p className="text-sm">Preference: <strong>{preference===null?'Loading…':preference==='none'?'Off':'On (admin-managed)'}</strong></p>
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" disabled={saving || preference===null || allowed} onClick={()=>save(true)}>Enable reminders</Button>
      <Button type="button" size="sm" variant="outline" disabled={saving || preference===null || preference==='none'} onClick={()=>save(false)}>Turn off reminders</Button>
    </div>
    {message && <p className="text-sm" role="status">{message}</p>}
  </section>;
}
