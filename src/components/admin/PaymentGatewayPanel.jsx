import {useCallback, useEffect, useState} from 'react';
import {supabase} from '@/lib/supabaseClient';
import {appConfig} from '@/lib/config';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {toast} from 'sonner';

export default function PaymentGatewayPanel(){
 const [checkoutActive,setCheckoutActive]=useState(false);
 const [gateways,setGateways]=useState([]),[loading,setLoading]=useState(true),[saving,setSaving]=useState(''),[error,setError]=useState('');
 const load=useCallback(async()=>{setLoading(true);setError('');try{
  const {data,error:failure}=await supabase.functions.invoke('payment-gateways',{body:{action:'admin-list'}});if(failure)throw failure;setGateways(data.gateways||[]);setCheckoutActive(data.checkout_active===true);
 }catch(failure){setError(failure.message||'Payment settings unavailable.');}finally{setLoading(false);}},[]);
 useEffect(()=>{load();},[load]);
 const update=(id,values)=>setGateways(items=>items.map(item=>item.provider===id?{...item,...values}:item));
 const save=async(item)=>{setSaving(item.provider);try{
  const {error:failure}=await supabase.functions.invoke('payment-gateways',{body:{action:'save',provider:item.provider,enabled:item.enabled,mode:item.mode,priority:item.priority}});if(failure)throw failure;toast.success(`${item.name} settings saved`);await load();
 }catch(failure){toast.error(failure.message||'Could not save gateway settings.');}finally{setSaving('');}};
 return <div className="space-y-4">
  <div><h2 className="font-playfair text-xl font-bold">Payment gateways</h2><p className="text-sm text-muted-foreground">Choose which payment options customers can use. You can keep a gateway disabled until you have an account and are ready to accept payments.</p></div>
  {!loading&&!error&&(!checkoutActive||!appConfig.paymentsApiEnabled)&&<p role="status" className="text-sm text-amber-700">Online checkout is paused for this app. You can save gateway settings; customers will see them after checkout is activated.</p>}
  {loading?<p role="status">Loading payment settings…</p>:error?<div role="alert" className="space-y-2"><p>{error}</p><Button variant="outline" onClick={load}>Retry</Button></div>:gateways.map(item=>{
   const ready=item.mode==='test'?item.test_ready:item.live_ready;
   return <Card key={item.provider}><CardHeader><CardTitle className="flex flex-wrap items-center gap-3">{item.name}<Badge variant={item.enabled?'default':'secondary'}>{item.enabled?'Enabled':'Disabled'}</Badge></CardTitle></CardHeader><CardContent className="space-y-4">
    <p className="text-sm">{ready?'Credentials configured. Complete payment testing before accepting live payments.':'Not connected for this mode. Create your provider account and configure its credentials securely before enabling it.'}</p>
    <div className="flex flex-wrap gap-4 items-end">
     <label className="text-sm space-y-1"><span className="block">Mode</span><select className="border rounded-md p-2 bg-background" value={item.mode} onChange={event=>update(item.provider,{mode:event.target.value,enabled:false})}><option value="test">Test payments</option><option value="live">Live payments</option></select></label>
     <label className="text-sm space-y-1"><span className="block">Display order</span><input className="border rounded-md p-2 w-24 bg-background" type="number" min="0" max="100" value={item.priority} onChange={event=>update(item.provider,{priority:Number(event.target.value)})}/></label>
     <label className="flex gap-2 items-center text-sm"><input type="checkbox" checked={item.enabled} disabled={!ready&&!item.enabled} onChange={event=>update(item.provider,{enabled:event.target.checked})}/>Offer this gateway at checkout</label>
     <Button disabled={!!saving} onClick={()=>save(item)}>{saving===item.provider?'Saving…':'Save settings'}</Button>
    </div>
    <div className="text-sm"><p className="font-medium">Provider callback address</p><p className="break-all text-muted-foreground">{appConfig.supabaseUrl}/functions/v1/{item.webhook}</p></div>
   </CardContent></Card>;
  })}
  <p className="text-sm text-muted-foreground">Yoco and Paystack are supported. Additional gateways can be added as your business grows. One-off premium payments and eligible full live booking refunds are supported. The payment webhook also receives refund confirmations. Recurring billing and tutor bank transfers are not automated.</p>
 </div>;
}
