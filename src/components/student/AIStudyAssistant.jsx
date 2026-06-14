import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot, Send, Loader2, Sparkles, BookOpen, FileText, Lightbulb, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { SUBJECTS } from '@/lib/subjects';

const FALLBACK_PROMPTS = [
  { label: 'Explain a concept', icon: 'Lightbulb', prompt: 'Explain the following CAPS concept in simple terms: ' },
  { label: 'Summarise notes', icon: 'FileText', prompt: 'Summarise the following study notes in bullet points: ' },
  { label: 'Practice questions', icon: 'BookOpen', prompt: 'Give me 5 practice exam questions (with answers) for CAPS on: ' },
  { label: 'Study tips', icon: 'Sparkles', prompt: 'Give me top study tips and exam strategies for CAPS: ' },
];

const ICON_MAP = { Lightbulb, FileText, BookOpen, Sparkles };

const FALLBACK_WELCOME = "Hi! 👋 I'm your AI Study Assistant. I can help you explain CAPS concepts, summarise notes, generate practice questions, and give study tips.\n\nWhat would you like help with today?";

export default function AIStudyAssistant({ user }) {
  const [quickPrompts, setQuickPrompts] = useState(FALLBACK_PROMPTS);
  const [messages, setMessages] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState('');
  const [resources, setResources] = useState([]);
  const [selectedResource, setSelectedResource] = useState('');
  const bottomRef = useRef(null);

  const loadConfig = useCallback(async () => {
    try {
      // Load chatbot configuration
      const { data: configData, error: configError } = await supabase
        .functions.invoke('get-chatbot-configuration', { body: {} });
      
      if (!configError && configData?.studyAssistantPrompts?.length) {
        setQuickPrompts(configData.studyAssistantPrompts);
      }
    } catch (err) {
      console.error('Error loading config:', err);
    }
  }, []);

  const loadResources = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('educational_resources')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      setResources(data || []);
    } catch (err) {
      console.error('Error loading resources:', err);
      toast.error('Failed to load resources');
    }
  }, []);

  useEffect(() => {
    Promise.all([loadConfig(), loadResources()]).catch(() => {});
    setMessages([{ role: 'assistant', content: FALLBACK_WELCOME }]);
  }, [loadConfig, loadResources]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const userText = (text || input).trim();
    if (!userText || !messages) return;
    setInput('');

    const resource = resources.find(r => r.id === selectedResource);
    const contextNote = resource
      ? `\n\n[Context: The student is referring to "${resource.title}" (${resource.subject}, ${resource.grade}).]`
      : '';
    const subjectNote = subject ? `\n\n[Student is studying: ${subject}]` : '';

    setMessages(prev => [...prev, { role: 'user', content: userText }]);
    setLoading(true);

    const baseGuardrail = 'You are a strict South African CAPS curriculum tutor for Grades 10-12. Only provide educationally appropriate content aligned with CAPS. Politely decline off-topic or harmful requests.';

    const systemContext = `${baseGuardrail}

You help students understand difficult concepts, summarise notes, and prepare for exams.
Always be encouraging, clear, and use grade-appropriate language.
Structure your answers with bullet points and bold headings where helpful.
Reference CAPS topics and exam tips when relevant.${subjectNote}${contextNote}`;

    try {
      // Call Supabase Edge Function for LLM
      const { data, error } = await supabase.functions.invoke('invoke-llm', {
        body: {
          prompt: `${systemContext}\n\nStudent question: ${userText}`,
          model: 'claude_sonnet_4_6'
        }
      });
      
      if (error) throw error;
      
      setMessages(prev => [...prev, { role: 'assistant', content: data?.response || 'Sorry, I could not generate a response.' }]);
    } catch (err) {
      console.error('LLM error:', err);
      toast.error('Failed to get response. Please try again.');
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again in a moment.' }]);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => setMessages([{ role: 'assistant', content: FALLBACK_WELCOME }]);

  if (!messages) {
    return (
      <Card className="border-border">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

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
          </CardTitle>
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground" onClick={reset}>
            <RotateCcw className="w-3 h-3" /> New Chat
          </Button>
        </div>

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

        <div className="flex gap-2 flex-wrap mt-1">
          {quickPrompts.map(({ label, icon, prompt }) => {
            const Icon = ICON_MAP[icon] || Lightbulb;
            return (
              <button key={label} onClick={() => setInput(prompt)}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-muted hover:bg-primary/10 hover:text-primary transition-colors border border-border">
                <Icon className="w-3 h-3" /> {label}
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="p-0">
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

        <div className="border-t border-border px-4 py-3 flex gap-2">
          <Input
            placeholder="Ask about a CAPS concept, request a summary, or get practice questions…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
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
