import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, X, Minimize2, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function LiveTutorChat({ user, tutorEmail, tutorName, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const bottomRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  const chatRoomId = [user?.email, tutorEmail].sort().join('__');

  // Load messages
  const loadMessages = useCallback(async () => {
    if (!user?.email || !tutorEmail) return;
    
    setLoading(true);
    setError(null);
    try {
      const { data, error: msgsError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', chatRoomId)
        .order('created_at', { ascending: true });
      
      if (msgsError) throw msgsError;
      setMessages(data || []);
      
      // Mark unread messages as read
      const unreadMessages = (data || []).filter(m => 
        m.sender_email !== user.email && !m.read
      );
      
      for (const msg of unreadMessages) {
        await supabase
          .from('chat_messages')
          .update({ read: true, read_at: new Date().toISOString() })
          .eq('id', msg.id);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [user?.email, tutorEmail, chatRoomId]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!user?.email || !tutorEmail) return;
    
    loadMessages();
    
    const channel = supabase
      .channel(`chat_${chatRoomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${chatRoomId}`,
        },
        (payload) => {
          const newMessage = payload.new;
          setMessages(prev => [...prev, newMessage]);
          
          // Auto-scroll to bottom
          setTimeout(() => {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
          
          // Mark as read if received while chat is open
          if (newMessage.sender_email !== user.email) {
            supabase
              .from('chat_messages')
              .update({ read: true, read_at: new Date().toISOString() })
              .eq('id', newMessage.id)
              .then(() => {});
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_typing_status',
          filter: `room_id=eq.${chatRoomId}`,
        },
        (payload) => {
          if (payload.new?.user_email !== user.email) {
            setOtherTyping(payload.new?.is_typing || false);
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.email, tutorEmail, chatRoomId, loadMessages]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Typing indicator handler
  const handleTyping = async () => {
    if (!chatRoomId) return;
    
    if (!typingTimeoutRef.current) {
      await supabase
        .from('chat_typing_status')
        .upsert({
          room_id: chatRoomId,
          user_email: user.email,
          is_typing: true,
          updated_at: new Date().toISOString()
        });
    }
    
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(async () => {
      await supabase
        .from('chat_typing_status')
        .upsert({
          room_id: chatRoomId,
          user_email: user.email,
          is_typing: false,
          updated_at: new Date().toISOString()
        });
      typingTimeoutRef.current = null;
    }, 1000);
  };

  const sendMessage = async () => {
    if (!input.trim() || !user) return;
    
    setSending(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: chatRoomId,
          sender_email: user.email,
          sender_name: user.full_name || user.email,
          recipient_email: tutorEmail,
          content: input.trim(),
          read: false,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setMessages(prev => [...prev, data]);
      setInput('');
      
      // Clear typing indicator
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        await supabase
          .from('chat_typing_status')
          .upsert({
            room_id: chatRoomId,
            user_email: user.email,
            is_typing: false,
            updated_at: new Date().toISOString()
          });
        typingTimeoutRef.current = null;
      }
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // If user not logged in
  if (!user) {
    return (
      <Card className="fixed bottom-4 right-4 w-80 shadow-xl z-50">
        <CardContent className="pt-4 text-center text-sm text-muted-foreground">
          Please sign in to chat with tutors.
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (loading) {
    return (
      <Card className="fixed bottom-4 right-4 w-80 shadow-2xl z-50 border-primary/30">
        <CardHeader className="pb-2 pt-3 px-4 bg-primary rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
                {tutorName?.[0] || 'T'}
              </div>
              <CardTitle className="text-white text-sm font-semibold">{tutorName}</CardTitle>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="fixed bottom-4 right-4 w-80 shadow-2xl z-50 border-red-300">
        <CardHeader className="pb-2 pt-3 px-4 bg-red-500 rounded-t-xl">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-sm font-semibold">Chat Error</CardTitle>
            <button onClick={onClose} className="text-white/70 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={loadMessages}>
            Retry
          </Button>
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
              {messages.length === 0 && (
                <p className="text-xs text-center text-muted-foreground pt-8">
                  Start a conversation with {tutorName}
                </p>
              )}
              {messages.map((msg) => {
                const isMe = msg.sender_email === user.email;
                const showReadReceipt = isMe && msg.read_at;
                
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-xl px-3 py-2 text-xs ${isMe ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-foreground'}`}>
                      <p className="break-words">{msg.content}</p>
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        <p className={`text-[10px] ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                          {new Date(msg.created_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {showReadReceipt && (
                          <span className="text-[9px] opacity-60">✓✓</span>
                        )}
                        {isMe && !msg.read_at && (
                          <span className="text-[9px] opacity-40">✓</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Typing indicator */}
              {otherTyping && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-xl px-3 py-2 text-xs">
                    <span className="flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Typing...
                    </span>
                  </div>
                </div>
              )}
              
              <div ref={bottomRef} />
            </div>
          </CardContent>
          <div className="p-3 border-t border-border flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !sending && input.trim()) {
                  sendMessage();
                }
                handleTyping();
              }}
              placeholder="Type a message..."
              className="text-xs h-8 flex-1"
            />
            <Button 
              size="sm" 
              onClick={sendMessage} 
              disabled={sending || !input.trim()} 
              className="h-8 px-2 bg-primary"
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}