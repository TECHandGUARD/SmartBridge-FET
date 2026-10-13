import {useEffect,useState} from 'react';
import {useAuth} from '@/lib/AuthContext';
import {supabase} from '@/lib/supabaseClient';
import {Button} from '@/components/ui/button';
import {Card,CardContent} from '@/components/ui/card';
import StudyRoomBoard from '@/components/study/StudyRoomBoard';
import {toast} from 'sonner';
export default function GroupStudyRooms(){
 const {user}=useAuth();const [rooms,setRooms]=useState([]),[selected,setSelected]=useState(null),[joined,setJoined]=useState(false),[loading,setLoading]=useState(true),[joining,setJoining]=useState(false),[error,setError]=useState('');
 const load=async()=>{setLoading(true);setError('');const {data,error}=await supabase.from('study_rooms').select('id,name').eq('is_active',true).order('name');if(error)setError('Study rooms could not be loaded. Please retry.');else{setRooms(data||[]);setSelected(data?.[0]||null);}setLoading(false);};
 useEffect(()=>{load();},[]);
 const join=async()=>{if(!selected||joining)return;setJoining(true);try{const {data,error}=await supabase.rpc('join_study_room',{chosen_room:selected.id});if(error||data!==true)throw new Error('This room is available to active learner and verified tutor accounts.');setJoined(true);}catch(error){toast.error(error.message);}finally{setJoining(false);}};
 return <main className="max-w-6xl mx-auto px-4 py-8 space-y-6"><div><h1 className="font-playfair text-3xl font-bold">Group study rooms</h1><p className="text-muted-foreground mt-2">Share notes and questions with other learners. Posts and replies are reviewed before publication.</p></div>{loading?<p role="status">Loading rooms…</p>:error?<div role="alert"><p>{error}</p><Button type="button" onClick={load}>Retry</Button></div>:<div className="grid md:grid-cols-[220px_1fr] gap-6"><nav aria-label="Study rooms" className="space-y-2">{rooms.map(room=><Button key={room.id} type="button" className="w-full justify-start" variant={selected?.id===room.id?'default':'outline'} aria-pressed={selected?.id===room.id} onClick={()=>{setSelected(room);setJoined(false);}}>{room.name}</Button>)}</nav>{selected?(joined?<StudyRoomBoard key={selected.id} room={selected} user={user}/>:<Card><CardContent className="pt-6 space-y-3"><h2 className="font-semibold text-xl">{selected.name}</h2><p>Join this room to read approved posts and submit your own notes or questions. Avoid sharing private contact information.</p><Button type="button" disabled={joining} onClick={join}>{joining?'Joining…':'Join study room'}</Button></CardContent></Card>):<p>No rooms are currently available for your account.</p>}</div>}</main>;
}
