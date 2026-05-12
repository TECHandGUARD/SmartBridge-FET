import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, X, Minimize2 } from 'lucide-react';
import { toast } from 'sonner';

export default function LiveTutorChat({ user, tutorEmail, tutorName, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);
  const chatRoomId = [user?.email, tutorEmail].sort().join('__');

  useEffect(() => {
    if (!user?.email || !tutorEmail) return;
    
    fetchMessages();
    
    // Set up real-time subscription for new messages
    const subscription = supabase
      .channel(`chat-${chatRoomId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'chat_messages',
        filter: `room_id=eq.${chatRoomId}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, [user?.email, tutorEmail, chatRoomId]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', chatRoomId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

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
          room_id: chatRoomId,
          sender_email: user.email,
          receiver_email: tutorEmail,
          sender_name: user.user_metadata?.full_name || user.email,
          message: input.trim(),
          is_read: false,
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
      <Card className="fixed bottom-4 right-4 w-80 shadow-xl z-50">
        <CardContent className="pt-4 text-center text-sm text-muted-foreground">
          Please sign in to chat with tutors.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 shadow-2xl z-50 border-primary/30">
      <CardHeader className="pb-2 pt-3 px-4 bg-primary rounded-t-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
              {tutorName?.[0] || 'T'}
            </div>
            <div>
              <CardTitle className="text-white text-sm font-semibold">{tutorName}</CardTitle>
              <Badge className="bg-green-400/30 text-green-100 text-xs px-1.5 py-0 h-4">Live</Badge>
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={() => setMinimized(!minimized)} className="text-white/70 hover:text-white">
              <Minimize2 className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="text-white/70 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </CardHeader>

      {!minimized && (
        <>
          <CardContent className="p-0">
            <div className="h-64 overflow-y-auto p-3 space-y-2 bg-muted/20">
              {loading && messages.length === 0 ? (
                <div className="flex justify-center py-8">
                  <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <p className="text-xs text-center text-muted-foreground pt-8">
                  Start a conversation with {tutorName}
                </p>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_email === user.email;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-xl px-3 py-2 text-xs ${isMe ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-foreground'}`}>
                        <p>{msg.message}</p>
                        <p className={`text-[10px] mt-0.5 ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                          {new Date(msg.created_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>
          </CardContent>
          <div className="p-3 border-t border-border flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !sending && sendMessage()}
              placeholder="Type a message..."
              className="text-xs h-8"
            />
            <Button size="sm" onClick={sendMessage} disabled={sending || !input.trim()} className="h-8 px-2 bg-primary">
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}