import {useCallback,useEffect,useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {supabase} from '@/lib/supabaseClient';
import {PLAN_LABELS,priceToCents,validPrices} from '@/lib/subscription-pricing';
import {Card,CardHeader,CardTitle,CardContent} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {toast} from 'sonner';
export default function SubscriptionPricingPanel(){
 const [rows,setRows]=useState([]),[drafts,setDrafts]=useState({}),[loading,setLoading]=useState(true),[error,setError]=useState(''),[saving,setSaving]=useState('');
 const queryClient=useQueryClient();
 const load=useCallback(async()=>{
  setLoading(true);setError('');
  try{const {data,error:failure}=await supabase.from('subscription_prices').select('product,amount_cents,revision,updated_at');
   if(failure||!validPrices(data))throw new Error('Pricing settings unavailable.');
   setRows(data);setDrafts(Object.fromEntries(data.map(row=>[row.product,(row.amount_cents/100).toFixed(2)])));
  }catch(failure){setError(failure.message);}finally{setLoading(false);}
 },[]);
 useEffect(()=>{load();},[load]);
 const save=async row=>{
  const cents=priceToCents(drafts[row.product]);if(cents===null){toast.error('Enter a price from a positive rand amount, with up to two decimal places.');return;}
  setSaving(row.product);
  try{const {data,error:failure}=await supabase.rpc('set_subscription_price',{product_key:row.product,new_amount_cents:cents,expected_revision:row.revision});
   if(failure)throw failure;
   setRows(previous=>previous.map(item=>item.product===row.product?data:item));
   setDrafts(previous=>({...previous,[row.product]:(data.amount_cents/100).toFixed(2)}));
   await queryClient.invalidateQueries({queryKey:['subscription-prices']});
   toast.success(PLAN_LABELS[row.product]+' price saved.');
  }catch(failure){toast.error(failure.message||'Could not save price.');}finally{setSaving('');}
 };
 return <div className="space-y-5">
  <div><h2 className="font-playfair text-2xl font-bold">Subscription pricing</h2><p className="text-sm text-muted-foreground mt-2">Set the ZAR price for one month of access. Saved prices apply to new integrated checkouts and the Premium page without a code change.</p></div>
  <p className="rounded-xl border bg-muted/30 p-4 text-sm">Existing paid access and payment orders keep their original amounts. Fixed Yoco payment links are managed separately and are not updated here. Automatic recurring billing is not enabled.</p>
  <Button variant="outline" onClick={load} disabled={loading||!!saving}>Reload prices</Button>
  {loading?<p role="status">Loading prices…</p>:error?<p role="alert">{error}</p>:<div className="grid md:grid-cols-3 gap-4">{rows.map(row=>{
   const next=priceToCents(drafts[row.product]);
   return <Card key={row.product}><CardHeader><CardTitle>{PLAN_LABELS[row.product]}</CardTitle></CardHeader><CardContent className="space-y-4">
    <p className="text-sm text-muted-foreground">Current price: <strong className="text-foreground">R{(row.amount_cents/100).toFixed(2)}</strong></p>
    <label className="block text-sm" htmlFor={'price-'+row.product}>New monthly price (ZAR)</label>
    <Input id={'price-'+row.product} inputMode="decimal" value={drafts[row.product]||''} onChange={event=>setDrafts(previous=>({...previous,[row.product]:event.target.value}))} disabled={!!saving}/>
    <p className="text-sm" aria-live="polite">{next===null?'Enter a positive amount, using at most two decimal places.':next===row.amount_cents?'No price change.':'New checkouts: R'+(next/100).toFixed(2)+' for one month.'}</p>
    <Button className="w-full" disabled={!!saving||next===null||next===row.amount_cents} onClick={()=>save(row)}>{saving===row.product?'Saving…':'Save '+PLAN_LABELS[row.product]+' price'}</Button>
   </CardContent></Card>;
  })}</div>}
 </div>;
}
