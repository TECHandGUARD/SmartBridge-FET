// src/pages/GroupStudyRooms.jsx
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Users, MessageCircle, Send, StickyNote, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { SUBJECTS } from '@/lib/subjects';
import { toast } from 'sonner';
import StudyRoomBoard from '@/components/study/StudyRoomBoard';

// ============================================================
// 🔧 SOFT-CODED CONFIGURATION
// ============================================================

const CONFIG = {
  // Room configuration
  ROOM_PREFIX: import.meta.env.VITE_STUDY_ROOM_PREFIX || 'group__',
  MAX_MESSAGES: Number(import.meta.env.VITE_STUDY_ROOM_MAX_MESSAGES) || 50,
  
  // Number of rooms to show
  ROOM_COUNT: Number(import.meta.env.VITE_STUDY_ROOM_COUNT) || 8,

  // Feature flags
  ENABLE_REALTIME: import.meta.env.VITE_STUDY_ROOM_ENABLE_REALTIME !== 'false',
  ENABLE_TYPING_INDICATOR: import.meta.env.VITE_STUDY_ROOM_ENABLE_TYPING !== 'false',

  // Auto-scroll behavior
  AUTO_SCROLL: import.meta.env.VITE_STUDY_ROOM_AUTO_SCROLL !== 'false',

  // Messages
  MESSAGES: {
    LOAD_FAILED: import.meta.env.VITE_STUDY_ROOM_LOAD_FAILED_MSG || 'Failed to load messages. Please try again.',
    SEND_FAILED: import.meta.env.VITE_STUDY_ROOM_SEND_FAILED_MSG || 'Failed to send message. Please try again.',
    NO_MESSAGES: import.meta.env.VITE_STUDY_ROOM_NO_MESSAGES_MSG || 'No messages yet. Be the first to start the conversation!',
    SIGN_IN_REQUIRED: import.meta.env.VITE_STUDY_ROOM_SIGN_IN_MSG || 'Please sign in to join group study rooms.',
    TYPING: import.meta.env.VITE_STUDY_ROOM_TYPING_MSG || 'typing...',
    ROOM_JOINED: import.meta.env.VITE_STUDY_ROOM_JOINED_MSG || 'You joined the {room} study room.',
  },
};

// ============================================================
// Constants
// ============================================================

const STUDY_ROOMS = SUBJECTS.slice(0, CONFIG.ROOM_COUNT).map((s) => ({
  id: s.code,
  name: s.name,
  icon: s.icon,
  description: `Study ${s.name} together with other learners.`,
}));

// ============================================================
// Helper Functions
// ============================================================

