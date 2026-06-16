import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageCircle, Send, ArrowLeft, Loader2, AlertCircle, 
  Search, UserPlus, Paperclip, FileText, CheckCircle, XCircle,
  Users, Clock, Filter, Plus
} from 'lucide-react';
import { toast } from 'sonner';

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

  // QUICK REPLIES TEMPLATES
  const QUICK_REPLIES = [
    "I'm available for a session. What time works for you?",
    "Can you share which topics you're struggling with?",
    "I've attached some practice materials for you.",
    "Great session today! Your homework is: ",
    "Let me know if you need any clarification on today's lesson."
  ];

  // Load conversations
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
        .order('created_at', { ascending: false })
        .limit(200);
      
      if (messagesError) throw messagesError;
      
      const mine = (allMessages || []).filter(m => 
        m.room_id?.includes(user.email)
      );
      
      const roomMap = {};
      mine.forEach(m => {
        if (!roomMap[m.room_id]) {
          roomMap[m.room_id] = { room_id: m.room_id, messages: [] };
        }
        roomMap[m.room_id].messages.push(m);
      });
      
      const rooms = Object.values(roomMap).map(r => {
        const sorted = r.messages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const other = sorted[0]?.sender_email === user.email ? null : sorted[0];
        const otherEmail = r.room_id.split('__').find(e => e !== user.email);
        return {
          room_id: r.room_id,
          otherEmail,
          otherName: other?.sender_name || otherEmail,
          lastMessage: sorted[0]?.content || '',
          lastTime: sorted[0]?.created_at,
          unread: sorted.filter(m => m.sender_email !== user.email && !m.read).length,
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

  // Load available students for tutors to apply to
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
      
      // Get today's application count for daily limit
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
          user_profiles!inner(full_name, email, grade)
        `)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(20);
      
      // Filter by tutor's subjects
      if (tutorProfile?.subjects?.length > 0) {
        query = query.in('subject', tutorProfile.subjects);
      }
      
      const { data: students, error: studentsError } = await query;
      
      if (studentsError) throw studentsError;
      
      // Filter out students the tutor has already applied to
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
        m.sender_email !== user.email && !m.read
      );
      
      for (const msg of unreadMessages) {
        await supabase
          .from('chat_messages')
          .update({ read: true, read_at: new Date().toISOString() })
          .eq('id', msg.id);
      }
    } catch (err) {
      console.error('Error loading room messages:', err);
      toast.error('Failed to load messages');
    }
  }, [user?.email]);

  // Load tutor's applications
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
            user_profiles!inner(full_name, email)
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

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user?.email) return;
    
    loadConversations();
    loadAvailableStudents();
    loadApplications();
    
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
          loadConversations();
          
          if (activeRoom && newMessage.room_id === activeRoom.room_id) {
            setMessages(prev => [...prev, newMessage]);
            if (newMessage.sender_email !== user.email) {
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
          if (activeRoom && payload.new?.room_id === activeRoom.room_id && payload.new?.user_email !== user.email) {
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openRoom = async (room) => {
    setActiveRoom(room);
    await loadRoomMessages(room.room_id);
  };

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
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setMessages(prev => [...prev, data]);
      setInput('');
      loadConversations();
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

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

  const initiateConversation = async (student) => {
    if (dailyLimit.remaining <= 0) {
      toast.error(`You've reached your daily application limit (${dailyLimit.limit}). Please try again tomorrow.`);
      return;
    }
    
    const roomId = [user.email, student.user_profiles.email].sort().join('__');
    
    // Check if conversation already exists
    const { data: existing } = await supabase
      .from('chat_messages')
      .select('room_id')
      .eq('room_id', roomId)
      .limit(1);
    
    if (existing?.length > 0) {
      const room = conversations.find(c => c.room_id === roomId);
      if (room) openRoom(room);
      toast.info('Conversation already exists');
    } else {
      // Create application record
      const { error: appError } = await supabase
        .from('tutor_applications')
        .insert({
          tutor_email: user.email,
          student_request_id: student.id,
          message: `I'd love to help you with ${student.subject}!`,
          status: 'pending'
        });
      
      if (appError) throw appError;
      
      // Send first message
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: roomId,
          sender_email: user.email,
          sender_name: user.full_name || user.email,
          recipient_email: student.user_profiles.email,
          content: `Hi! I'm ${user.full_name || 'a tutor'}. I saw you need help with ${student.subject}. I'd love to discuss how I can assist you.`,
        });
      
      if (error) throw error;
      
      // Mark student request as contacted
      await supabase
        .from('student_requests')
        .update({ status: 'contacted', contacted_by: user.email })
        .eq('id', student.id);
      
      toast.success(`Application sent to ${student.user_profiles.full_name}!`);
      loadAvailableStudents();
      loadApplications();
      loadConversations();
    }
  };

  const uploadAndSendFile = async (file) => {
    if (!activeRoom) return;
    
    setUploadingFile(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `chat-attachments/${activeRoom.room_id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(fileName);
      
      await supabase.from('chat_messages').insert({
        room_id: activeRoom.room_id,
        sender_email: user.email,
        sender_name: user.full_name || user.email,
        recipient_email: activeRoom.otherEmail,
        content: `📎 ${file.name}\n${publicUrl}`,
        attachment_url: publicUrl,
        attachment_type: file.type,
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

  // Filter available students
  const filteredStudents = availableStudents.filter(s => {
    const matchesSearch = !searchStudentTerm || 
      s.user_profiles?.full_name?.toLowerCase().includes(searchStudentTerm.toLowerCase()) ||
      s.user_profiles?.email?.toLowerCase().includes(searchStudentTerm.toLowerCase());
    const matchesSubject = !filterSubject || s.subject === filterSubject;
    const matchesGrade = !filterGrade || s.grade === filterGrade;
    return matchesSearch && matchesSubject && matchesGrade;
  });

  // Get unique subjects and grades for filters
  const uniqueSubjects = [...new Set(availableStudents.map(s => s.subject).filter(Boolean))];
  const uniqueGrades = [...new Set(availableStudents.map(s => s.grade).filter(Boolean))];

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
        </div>
        
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
                          <p className="break-words">{msg.content}</p>
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
                  <Button size="sm" onClick={sendMessage} disabled={sending || !input.trim()} className="h-9 px-3">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
          
          {/* FIND STUDENTS TAB */}
          <TabsContent value="find" className="mt-4 space-y-4">
            {/* Daily Limit Banner */}
            <div className={`p-3 rounded-lg ${dailyLimit.remaining > 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
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
                <p className="text-xs text-red-600 mt-2">You've reached your daily limit. Try again tomorrow!</p>
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
                        <p className="font-semibold">{student.user_profiles?.full_name || student.user_profiles?.email}</p>
                        <div className="flex gap-1.5 mt-1">
                          <Badge className="text-xs">{student.subject}</Badge>
                          <Badge variant="outline" className="text-xs">{student.grade}</Badge>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => initiateConversation(student)}
                        disabled={dailyLimit.remaining === 0}
                        className="bg-primary gap-1"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Offer Help
                      </Button>
                    </div>
                    {student.description && (
                      <p className="text-sm text-muted-foreground mt-2">{student.description}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-2">
                      Posted: {new Date(student.created_at).toLocaleDateString('en-ZA')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          
          {/* APPLICATIONS TAB */}
          <TabsContent value="applications" className="mt-4">
            {applications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No applications sent yet.</p>
                <button 
                  onClick={() => setActiveTab('find')}
                  className="text-primary hover:underline text-sm mt-2"
                >
                  Find students to apply →
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {applications.map(app => (
                  <div key={app.id} className="border rounded-xl p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{app.student_requests?.user_profiles?.full_name || 'Student'}</p>
                        <div className="flex gap-1.5 mt-1">
                          <Badge className="text-xs">{app.student_requests?.subject}</Badge>
                          <Badge variant="outline" className="text-xs">{app.student_requests?.grade}</Badge>
                        </div>
                      </div>
                      <Badge className={`text-xs ${
                        app.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        app.status === 'accepted' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {app.status}
                      </Badge>
                    </div>
                    {app.student_requests?.description && (
                      <p className="text-sm text-muted-foreground mt-2">{app.student_requests.description}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-2">
                      Applied: {new Date(app.created_at).toLocaleDateString('en-ZA')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardHeader>
    </Card>
  );
}