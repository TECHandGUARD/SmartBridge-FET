import {useEffect,useId} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {supabase} from '@/lib/supabaseClient';
import {validPrices} from '@/lib/subscription-pricing';
export default function useSubscriptionPrices(){
 const client=useQueryClient(),id=useId();
 useEffect(()=>{const channel=supabase.channel('subscription-prices-'+id).on('postgres_changes',{event:'UPDATE',schema:'public',table:'subscription_prices'},()=>client.invalidateQueries({queryKey:['subscription-prices']})).subscribe();return()=>{supabase.removeChannel(channel);};},[client,id]);
 return useQuery({queryKey:['subscription-prices'],queryFn:async()=>{
  const {data,error}=await supabase.from('subscription_prices').select('product,amount_cents,revision,updated_at');
  if(error||!validPrices(data))throw new Error('Current subscription prices are unavailable. Please retry before paying.');
  return data;
 },staleTime:0,refetchInterval:30000,refetchOnWindowFocus:true,retry:1});
}
