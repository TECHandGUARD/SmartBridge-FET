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
  const allowed=/^(all|email|email_only|email_enabled)$/i.test(preference||'');
  async function save(next) {
    if(!supabase || !user?.id || saving)return;
    setSaving(true);setMessage('');
    const desired=next?'email':'none';
    const {data,error}=await supabase.from('users')
      .update({communication_preferences:desired})
      .eq('id',user.id)
      .select('communication_preferences').single();
    setSaving(false);
    if(error){setMessage('Could not save your choice. Please try again.');return;}
    setPreference(data.communication_preferences);
    setMessage(next?'Profile reminder emails enabled.':'Optional profile reminder emails disabled.');
  }
  return <section className="rounded-xl border bg-card p-4 space-y-3" aria-label="Tutor profile email preferences">
    <h2 className="font-semibold">Tutor profile email reminders</h2>
    <p className="text-sm text-muted-foreground">Choose whether SmartBridge FET may email you helpful reminders if your tutor profile is incomplete after 2–3 days. These are account-support reminders, not promotions. You can turn them off at any time.</p>
    <p className="text-sm">Preference: <strong>{preference===null?'Loading…':allowed?'On':preference==='none'?'Off':'Not chosen'}</strong></p>
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" disabled={saving || preference===null || allowed} onClick={()=>save(true)}>Enable reminders</Button>
      <Button type="button" size="sm" variant="outline" disabled={saving || preference===null || preference==='none'} onClick={()=>save(false)}>Turn off reminders</Button>
    </div>
    {message && <p className="text-sm" role="status">{message}</p>}
  </section>;
}