const groupMessagesByDate = (messages) => {
  const groups = {};
  messages.forEach(msg => {
    const date = new Date(msg.created_at).toLocaleDateString('en-ZA', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
  });
  return groups;
};

// ============================================================
// Main Component
// ============================================================

export default function GroupStudyRooms() {
  // ✅ FIXED: Use useAuth() instead of useOutletContext()
  const { user } = useAuth();
  const [activeRoom, setActiveRoom] = useState(STUDY_ROOMS[0]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('chat');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const roomId = useMemo(() => 
    `${CONFIG.ROOM_PREFIX}${activeRoom.id}`,
    [activeRoom.id]
  );

  // ============================================================
  // Load Messages
  // ============================================================

  const loadMessages = useCallback(async (silent = false) => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    if (!silent) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(CONFIG.MAX_MESSAGES);

      if (queryError) throw queryError;
      setMessages(data || []);
    } catch (err) {
      console.error('Error loading messages:', err);
      setError(CONFIG.MESSAGES.LOAD_FAILED);
      if (!silent) {
        toast.error(CONFIG.MESSAGES.LOAD_FAILED);
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [roomId, user?.email]);

  // ============================================================
  // Real-time Subscription
  // ============================================================

  useEffect(() => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    loadMessages();

    if (!CONFIG.ENABLE_REALTIME) return;

    const channel = supabase
      .channel(`group_chat_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new]);
          // Auto-scroll to bottom on new message
          if (CONFIG.AUTO_SCROLL) {
            setTimeout(() => {
              bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, user?.email, loadMessages]);

  // ============================================================
  // Auto-scroll on new messages
  // ============================================================

  useEffect(() => {
    if (CONFIG.AUTO_SCROLL) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // ============================================================
  // Focus input on room change
  // ============================================================

  useEffect(() => {
    if (activeTab === 'chat') {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [activeRoom, activeTab]);

  // ============================================================
  // Handlers
  // ============================================================

  const sendMessage = async () => {
    if (!input.trim() || !user) return;
    setSending(true);

    try {
      const { error: sendError } = await supabase
        .from('chat_messages')
        .insert({
          room_id: roomId,
          sender_email: user.email,
          sender_name: user.full_name || user.email,
          message: input.trim(),
          created_at: new Date().toISOString()
        });

      if (sendError) throw sendError;
      setInput('');
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error(CONFIG.MESSAGES.SEND_FAILED);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !sending) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleRoomChange = (room) => {
    setActiveRoom(room);
    setActiveTab('chat');
    toast.info(CONFIG.MESSAGES.ROOM_JOINED.replace('{room}', room.name));
  };

  const handleRefresh = useCallback(() => {
    loadMessages(true);
  }, [loadMessages]);

  // ============================================================
  // Render: Message List
  // ============================================================

  const renderMessages = () => {
    if (loading && !isRefreshing) {
      return (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <AlertCircle className="w-8 h-8 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
          <Button size="sm" variant="outline" onClick={handleRefresh}>
            <RefreshCw className="w-3 h-3 mr-2" /> Retry
          </Button>
        </div>
      );
    }

    if (messages.length === 0) {
      return (
        <div className="text-center pt-16 text-muted-foreground">
          <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No messages yet</p>
          <p className="text-sm">{CONFIG.MESSAGES.NO_MESSAGES}</p>
        </div>
      );
    }

    const groupedMessages = groupMessagesByDate(messages);

    return Object.entries(groupedMessages).map(([date, msgs]) => (
      <div key={date}>
        <div className="flex items-center gap-2 my-4">
          <div className="flex-1 h-px bg-border"></div>
          <span className="text-xs text-muted-foreground">{date}</span>
          <div className="flex-1 h-px bg-border"></div>
        </div>
        {msgs.map((msg) => {
          const isMe = msg.sender_email === user.email;
          return (
            <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                {msg.sender_name?.[0]?.toUpperCase() || '?'}
              </div>
              <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                {!isMe && <p className="text-xs text-muted-foreground px-1 font-medium">{msg.sender_name}</p>}
                <div className={`rounded-2xl px-4 py-2.5 text-sm break-words ${
                  isMe 
                    ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                    : 'bg-muted rounded-tl-sm'
                }`}>
                  {msg.message}
                </div>
                <p className="text-[10px] text-muted-foreground px-1">
                  {new Date(msg.created_at).toLocaleTimeString('en-ZA', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: false 
                  })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    ));
  };

  // ============================================================
  // Access Control
  // ============================================================

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">{CONFIG.MESSAGES.SIGN_IN_REQUIRED}</p>
      </div>
    );
  }

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-playfair text-3xl font-bold flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" /> Group Study Rooms
          </h1>
          <p className="text-muted-foreground mt-1">
            Join a subject room and study together with your peers in real time.
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Room list */}
          <div className="lg:col-span-1">
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Subject Rooms
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 space-y-1">
                {STUDY_ROOMS.map(room => (
                  <button
                    key={room.id}
                    onClick={() => handleRoomChange(room)}
                    className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors text-sm ${
                      activeRoom.id === room.id 
                        ? 'bg-primary/10 text-primary font-semibold' 
                        : 'hover:bg-muted text-foreground'
                    }`}
                    aria-current={activeRoom.id === room.id ? 'page' : undefined}
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

          {/* Chat + Board area */}
          <div className="lg:col-span-3">
            <Card className="border-border flex flex-col" style={{ height: '600px' }}>
              {/* Room header */}
              <CardHeader className="pb-0 flex-shrink-0 border-b border-border">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{activeRoom.icon}</span>
                  <div>
                    <CardTitle className="font-playfair text-lg">{activeRoom.name} Study Room</CardTitle>
                    <p className="text-xs text-muted-foreground">{activeRoom.description}</p>
                  </div>
                  <Badge className="ml-auto bg-green-100 text-green-700 gap-1 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Live
                  </Badge>
                  {isRefreshing && (
                    <Loader2 className="w-3 h-3 animate-spin text-muted-foreground ml-1" />
                  )}
                </div>
                {/* Tabs */}
                <div className="flex gap-1" role="tablist">
                  <button
                    onClick={() => setActiveTab('chat')}
                    role="tab"
                    aria-selected={activeTab === 'chat'}
                    className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'chat' 
                        ? 'border-primary text-primary' 
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <MessageCircle className="w-4 h-4" /> Live Chat
                  </button>
                  <button
                    onClick={() => setActiveTab('board')}
                    role="tab"
                    aria-selected={activeTab === 'board'}
                    className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'board' 
                        ? 'border-primary text-primary' 
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <StickyNote className="w-4 h-4" /> Message Board
                  </button>
                </div>
              </CardHeader>

              {/* Chat Tab */}
              {activeTab === 'chat' && (
                <>
                  <div className="flex-1 overflow-y-auto p-4 space-y-1">
                    {renderMessages()}
                    <div ref={bottomRef} />
                  </div>
                  <div className="p-4 border-t border-border flex-shrink-0">
                    <div className="flex gap-2">
                      <Input
                        ref={inputRef}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={`Message #${activeRoom.name.toLowerCase().replace(/ /g, '-')}...`}
                        className="flex-1"
                        disabled={sending}
                        aria-label="Type a message"
                      />
                      <Button 
                        onClick={sendMessage} 
                        disabled={sending || !input.trim()} 
                        className="bg-primary px-4"
                        aria-label="Send message"
                      >
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {/* Message Board Tab */}
              {activeTab === 'board' && (
                <StudyRoomBoard room={activeRoom} user={user} />
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
