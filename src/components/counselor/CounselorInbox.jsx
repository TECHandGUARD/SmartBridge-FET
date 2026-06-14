import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CounselorInbox({ counselorEmail, counselorName, studentEmails = [] }) {
  const [conversations, setConversations] = useState({});
  const [allMessages, setAllMessages] = useState([]);
  const [activeStudent, setActiveStudent] = useState(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  const loadMessages = useCallback(async () => {
    if (!counselorEmail) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(500);
      
      if (error) throw error;
      
      const mine = (data || []).filter(m =>
        m.sender_email === counselorEmail || m.recipient_email === counselorEmail
      );
      setAllMessages(mine);
    } catch (err) {
      console.error('Failed to load messages:', err);
      toast.error(`Failed to load: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [counselorEmail]);

  useEffect(() => {
    if (!counselorEmail) return;
    loadMessages();
  }, [counselorEmail, loadMessages]);

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!counselorEmail) return;

    const channel = supabase
      .channel('counselor_inbox')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          const msg = payload.new;
          const involvesCounselor = msg.sender_email === counselorEmail || msg.recipient_email === counselorEmail;
          if (involvesCounselor) {
            setAllMessages(prev => {
              if (prev.find(m => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [counselorEmail]);

  // Group messages by student
  const threadsByStudent = {};
  for (const msg of allMessages) {
    const studentEmail = msg.sender_email === counselorEmail ? msg.recipient_email : msg.sender_email;
    if (!studentEmail) continue;
    if (!threadsByStudent[studentEmail]) threadsByStudent[studentEmail] = [];
    threadsByStudent[studentEmail].push(msg);
  }

  // Merge with known students who haven't messaged yet
  const allStudentEmails = [
    ...new Set([...Object.keys(threadsByStudent), ...studentEmails])
  ];

  // Thread for active student
  const activeThread = activeStudent
    ? (threadsByStudent[activeStudent] || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    : [];

  const unreadCounts = {};
  for (const [email, msgs] of Object.entries(threadsByStudent)) {
    unreadCounts[email] = msgs.filter(m => m.sender_email !== counselorEmail && !m.read).length;
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThread.length]);

  const sendMessage = async () => {
    if (!input.trim() || !activeStudent || sending) return;
    
    setSending(true);
    const roomId = [counselorEmail, activeStudent].sort().join('__');
    
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert([{
          room_id: roomId,
          sender_email: counselorEmail,
          sender_name: counselorName || counselorEmail,
          recipient_email: activeStudent,
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

  const lastMessage = (email) => {
    const msgs = threadsByStudent[email];
    if (!msgs || msgs.length === 0) return null;
    return msgs[msgs.length - 1];
  };

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  if (loading) {
    return (
      <Card className="border-border">
        <CardContent className="py-16 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-playfair flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-primary" />
          Student Messages
          {totalUnread > 0 && (
            <Badge className="bg-primary text-primary-foreground text-xs">{totalUnread} new</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex" style={{ height: '420px' }}>

          {/* Sidebar — conversation list */}
          <div className={`border-r border-border flex-shrink-0 overflow-y-auto ${activeStudent ? 'hidden sm:block w-48' : 'w-full sm:w-48'}`}>
            {allStudentEmails.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No conversations yet. Students will appear here once they message you.
              </div>
            ) : (
              allStudentEmails.map(email => {
                const last = lastMessage(email);
                const unread = unreadCounts[email] || 0;
                const isActive = email === activeStudent;
                return (
                  <button
                    key={email}
                    onClick={() => setActiveStudent(email)}
                    className={`w-full text-left px-3 py-3 border-b border-border/50 hover:bg-muted/40 transition-colors ${isActive ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                        {email[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold truncate">{email.split('@')[0]}</p>
                          {unread > 0 && (
                            <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center flex-shrink-0">{unread}</span>
                          )}
                        </div>
                        {last && (
                          <p className="text-[10px] text-muted-foreground truncate">
                            {last.sender_email === counselorEmail ? 'You: ' : ''}{last.content}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Message thread */}
          <div className={`flex-1 flex flex-col ${!activeStudent ? 'hidden sm:flex' : 'flex'}`}>
            {!activeStudent ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                <MessageCircle className="w-10 h-10 text-muted-foreground/20 mb-3" />
                <p className="text-sm text-muted-foreground">Select a conversation to view messages</p>
              </div>
            ) : (
              <>
                {/* Thread header */}
                <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/20">
                  <button onClick={() => setActiveStudent(null)} className="sm:hidden text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                    {activeStudent[0].toUpperCase()}
                  </div>
                  <p className="text-xs font-semibold truncate">{activeStudent}</p>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-muted/10">
                  {activeThread.length === 0 && (
                    <p className="text-xs text-center text-muted-foreground pt-6">No messages yet. Send one to get started.</p>
                  )}
                  {activeThread.map(msg => {
                    const isMe = msg.sender_email === counselorEmail;
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
                  })}
                  <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="p-2 border-t border-border flex gap-2">
                  <Input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !sending && sendMessage()}
                    placeholder="Reply to student..."
                    className="text-xs h-8"
                  />
                  <Button size="sm" onClick={sendMessage} disabled={sending || !input.trim()} className="h-8 px-2">
                    {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}