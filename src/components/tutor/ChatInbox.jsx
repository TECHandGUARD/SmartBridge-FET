import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function ChatInbox({ user }) {
  const [conversations, setConversations] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  // Load all conversations
  useEffect(() => {
    if (!user?.email) return;
    
    loadConversations();
    
    // Set up real-time subscription for new messages
    const subscription = supabase
      .channel('chat-inbox')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
       table: 'chat_messages'
      }, (payload) => {
        const newMsg = payload.new;
        // Check if message belongs to current user
        if (newMsg.sender_email === user.email || newMsg.receiver_email === user.email) {
          loadConversations();
          if (activeRoom && newMsg.room_id === activeRoom.room_id) {
            setMessages(prev => [...prev, newMsg]);
          }
        }
      })
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, [user?.email]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      // Get all messages where this user is sender or receiver
      const { data: allMessages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .or(`sender_email.eq.${user.email},receiver_email.eq.${user.email}`)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Group by room_id
      const roomMap = {};
      (allMessages || []).forEach(m => {
        if (!roomMap[m.room_id]) {
          roomMap[m.room_id] = { room_id: m.room_id, messages: [] };
        }
        roomMap[m.room_id].messages.push(m);
      });
      
      const rooms = Object.values(roomMap).map(r => {
        const sorted = r.messages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const otherEmail = r.room_id?.split('__')?.find(e => e !== user.email) || '';
        return {
          room_id: r.room_id,
          otherEmail: otherEmail,
          otherName: otherEmail,
          lastMessage: sorted[0]?.message || '',
          lastTime: sorted[0]?.created_at,
          unread: sorted.filter(m => m.sender_email !== user.email && !m.is_read).length,
        };
      });
      
      rooms.sort((a, b) => new Date(b.lastTime) - new Date(a.lastTime));
      setConversations(rooms);
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const openRoom = async (room) => {
    setActiveRoom(room);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', room.room_id)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setMessages(data || []);
      
      // Mark messages as read
      const unreadMessages = (data || []).filter(m => m.sender_email !== user.email && !m.is_read);
      for (const msg of unreadMessages) {
        await supabase
          .from('chat_messages')
          .update({ is_read: true })
          .eq('id', msg.id);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load conversation');
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeRoom) return;
    setSending(true);
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: activeRoom.room_id,
          sender_email: user.email,
          receiver_email: activeRoom.otherEmail,
          sender_name: user.user_metadata?.full_name || user.email,
          message: input.trim(),
          is_read: false,
        });
      
      if (error) throw error;
      
      setInput('');
      loadConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (loading && conversations.length === 0) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-playfair flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" /> Student Messages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-playfair flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" /> Student Messages
          {conversations.length > 0 && (
            <Badge className="bg-primary/10 text-primary text-xs">{conversations.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {!activeRoom ? (
          // Conversation list
          <div className="divide-y divide-border">
            {conversations.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm px-4">
                <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                No messages yet. Students will appear here when they message you.
              </div>
            ) : (
              conversations.map(conv => (
                <button
                  key={conv.room_id}
                  className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-center gap-3"
                  onClick={() => openRoom(conv)}
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                    {conv.otherName?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{conv.otherName || conv.otherEmail}</p>
                    <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">
                      {conv.lastTime ? new Date(conv.lastTime).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                    {conv.unread > 0 && (
                      <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-primary rounded-full mt-1">
                        {conv.unread}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        ) : (
          // Active chat
          <div className="flex flex-col h-96">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setActiveRoom(null)}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                {activeRoom.otherName?.[0]?.toUpperCase() || '?'}
              </div>
              <span className="text-sm font-semibold">{activeRoom.otherName || activeRoom.otherEmail}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-muted/10">
              {messages.map((msg) => {
                const isMe = msg.sender_email === user.email;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-xl px-3 py-2 text-xs ${isMe ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'}`}>
                      {!isMe && <p className="font-semibold text-[10px] mb-0.5 opacity-70">{msg.sender_name}</p>}
                      <p>{msg.message}</p>
                      <p className={`text-[10px] mt-0.5 opacity-60`}>
                        {new Date(msg.created_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
            <div className="p-3 border-t border-border flex gap-2">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !sending && sendMessage()}
                placeholder="Reply..."
                className="text-xs h-8"
              />
              <Button size="sm" onClick={sendMessage} disabled={sending || !input.trim()} className="h-8 px-2">
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}