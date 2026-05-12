import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Users, MessageCircle, Send, Plus, Hash, Lock } from 'lucide-react';
import { SUBJECTS } from '@/lib/subjects';
import { toast } from 'sonner';

const STUDY_ROOMS = SUBJECTS.slice(0, 8).map((s, i) => ({
  id: s.code,
  name: s.name,
  icon: s.icon,
  description: `Study ${s.name} together with other learners.`,
}));

export default function GroupStudyRooms() {
  const { user } = useOutletContext() || {};
  const [activeRoom, setActiveRoom] = useState(STUDY_ROOMS[0]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  const roomId = `group__${activeRoom.id}`;

  useEffect(() => {
    if (!user?.email) return;
    
    const fetchMessages = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('room_id', roomId)
          .order('created_at', { ascending: true })
          .limit(100);
        
        if (error) throw error;
        setMessages(data || []);
      } catch (error) {
        console.error('Error fetching messages:', error);
        toast.error('Failed to load messages');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMessages();

    // Set up real-time subscription for new messages
    const subscription = supabase
      .channel(`room-${roomId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'chat_messages',
        filter: `room_id=eq.${roomId}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [roomId, user?.email]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !user) return;
    setSending(true);
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: roomId,
          sender_email: user.email,
          sender_name: user.user_metadata?.full_name || user.email,
          message: input.trim(),
        });
      
      if (error) throw error;
      setInput('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Please sign in to join group study rooms.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="font-playfair text-3xl font-bold flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" /> Group Study Rooms
          </h1>
          <p className="text-muted-foreground mt-1">Join a subject room and study together with your peers in real time.</p>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Room list */}
          <div className="lg:col-span-1">
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Subject Rooms</CardTitle>
              </CardHeader>
              <CardContent className="p-2 space-y-1">
                {STUDY_ROOMS.map(room => (
                  <button
                    key={room.id}
                    onClick={() => setActiveRoom(room)}
                    className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors text-sm ${activeRoom.id === room.id ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-muted text-foreground'}`}
                  >
                    <span className="text-base">{room.icon}</span>
                    <span className="truncate">{room.name}</span>
                    {activeRoom.id === room.id && (
                      <span className="ml-auto w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                    )}
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Chat area */}
          <div className="lg:col-span-3">
            <Card className="border-border flex flex-col" style={{ height: '600px' }}>
              <CardHeader className="pb-3 flex-shrink-0 border-b border-border">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{activeRoom.icon}</span>
                  <div>
                    <CardTitle className="font-playfair text-lg">{activeRoom.name} Study Room</CardTitle>
                    <p className="text-xs text-muted-foreground">{activeRoom.description}</p>
                  </div>
                  <Badge className="ml-auto bg-green-100 text-green-700 gap-1 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Live
                  </Badge>
                </div>
              </CardHeader>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loading && messages.length === 0 ? (
                  <div className="text-center pt-16 text-muted-foreground">
                    <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm">Loading messages...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center pt-16 text-muted-foreground">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">No messages yet</p>
                    <p className="text-sm">Be the first to start studying in this room!</p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMe = msg.sender_email === user.email;
                    return (
                      <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                          {msg.sender_name?.[0] || '?'}
                        </div>
                        <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                          {!isMe && <p className="text-xs text-muted-foreground px-1">{msg.sender_name}</p>}
                          <div className={`rounded-2xl px-4 py-2.5 text-sm ${isMe ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm'}`}>
                            {msg.message}
                          </div>
                          <p className="text-[10px] text-muted-foreground px-1">
                            {new Date(msg.created_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-border flex-shrink-0">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !sending && sendMessage()}
                    placeholder={`Message #${activeRoom.name.toLowerCase().replace(/ /g, '-')}...`}
                    className="flex-1"
                  />
                  <Button onClick={sendMessage} disabled={sending || !input.trim()} className="bg-primary px-4">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}