import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageCircle, Send, ArrowLeft, Loader2, AlertCircle, 
  Search, UserPlus, Paperclip, FileText, CheckCircle, XCircle,
  Users, Clock, Filter, Plus, Shield
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================================
// Configuration (Soft-coded for admin control)
// ============================================================

const appName = import.meta.env.VITE_APP_NAME || 'SmartBridge FET';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
const STORAGE_BUCKET = import.meta.env.VITE_STORAGE_BUCKET || 'chat-attachments';

// ============================================================
// Quick Reply Templates (Soft-coded for admin control)
// ============================================================

const QUICK_REPLIES = [
  "I'm available for a session. What time works for you?",
  "Can you share which topics you're struggling with?",
  "I've attached some practice materials for you.",
  "Great session today! Your homework is: ",
  "Let me know if you need any clarification on today's lesson."
];

// ============================================================
// Main Component
// ============================================================

export default function ChatInbox({ user }) {
  const [conversations, setConversations] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('chats');
  const [availableStudents, setAvailableStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [applications, setApplications] = useState([]);
  const [dailyLimit, setDailyLimit] = useState({ used: 0, limit: 5, remaining: 5 });
  const [searchStudentTerm, setSearchStudentTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const bottomRef = useRef(null);
  const typingTimeoutRef = useRef();

  // ============================================================
  // Load Conversations
  // ============================================================

  const loadConversations = useCallback(async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const { data: allMessages, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*')
        .or(`sender_email.eq.${user.email},recipient_email.eq.${user.email}`)
        .order('created_at', { ascending: false })
        .limit(200);
      
      if (messagesError) throw messagesError;
      
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
        const otherEmail = r.room_id.split('__').find(e => e !== user.email);
        const lastMsg = sorted[0];
        const otherName = lastMsg?.sender_email === otherEmail ? lastMsg.sender_name : otherEmail;
        
        return {
          room_id: r.room_id,
          otherEmail: otherEmail,
          otherName: otherName || otherEmail,
          lastMessage: lastMsg?.content || '',
          lastTime: lastMsg?.created_at,
          unread: sorted.filter(m => 
            m.recipient_email === user.email && !m.read
          ).length,
        };
      });
      
      rooms.sort((a, b) => new Date(b.lastTime) - new Date(a.lastTime));
      setConversations(rooms);
      
    } catch (err) {
      console.error('Error loading conversations:', err);
      setError('Failed to load messages');
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  // ============================================================
  // Load Available Students
  // ============================================================

  const loadAvailableStudents = useCallback(async () => {
    if (!user?.email) return;
    
    setLoadingStudents(true);
    
    try {
      // Get tutor's subjects from profile
      const { data: tutorProfile } = await supabase
        .from('tutor_profiles')
        .select('subjects, hourly_rate, is_verified')
        .eq('user_email', user.email)
        .single();
      
      // Get today's application count
      const today = new Date().toISOString().split('T')[0];
      const { data: todayApps } = await supabase
        .from('tutor_applications')
        .select('id', { count: 'exact' })
        .eq('tutor_email', user.email)
        .gte('created_at', today);
      
      const usedCount = todayApps?.length || 0;
      const dailyLimitValue = tutorProfile?.is_verified ? 10 : 5;
      setDailyLimit({
        used: usedCount,
        limit: dailyLimitValue,
        remaining: Math.max(0, dailyLimitValue - usedCount)
      });
      
      // Find students looking for tutoring
      let query = supabase
        .from('student_requests')
        .select(`
          *,
          users!inner(full_name, email, grade)
        `)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (tutorProfile?.subjects?.length > 0) {
        query = query.in('subject', tutorProfile.subjects);
      }
      
      const { data: students, error: studentsError } = await query;
      
      if (studentsError) throw studentsError;
      
      // Filter out already applied
      const { data: existingApps } = await supabase
        .from('tutor_applications')
        .select('student_request_id')
        .eq('tutor_email', user.email);
      
      const appliedIds = new Set(existingApps?.map(a => a.student_request_id) || []);
      
      const filteredStudents = (students || []).filter(s => !appliedIds.has(s.id));
      
      setAvailableStudents(filteredStudents);
      
    } catch (err) {
      console.error('Error loading students:', err);
      toast.error('Failed to load available students');
    } finally {
      setLoadingStudents(false);
    }
  }, [user?.email]);

  // ============================================================
  // Load Room Messages
  // ============================================================

  const loadRoomMessages = useCallback(async (roomId) => {
    try {
      const { data, error: msgsError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });
      
      if (msgsError) throw msgsError;
      setMessages(data || []);
      
      // Mark messages as read
      const unreadMessages = (data || []).filter(m => 
        m.recipient_email === user.email && !m.read
      );
      
      for (const msg of unreadMessages) {
        await supabase
          .from('chat_messages')
          .update({ read: true, read_at: new Date().toISOString() })
          .eq('id', msg.id);
      }
      
      // Update conversation unread count
      setConversations(prev => prev.map(c => 
        c.room_id === roomId ? { ...c, unread: 0 } : c
      ));
      
    } catch (err) {
      console.error('Error loading room messages:', err);
      toast.error('Failed to load messages');
    }
  }, [user?.email]);

  // ============================================================
  // Load Applications
  // ============================================================

  const loadApplications = useCallback(async () => {
    if (!user?.email) return;
    
    try {
      const { data, error } = await supabase
        .from('tutor_applications')
        .select(`
          *,
          student_requests (
            id,
            subject,
            grade,
            description,
            users!inner(full_name, email)
          )
        `)
        .eq('tutor_email', user.email)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setApplications(data || []);
      
    } catch (err) {
      console.error('Error loading applications:', err);
    }
  }, [user?.email]);

  // ============================================================
  // Real-time Subscriptions
  // ============================================================

  useEffect(() => {
    if (!user?.email) return;
    
    loadConversations();
    loadAvailableStudents();
    loadApplications();
    
    // Chat messages subscription
    const channel = supabase
      .channel('chat_inbox')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          const newMessage = payload.new;
          
          // Only handle messages for this user
          if (newMessage.sender_email !== user.email && newMessage.recipient_email !== user.email) return;
          
          loadConversations();
          
          if (activeRoom && newMessage.room_id === activeRoom.room_id) {
            setMessages(prev => [...prev, newMessage]);
            
            // Auto-mark as read if recipient
            if (newMessage.recipient_email === user.email) {
              supabase
                .from('chat_messages')
                .update({ read: true, read_at: new Date().toISOString() })
                .eq('id', newMessage.id)
                .then(() => {});
            }
          } else if (newMessage.sender_email !== user.email) {
            toast.info(`New message from ${newMessage.sender_name || 'Student'}`);
          }
        }
      )
      .subscribe();
    
    // Typing indicator subscription
    const typingChannel = supabase
      .channel('typing_status')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_typing_status',
        },
        (payload) => {
          if (activeRoom && 
              payload.new?.room_id === activeRoom.room_id && 
              payload.new?.user_email !== user.email) {
            setOtherTyping(payload.new?.is_typing || false);
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(typingChannel);
    };
  }, [user?.email, activeRoom, loadConversations, loadAvailableStudents, loadApplications]);

  // ============================================================
  // Scroll to Bottom
  // ============================================================

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ============================================================
  // Open Room
  // ============================================================

  const openRoom = async (room) => {
    setActiveRoom(room);
    await loadRoomMessages(room.room_id);
  };

  // ============================================================
  // Send Message
  // ============================================================

  const sendMessage = async () => {
    if (!input.trim() || !activeRoom) return;
    
    setSending(true);
    
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: activeRoom.room_id,
          sender_email: user.email,
          sender_name: user.full_name || user.email,
          recipient_email: activeRoom.otherEmail,
          content: input.trim(),
          read: false,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setMessages(prev => [...prev, data]);
      setInput('');
      loadConversations();
      
      // Log activity
      await supabase
        .from('activity_log')
        .insert({
          event_type: 'chat_message_sent',
          user_email: user.email,
          user_id: user.id || null,
          description: `Sent message to ${activeRoom.otherEmail}`,
          metadata: {
            room_id: activeRoom.room_id,
            recipient: activeRoom.otherEmail,
            message_length: input.trim().length
          }
        })
        .catch(() => {});
      
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // ============================================================
  // Typing Indicator
  // ============================================================

  const handleTyping = async () => {
    if (!activeRoom) return;
    
    if (!typingTimeoutRef.current) {
      await supabase
        .from('chat_typing_status')
        .upsert({
          room_id: activeRoom.room_id,
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
          room_id: activeRoom.room_id,
          user_email: user.email,
          is_typing: false,
          updated_at: new Date().toISOString()
        });
      typingTimeoutRef.current = null;
    }, 1000);
  };

  // ============================================================
  // Initiate Conversation
  // ============================================================

  const initiateConversation = async (student) => {
    if (dailyLimit.remaining <= 0) {
      toast.error(`You've reached your daily application limit (${dailyLimit.limit}). Please try again tomorrow.`);
      return;
    }
    
    const studentEmail = student.users?.email;
    if (!studentEmail) {
      toast.error('Student email not found');
      return;
    }
    
    const roomId = [user.email, studentEmail].sort().join('__');
    
    // Check if conversation exists
    const { data: existing } = await supabase
      .from('chat_messages')
      .select('room_id')
      .eq('room_id', roomId)
      .limit(1);
    
    if (existing?.length > 0) {
      const room = conversations.find(c => c.room_id === roomId);
      if (room) openRoom(room);
      toast.info('Conversation already exists');
      return;
    }
    
    try {
      // Create application
      const { error: appError } = await supabase
        .from('tutor_applications')
        .insert({
          tutor_email: user.email,
          student_request_id: student.id,
          message: `I'd love to help you with ${student.subject}!`,
          status: 'pending',
          created_at: new Date().toISOString()
        });
      
      if (appError) throw appError;
      
      // Send first message
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: roomId,
          sender_email: user.email,
          sender_name: user.full_name || user.email,
          recipient_email: studentEmail,
          content: `Hi! I'm ${user.full_name || 'a tutor'}. I saw you need help with ${student.subject}. I'd love to discuss how I can assist you.`,
          read: false,
          created_at: new Date().toISOString()
        });
      
      if (error) throw error;
      
      // Mark student request as contacted
      await supabase
        .from('student_requests')
        .update({ status: 'contacted', contacted_by: user.email })
        .eq('id', student.id);
      
      // Log activity
      await supabase
        .from('activity_log')
        .insert({
          event_type: 'tutor_application_sent',
          user_email: user.email,
          user_id: user.id || null,
          description: `Applied to help with ${student.subject}`,
          metadata: {
            student_email: studentEmail,
            subject: student.subject,
            grade: student.grade
          }
        })
        .catch(() => {});
      
      toast.success(`Application sent to ${student.users?.full_name || 'student'}!`);
      loadAvailableStudents();
      loadApplications();
      loadConversations();
      
    } catch (err) {
      console.error('Error initiating conversation:', err);
      toast.error('Failed to send application');
    }
  };

  // ============================================================
  // Upload and Send File
  // ============================================================

  const uploadAndSendFile = async (file) => {
    if (!activeRoom) {
      toast.error('Please select a conversation first');
      return;
    }
    
    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast.error('File type not supported. Please upload images, PDFs, or documents.');
      return;
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`);
      return;
    }
    
    setUploadingFile(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `chat-attachments/${activeRoom.room_id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(fileName);
      
      await supabase.from('chat_messages').insert({
        room_id: activeRoom.room_id,
        sender_email: user.email,
        sender_name: user.full_name || user.email,
        recipient_email: activeRoom.otherEmail,
        content: `📎 ${file.name}`,
        attachment_url: publicUrl,
        attachment_type: file.type,
        read: false,
        created_at: new Date().toISOString()
      });
      
      toast.success('File sent!');
      loadConversations();
      
    } catch (err) {
      console.error('Upload failed:', err);
      toast.error('Failed to upload file');
    } finally {
      setUploadingFile(false);
    }
  };

  // ============================================================
  // Filter Students
  // ============================================================

  const filteredStudents = availableStudents.filter(s => {
    const studentName = s.users?.full_name || '';
    const studentEmail = s.users?.email || '';
    const matchesSearch = !searchStudentTerm || 
      studentName.toLowerCase().includes(searchStudentTerm.toLowerCase()) ||
      studentEmail.toLowerCase().includes(searchStudentTerm.toLowerCase());
    const matchesSubject = !filterSubject || s.subject === filterSubject;
    const matchesGrade = !filterGrade || s.grade === filterGrade;
    return matchesSearch && matchesSubject && matchesGrade;
  });

  const uniqueSubjects = [...new Set(availableStudents.map(s => s.subject).filter(Boolean))];
  const uniqueGrades = [...new Set(availableStudents.map(s => s.grade).filter(Boolean))];

  // ============================================================
  // Loading State
  // ============================================================

  if (loading) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-playfair flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" /> Messages
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // ============================================================
  // Render
  // ============================================================

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-playfair flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" /> Messages
            {conversations.length > 0 && (
              <Badge className="bg-primary/10 text-primary text-xs">{conversations.length}</Badge>
            )}
          </CardTitle>
          <Badge variant="outline" className="text-[9px] text-muted-foreground flex items-center gap-1">
            <Shield className="w-3 h-3 text-green-500" /> Private
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="chats" className="flex-1 gap-1.5">
              <MessageCircle className="w-3.5 h-3.5" /> Chats
            </TabsTrigger>
            <TabsTrigger value="find" className="flex-1 gap-1.5">
              <UserPlus className="w-3.5 h-3.5" /> Find Students
            </TabsTrigger>
            <TabsTrigger value="applications" className="flex-1 gap-1.5">
              <FileText className="w-3.5 h-3.5" /> My Applications
            </TabsTrigger>
          </TabsList>
          
          {/* CHATS TAB */}
          <TabsContent value="chats" className="mt-0 p-0">
            {!activeRoom ? (
              <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
                {conversations.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-sm px-4">
                    <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    No messages yet. 
                    <button 
                      onClick={() => setActiveTab('find')}
                      className="block text-primary hover:underline mt-2"
                    >
                      Find students to help →
                    </button>
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
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold truncate">{conv.otherName || conv.otherEmail}</p>
                          {conv.unread > 0 && (
                            <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] flex items-center justify-center flex-shrink-0">
                              {conv.unread}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        {conv.lastTime ? new Date(conv.lastTime).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </button>
                  ))
                )}
              </div>
            ) : (
              <div className="flex flex-col h-[500px]">
                {/* Header */}
                <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30 flex-shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setActiveRoom(null)}>
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                    {activeRoom.otherName?.[0]?.toUpperCase() || '?'}
                  </div>
                  <span className="text-sm font-semibold">{activeRoom.otherName || activeRoom.otherEmail}</span>
                  {otherTyping && (
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      <Loader2 className="w-3 h-3 animate-spin inline mr-1" />
                      typing...
                    </span>
                  )}
                </div>
                
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-muted/10">
                  {messages.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No messages yet</p>
                      <p className="text-xs">Start the conversation!</p>
                    </div>
                  )}
                  {messages.map((msg) => {
                    const isMe = msg.sender_email === user.email;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] rounded-xl px-3 py-2 text-xs ${isMe ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'}`}>
                          {!isMe && <p className="font-semibold text-[10px] mb-0.5 opacity-70">{msg.sender_name}</p>}
                          {msg.attachment_url ? (
                            <div>
                              <p>{msg.content}</p>
                              {msg.attachment_type?.startsWith('image/') ? (
                                <img src={msg.attachment_url} alt="Attachment" className="max-w-full rounded-lg mt-1 max-h-48" />
                              ) : (
                                <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-1 mt-1">
                                  <FileText className="w-3 h-3" /> Open Attachment
                                </a>
                              )}
                            </div>
                          ) : (
                            <p className="break-words">{msg.content}</p>
                          )}
                          <div className="flex items-center justify-end gap-1 mt-0.5">
                            <p className={`text-[9px] opacity-60`}>
                              {new Date(msg.created_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {isMe && (
                              <span className="text-[9px] opacity-50">
                                {msg.read_at ? '✓✓' : '✓'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
                
                {/* Quick Replies */}
                <div className="px-3 pb-2 flex flex-wrap gap-1.5 border-t pt-2">
                  {QUICK_REPLIES.map((reply, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(reply)}
                      className="text-[10px] px-2 py-1 rounded-full bg-muted hover:bg-primary/10 transition-colors"
                    >
                      {reply.substring(0, 30)}...
                    </button>
                  ))}
                </div>
                
                {/* Input */}
                <div className="p-3 border-t border-border flex gap-2 flex-shrink-0">
                  <label className="cursor-pointer">
                    <input 
                      type="file" 
                      className="hidden" 
                      onChange={e => e.target.files?.[0] && uploadAndSendFile(e.target.files[0])}
                      disabled={uploadingFile}
                    />
                    <Button size="sm" variant="ghost" className="h-9 px-2" disabled={uploadingFile}>
                      {uploadingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                    </Button>
                  </label>
                  <Input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !sending) sendMessage();
                      handleTyping();
                    }}
                    placeholder="Type your message..."
                    className="text-sm h-9 flex-1"
                  />
                  <Button size="sm" onClick={sendMessage} disabled={sending || !input.trim()} className="h-9 px-3 bg-primary">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
          
          {/* FIND STUDENTS TAB */}
          <TabsContent value="find" className="mt-4 space-y-4">
            {/* Daily Limit Banner */}
            <div className={`p-3 rounded-lg ${dailyLimit.remaining > 0 ? 'bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-800' : 'bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-800'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold">Daily Applications</p>
                  <p className="text-2xl font-bold">{dailyLimit.used}/{dailyLimit.limit}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Remaining today</p>
                  <p className="text-xl font-bold">{dailyLimit.remaining}</p>
                </div>
              </div>
              {dailyLimit.remaining === 0 && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-2">You've reached your daily limit. Try again tomorrow!</p>
              )}
            </div>
            
            {/* Search and Filters */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={searchStudentTerm}
                  onChange={e => setSearchStudentTerm(e.target.value)}
                  className="pl-7 h-8 text-xs"
                />
              </div>
              <Select value={filterSubject} onValueChange={setFilterSubject}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue placeholder="Subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Subjects</SelectItem>
                  {uniqueSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterGrade} onValueChange={setFilterGrade}>
                <SelectTrigger className="w-28 h-8 text-xs">
                  <SelectValue placeholder="Grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Grades</SelectItem>
                  {uniqueGrades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            {/* Students List */}
            {loadingStudents ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No students looking for help right now.</p>
                <p className="text-xs mt-1">Check back later!</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {filteredStudents.map(student => (
                  <div key={student.id} className="border rounded-xl p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{student.users?.full_name || student.users?.email || 'Student'}</p>
                        <div className="flex gap-1.5 mt-1">
                          <Badge className="text-xs">{student.subject}</Badge>
                          <Badge variant="outline" className="text-xs">{student.grade}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                          {student.description}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => initiateConversation(student)}
                        disabled={dailyLimit.remaining <= 0}
                        className="gap-1.5 text-xs h-8"
                      >
                        <Send className="w-3.5 h-3.5" /> Apply
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* MY APPLICATIONS TAB */}
          <TabsContent value="applications" className="mt-4">
            {applications.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No applications submitted yet.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {applications.map(app => (
                  <div key={app.id} className="border rounded-xl p-3 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-xs font-semibold text-muted-foreground">
                          {app.student_requests?.subject} • {app.student_requests?.grade}
                        </span>
                        <p className="text-sm font-semibold">
                          {app.student_requests?.users?.full_name || 'Student'}
                        </p>
                      </div>
                      <Badge className={
                        app.status === 'accepted' ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-300' :
                        app.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300' :
                        'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-300'
                      }>
                        {app.status}
                      </Badge>
                    </div>
                    {app.message && (
                      <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-lg italic">
                        "{app.message}"
                      </p>
                    )}
                    <span className="text-[10px] text-muted-foreground self-end">
                      Applied on {new Date(app.created_at).toLocaleDateString('en-ZA')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
