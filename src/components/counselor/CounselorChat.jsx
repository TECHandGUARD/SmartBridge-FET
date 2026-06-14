import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Send, X, Minimize2, School, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CounselorChat({ user, counselorEmail, counselorName, schoolName, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);
  const roomId = [user?.email, counselorEmail].sort().join('__');

  const loadMessages = useCallback(async () => {
    if (!user?.email || !counselorEmail) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Failed to load messages:', err);
      toast.error(`Failed to load messages: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [user?.email, counselorEmail, roomId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!user?.email || !counselorEmail) return;

    const channel = supabase
      .channel(`chat_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const newMessage = payload.new;
          setMessages(prev => [...prev, newMessage]);
          
          if (minimized && newMessage.sender_email !== user.email) {
            setUnread(u => u + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.email, counselorEmail, roomId, minimized]);

  useEffect(() => {
    if (!minimized) {
      setUnread(0);
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, minimized]);

  const sendMessage = async () => {
    if (!input.trim() || !user || sending) return;
    
    setSending(true);
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert([{
          room_id: roomId,
          sender_email: user.email,
          sender_name: user.full_name || user.email,
          recipient_email: counselorEmail,
          content: input.trim(),
        }]);
      
      if (error) throw error;
      setInput('');
    } catch (err) {
      console.error('Failed to send message:', err);
      toast.error(`Failed to send: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-80 shadow-2xl z-50 rounded-xl border border-primary/20 bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary to-green-dark">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {counselorName?.[0] || 'C'}
          </div>
          <div>
            <p className="text-white text-sm font-semibold leading-none">{counselorName}</p>
            <p className="text-white/70 text-[11px] flex items-center gap-1 mt-0.5">
              <School className="w-2.5 h-2.5" /> {schoolName || 'School Counselor'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {unread > 0 && (
            <Badge className="bg-secondary text-secondary-foreground text-[10px] px-1.5 py-0 h-4">{unread}</Badge>
          )}
          <button onClick={() => setMinimized(m => !m)} className="text-white/70 hover:text-white p-1">
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={onClose} className="text-white/70 hover:text-white p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* Messages */}
          <div className="h-64 overflow-y-auto p-3 space-y-2 bg-muted/10">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center pt-4">
                <School className="w-8 h-8 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">
                  Start a conversation with your school counselor.
                </p>
              </div>
            ) : (
              messages.map(msg => {
                const isMe = msg.sender_email === user?.email;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[78%] rounded-xl px-3 py-2 text-xs ${
                      isMe ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'
                    }`}>
                      <p className="leading-relaxed">{msg.content}</p>
                      <p className={`text-[10px] mt-0.5 ${isMe ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
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
          <div className="p-3 border-t border-border flex gap-2 bg-card">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !sending && sendMessage()}
              placeholder="Message your counselor..."
              className="text-xs h-8"
            />
            <Button size="sm" onClick={sendMessage} disabled={sending || !input.trim()} className="h-8 px-2">
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}