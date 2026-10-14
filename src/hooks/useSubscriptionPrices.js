import {useQuery} from '@tanstack/react-query';
import {supabase} from '@/lib/supabaseClient';
import {validPrices} from '@/lib/subscription-pricing';
export default function useSubscriptionPrices(){
 return useQuery({queryKey:['subscription-prices'],queryFn:async()=>{
  const {data,error}=await supabase.from('subscription_prices').select('product,amount_cents,revision,updated_at');
  if(error||!validPrices(data))throw new Error('Current subscription prices are unavailable. Please retry before paying.');
  return data;
 },staleTime:0,refetchInterval:30000,refetchOnWindowFocus:true,retry:1});
}
