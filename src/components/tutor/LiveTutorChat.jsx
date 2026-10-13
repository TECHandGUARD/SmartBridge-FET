import ReleaseGate from '@/components/operations/ReleaseGate';
import { MessageCircle, Shield, CheckCheck, Check } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Send, X, Minimize2, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
const appName = import.meta.env.VITE_APP_NAME || 'SmartBridge FET';
const TYPING_TIMEOUT = 1000;
function LiveTutorChatImplementation({
  user,
  tutorEmail,
  tutorName,
  onClose
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const bottomRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const chatRoomId = useCallback(() => {
    if (!user?.email || !tutorEmail) return null;
    return [user.email, tutorEmail].sort().join('__');
  }, [user?.email, tutorEmail]);
  const loadMessages = useCallback(async () => {
    const roomId = chatRoomId();
    if (!roomId) return;
    setLoading(true);
    setError(null);
    try {
      const {
        data,
        error: msgsError
      } = await supabase.from('chat_messages').select('*').eq('room_id', roomId).order('created_at', {
        ascending: true
      });
      if (msgsError) throw msgsError;
      setMessages(data || []);
      const unreadMessages = (data || []).filter(m => m.sender_email !== user.email && !m.is_read);
      for (const msg of unreadMessages) {
        await supabase.from('chat_messages').update({
          is_read: true,
          read_at: new Date().toISOString()
        }).eq('id', msg.id);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [user?.email, chatRoomId]);
  useEffect(() => {
    const roomId = chatRoomId();
    if (!roomId || !user?.email || !tutorEmail) return;
    loadMessages();
    setIsConnected(true);
    const channel = supabase.channel(`live_chat_${roomId}`).on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'chat_messages',
      filter: `room_id=eq.${roomId}`
    }, payload => {
      const newMessage = payload.new;
      setMessages(prev => [...prev, newMessage]);
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({
          behavior: 'smooth'
        });
      }, 100);
      if (newMessage.recipient_email === user.email) {
        supabase.from('chat_messages').update({
          is_read: true,
          read_at: new Date().toISOString()
        }).eq('id', newMessage.id).then(() => {});
      }
    }).on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'chat_typing_status',
      filter: `room_id=eq.${roomId}`
    }, payload => {
      if (payload.new?.user_email !== user.email) {
        setOtherTyping(payload.new?.is_typing || false);
      }
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
      setIsConnected(false);
    };
  }, [user?.email, tutorEmail, chatRoomId, loadMessages]);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: 'smooth'
    });
  }, [messages]);
  const handleTyping = useCallback(async () => {
    const roomId = chatRoomId();
    if (!roomId) return;
    if (!typingTimeoutRef.current) {
      await supabase.from('chat_typing_status').upsert({
        room_id: roomId,
        user_email: user.email,
        is_typing: true,
        updated_at: new Date().toISOString()
      });
    }
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(async () => {
      await supabase.from('chat_typing_status').upsert({
        room_id: roomId,
        user_email: user.email,
        is_typing: false,
        updated_at: new Date().toISOString()
      });
      typingTimeoutRef.current = null;
    }, TYPING_TIMEOUT);
  }, [user?.email, chatRoomId]);
  const sendMessage = async () => {
    const roomId = chatRoomId();
    if (!input.trim() || !user || !roomId) return;
    setSending(true);
    try {
      const {
        data,
        error
      } = await supabase.from('chat_messages').insert({
        room_id: roomId,
        sender_email: user.email,
        sender_id: user.id,
        sender_name: user.full_name || user.email,
        recipient_email: tutorEmail,
        message: input.trim(),
        is_read: false,
        created_at: new Date().toISOString()
      }).select().single();
      if (error) throw error;
      setMessages(prev => [...prev, data]);
      setInput('');
      await Promise.resolve(supabase.from('activity_log').insert({
        event_type: 'live_chat_message_sent',
        user_email: user.email,
        user_id: user.id || null,
        description: `Live chat message sent to ${tutorEmail}`,
        metadata: {
          room_id: roomId,
          recipient: tutorEmail,
          message_length: input.trim().length
        }
      })).catch(() => {});
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        await supabase.from('chat_typing_status').upsert({
          room_id: roomId,
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
  const MessageStatus = ({
    message
  }) => {
    if (message.sender_email !== user.email) return null;
    if (message.read_at) {
      return <CheckCheck className="w-3 h-3 text-green-500" />;
    }
    return <Check className="w-3 h-3 opacity-50" />;
  };
  if (!user) {
    return <Card className="fixed bottom-4 right-4 w-80 shadow-xl z-50">
        <CardContent className="pt-4 text-center text-sm text-muted-foreground">
          Please sign in to chat with tutors.
        </CardContent>
      </Card>;
  }
  if (loading) {
    return <Card className="fixed bottom-4 right-4 w-80 shadow-2xl z-50 border-primary/30">
        <CardHeader className="pb-2 pt-3 px-4 bg-primary rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
                {tutorName?.[0]?.toUpperCase() || 'T'}
              </div>
              <CardTitle className="text-white text-sm font-semibold">{tutorName || 'Tutor'}</CardTitle>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </CardContent>
      </Card>;
  }
  if (error) {
    return <Card className="fixed bottom-4 right-4 w-80 shadow-2xl z-50 border-red-300 dark:border-red-800">
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
      </Card>;
  }
  return <Card className="fixed bottom-4 right-4 w-80 shadow-2xl z-50 border-primary/30">
      <CardHeader className="pb-2 pt-3 px-4 bg-primary rounded-t-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
              {tutorName?.[0]?.toUpperCase() || 'T'}
            </div>
            <div>
              <CardTitle className="text-white text-sm font-semibold">{tutorName || 'Tutor'}</CardTitle>
              <div className="flex items-center gap-1">
                <Badge className="bg-green-400/30 text-green-100 text-[9px] px-1.5 py-0 h-4">Live</Badge>
                {isConnected && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={() => setMinimized(!minimized)} className="text-white/70 hover:text-white transition-colors" aria-label={minimized ? 'Expand chat' : 'Minimize chat'}>
              <Minimize2 className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="text-white/70 hover:text-white transition-colors" aria-label="Close chat">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </CardHeader>

      {!minimized && <>
          {}
          <CardContent className="p-0">
            <div className="h-64 overflow-y-auto p-3 space-y-2 bg-muted/20 dark:bg-muted/10">
              {messages.length === 0 && <div className="text-center py-8">
                  <MessageCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-30" />
                  <p className="text-xs text-muted-foreground">
                    Start a conversation with {tutorName || 'your tutor'}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Ask questions about your studies or upcoming sessions
                  </p>
                </div>}

              {messages.map(msg => {
            const isMe = msg.sender_email === user.email;
            return <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-xl px-3 py-2 text-xs ${isMe ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-foreground'}`}>
                      <p className="break-words">{msg.message}</p>
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        <span className={`text-[9px] ${isMe ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                          {new Date(msg.created_at).toLocaleTimeString('en-ZA', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                        </span>
                        <MessageStatus message={msg} />
                      </div>
                    </div>
                  </div>;
          })}

              {}
              {otherTyping && <div className="flex justify-start">
                  <div className="bg-muted rounded-xl px-3 py-2 text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{
                  animationDelay: '0ms'
                }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{
                  animationDelay: '150ms'
                }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{
                  animationDelay: '300ms'
                }} />
                    </span>
                  </div>
                </div>}

              <div ref={bottomRef} />
            </div>
          </CardContent>

          {}
          <div className="px-3 pt-1">
            <p className="text-[8px] text-muted-foreground flex items-center gap-1">
              <Shield className="w-2.5 h-2.5 text-green-500" />
              Your conversations are private and secure
            </p>
          </div>

          {}
          <div className="p-3 border-t border-border flex gap-2">
            <Input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey && !sending && input.trim()) {
            e.preventDefault();
            sendMessage();
          }
          handleTyping();
        }} placeholder="Type a message..." className="text-xs h-8 flex-1" disabled={sending} maxLength={2000} />
            <Button size="sm" onClick={sendMessage} disabled={sending || !input.trim()} className="h-8 px-2 bg-primary">
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </>}
    </Card>;
}

export default function LiveTutorChat(props) {
  return <ReleaseGate feature="advancedChat"><LiveTutorChatImplementation {...props} /></ReleaseGate>;
}
