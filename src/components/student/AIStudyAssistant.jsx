import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot, Send, Loader2, Sparkles, BookOpen, FileText, Lightbulb, RotateCcw } from 'lucide-react';
import { SUBJECTS } from '@/lib/subjects';
import { toast } from 'sonner';

const QUICK_PROMPTS = [
  { label: 'Explain a concept', icon: Lightbulb, prompt: 'Explain the following CAPS concept in simple terms for a Grade 12 student: ' },
  { label: 'Summarise notes', icon: FileText, prompt: 'Summarise the following study notes in bullet points: ' },
  { label: 'Practice questions', icon: BookOpen, prompt: 'Give me 5 practice exam questions (with answers) for CAPS Grade 12 on: ' },
  { label: 'Study tips', icon: Sparkles, prompt: 'Give me top study tips and exam strategies for CAPS: ' },
];

export default function AIStudyAssistant({ user }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! 👋 I'm your AI Study Assistant. I can help you:\n\n• **Explain complex CAPS concepts** in simple terms\n• **Summarise** your notes or resources\n• **Generate practice questions** for any subject\n• **Give study tips** tailored to your grade\n\nWhat would you like help with today?",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState('');
  const [resources, setResources] = useState([]);
  const [selectedResource, setSelectedResource] = useState('');
  const [remainingChats, setRemainingChats] = useState(null);
  const bottomRef = useRef(null);

  // Fetch resources from Supabase
  useEffect(() => {
    const fetchResources = async () => {
      try {
        const { data, error } = await supabase
          .from('resources')
          .select('*')
          .eq('is_approved', true)
          .order('created_at', { ascending: false })
          .limit(20);
        
        if (error) throw error;
        setResources(data || []);
      } catch (error) {
        console.error('Error fetching resources:', error);
      }
    };
    
    fetchResources();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const userText = (text || input).trim();
    if (!userText) return;
    if (!user?.email) {
      toast.error('Please sign in to use the AI Study Assistant.');
      return;
    }
    
    setInput('');

    const resource = resources.find(r => r.id === selectedResource);
    const resourceContext = resource ? `Student is referring to resource: "${resource.title}" (${resource.subject})` : '';
    const subjectNote = subject || '';

    setMessages(prev => [...prev, { role: 'user', content: userText }]);
    setLoading(true);

    const systemPrompt = `You are an expert South African high school tutor specialising in the CAPS curriculum for Grades 10–12. 
You help students understand difficult concepts, summarise notes, and prepare for exams.
Always be encouraging, clear, and use grade-appropriate language.
Structure your answers with bullet points and bold headings where helpful.
Reference CAPS topics and exam tips when relevant.`;

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          messages: [{ role: 'user', content: userText }],
          systemPrompt,
          subject: subjectNote,
          resourceContext,
          userEmail: user.email,
        },
      });

      if (error) throw error;
      
      if (data.error) {
        toast.error(data.error);
        setMessages(prev => [...prev, { role: 'assistant', content: data.error }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
        if (data.remaining !== undefined) {
          setRemainingChats(data.remaining);
          if (data.remaining <= 3 && data.remaining > 0) {
            toast.warning(`You have ${data.remaining} AI chats remaining today.`);
          }
        }
      }
    } catch (error) {
      console.error('AI chat error:', error);
      toast.error('Failed to connect to AI assistant. Please try again later.');
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I am having trouble connecting right now. Please try again in a few moments.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const reset = () => {
    setMessages([{
      role: 'assistant',
      content: "Hi! 👋 I'm your AI Study Assistant. Ask me anything about CAPS subjects, request a concept explanation, or get practice questions!",
    }]);
    setRemainingChats(null);
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="font-playfair text-lg flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary-foreground" />
            </div>
            AI Study Assistant
            <Badge className="bg-primary/10 text-primary text-xs">CAPS-Powered</Badge>
            {remainingChats !== null && (
              <Badge className="bg-amber-100 text-amber-700 text-xs">
                {remainingChats} chats left today
              </Badge>
            )}
          </CardTitle>
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground" onClick={reset}>
            <RotateCcw className="w-3 h-3" /> New Chat
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap mt-2">
          <Select value={subject} onValueChange={setSubject}>
            <SelectTrigger className="h-8 text-xs w-44">
              <SelectValue placeholder="Filter by subject…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All subjects</SelectItem>
              {SUBJECTS.map(s => <SelectItem key={s.code} value={s.name}>{s.icon} {s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {resources.length > 0 && (
            <Select value={selectedResource} onValueChange={setSelectedResource}>
              <SelectTrigger className="h-8 text-xs w-52">
                <SelectValue placeholder="Ask about a resource…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No resource selected</SelectItem>
                {resources.slice(0, 15).map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.title.substring(0, 36)}{r.title.length > 36 ? '…' : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Quick prompts */}
        <div className="flex gap-2 flex-wrap mt-1">
          {QUICK_PROMPTS.map(({ label, icon: Icon, prompt }) => (
            <button
              key={label}
              onClick={() => setInput(prompt)}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-muted hover:bg-primary/10 hover:text-primary transition-colors border border-border"
            >
              <Icon className="w-3 h-3" /> {label}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Messages */}
        <div className="h-80 overflow-y-auto px-4 py-2 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-primary-foreground" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-tr-sm'
                  : 'bg-muted text-foreground rounded-tl-sm'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                <Bot className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border px-4 py-3 flex gap-2">
          <Input
            placeholder="Ask about a CAPS concept, request a summary, or get practice questions…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            className="text-sm"
          />
          <Button onClick={() => sendMessage()} disabled={loading || !input.trim()} className="bg-primary gap-1.5 flex-shrink-0">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}