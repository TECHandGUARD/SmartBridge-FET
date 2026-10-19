import LearningAnswer from './LearningAnswer';
import ReleaseGate from '@/components/operations/ReleaseGate';
import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot, Send, Loader2, Sparkles, BookOpen, FileText, Lightbulb, RotateCcw, Shield, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { SUBJECTS } from '@/lib/subjects';
const appName = import.meta.env.VITE_APP_NAME || 'SmartBridge FET';
const FALLBACK_PROMPTS = [{
  label: 'Explain a concept',
  icon: 'Lightbulb',
  prompt: 'Explain the following CAPS concept in simple terms: '
}, {
  label: 'Summarise notes',
  icon: 'FileText',
  prompt: 'Summarise the following study notes in bullet points: '
}, {
  label: 'Practice questions',
  icon: 'BookOpen',
  prompt: 'Give me 5 practice exam questions (with answers) for CAPS on: '
}, {
  label: 'Study tips',
  icon: 'Sparkles',
  prompt: 'Give me top study tips and exam strategies for CAPS: '
}];
const ICON_MAP = {
  Lightbulb,
  FileText,
  BookOpen,
  Sparkles
};
const FALLBACK_WELCOME = "Hi! 👋 I'm your AI Study Assistant. I can help you explain CAPS concepts, summarise notes, generate practice questions, and give study tips.\n\nWhat would you like help with today?";
const GRADES = ['Grade 10', 'Grade 11', 'Grade 12'];
function AIStudyAssistantImplementation({
  user
}) {
  const [quickPrompts, setQuickPrompts] = useState(FALLBACK_PROMPTS);
  const [messages, setMessages] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [resources, setResources] = useState([]);
  const [selectedResource, setSelectedResource] = useState('');
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const loadConfig = useCallback(async () => {
    try {
      const {
        data: configData,
        error: configError
      } = await supabase.functions.invoke('get-chatbot-configuration', {
        body: {}
      });
      if (configError) throw configError;
      if (configData?.studyAssistantPrompts?.length) {
        setQuickPrompts(configData.studyAssistantPrompts);
      }
    } catch (err) {
      console.error('Error loading config:', err);
      setQuickPrompts(FALLBACK_PROMPTS);
    }
  }, []);
  const loadResources = useCallback(async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('resources').select('*').eq('is_approved', true).order('created_at', {
        ascending: false
      }).limit(20);
      if (error) throw error;
      setResources(data || []);
    } catch (err) {
      console.error('Error loading resources:', err);
      toast.error('Failed to load resources');
      setResources([]);
    }
  }, []);
  useEffect(() => {
    Promise.all([loadConfig(), loadResources()]).catch(() => {});
    setMessages([{
      role: 'assistant',
      content: FALLBACK_WELCOME
    }]);
    if (user?.email) {
      Promise.resolve(supabase.from('activity_log').insert({
        event_type: 'ai_assistant_started',
        user_email: user.email,
        user_id: user.id || null,
        description: 'Started AI Study Assistant session'
      })).catch(() => {});
    }
  }, [loadConfig, loadResources, user]);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: 'smooth'
    });
  }, [messages, loading]);
  const sendMessage = async text => {
    const userText = (text || input).trim();
    if (!userText || !messages) return;
    setInput('');
    setError(null);
    const resource = resources.find(r => r.id === selectedResource);
    const contextNote = resource ? `\n\n[Context: The student is referring to "${resource.title}" (${resource.subject}, ${resource.grade}).]` : '';
    const subjectNote = subject ? `\n\n[Student is studying: ${subject}]` : '';
    const gradeNote = grade ? `\n\n[Student is in: ${grade}]` : '';
    setMessages(prev => [...prev, {
      role: 'user',
      content: userText
    }]);
    setLoading(true);
    const sanitizedInput = userText.replace(/<script/g, '&lt;script').replace(/<\/script>/g, '&lt;/script&gt;').slice(0, 2000);
    const baseGuardrail = `You are a strict South African CAPS curriculum tutor for Grades 10-12.
Only provide educationally appropriate content aligned with CAPS.
Politely decline off-topic, harmful, or non-educational requests.
Never share personal information or tutor contracts.
Do not provide answers to assessment questions without teaching the concept first.`;
    const systemContext = `${baseGuardrail}

You help students understand difficult concepts, summarise notes, and prepare for exams.
Always be encouraging, clear, and use grade-appropriate language.
Start with a short, direct explanation. Explain technical terms simply. Use complete sentences and well-structured paragraphs. Give more detail when the learner asks.
Reference CAPS topics and exam tips when relevant.${subjectNote}${gradeNote}${contextNote}

Important: If the student asks about tutor contracts, Terms of Service, or other confidential information, politely decline and redirect to the support team.`;
    try {
      const {
        data,
        error: invokeError
      } = await supabase.functions.invoke('invoke-llm', {
        body: {
          prompt: `${systemContext}\n\nStudent question: ${userText}`,
          question: userText,
          history: messages.slice(-6).map(({ role, content }) => ({ role, content: content.slice(0, 700) })),
          task: 'study-assistant',
          user_email: user?.email,
          subject: subject || null,
          grade: grade || null,
          user_id: user?.id || null
        }
      });
      if (invokeError) {
        let message = 'The AI service is temporarily unavailable. Please try again shortly.';
        try {
          const details = await invokeError.context?.json();
          const allowed = ['The AI provider has reached its usage allowance. Please try again later.', 'Usage limit reached. Try again later.', 'AI provider is not configured', 'Provider busy. Try again later.', 'Provider temporarily unavailable'];
          if (allowed.includes(details?.error)) message = details.error;
        } catch { /* Keep the safe fallback message. */ }
        throw new Error(message);
      }
      const response = data?.response || 'Sorry, I could not generate a response. Please try again.';
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response,
        sources: data?.sources || [],
        sourceMode: data?.source_mode || null,
        webSearch: data?.web_search || null
      }]);
      if (user?.email) {
        await Promise.resolve(supabase.from('activity_log').insert({
          event_type: 'ai_assistant_query',
          user_email: user.email,
          user_id: user.id || null,
          description: 'AI Assistant query',
          metadata: {
            subject: subject || null,
            grade: grade || null,
            resource_id: selectedResource || null,
            message_length: sanitizedInput.length
          }
        })).catch(() => {});
      }
    } catch (err) {
      console.error('LLM error:', err);
      const message = err.message || 'The AI service is temporarily unavailable. Please try again shortly.';
      setError(message);
      toast.error(message);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: message
      }]);
    } finally {
      setLoading(false);
    }
  };
  const reset = () => {
    setMessages([{
      role: 'assistant',
      content: FALLBACK_WELCOME
    }]);
    setError(null);
    if (user?.email) {
      Promise.resolve(supabase.from('activity_log').insert({
        event_type: 'ai_assistant_reset',
        user_email: user.email,
        user_id: user.id || null,
        description: 'Reset AI Study Assistant chat'
      })).catch(() => {});
    }
  };
  if (!messages) {
    return <Card className="border-border">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </CardContent>
      </Card>;
  }
  return <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="font-playfair text-lg flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary-foreground" />
            </div>
            AI Study Assistant
            <Badge className="bg-primary/10 text-primary text-xs">Document-grounded when sources are available</Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Shield className="w-3 h-3 text-green-500" /> Safe & Secure
            </Badge>
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground" onClick={reset}>
              <RotateCcw className="w-3 h-3" /> New Chat
            </Button>
          </div>
        </div>

        {}
        <div className="flex gap-2 flex-wrap mt-2">
          <Select value={subject || '__all__'} onValueChange={value => setSubject(value === '__all__' ? '' : value)}>
            <SelectTrigger className="h-8 text-xs w-44">
              <SelectValue placeholder="Filter by subject…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All subjects</SelectItem>
              {SUBJECTS.map(s => <SelectItem key={s.code} value={s.name}>{s.icon} {s.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={grade || '__all__'} onValueChange={value => setGrade(value === '__all__' ? '' : value)}>
            <SelectTrigger className="h-8 text-xs w-36">
              <SelectValue placeholder="Filter by grade…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All grades</SelectItem>
              {GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>

          {resources.length > 0 && <Select value={selectedResource || '__none__'} onValueChange={value => setSelectedResource(value === '__none__' ? '' : value)}>
              <SelectTrigger className="h-8 text-xs w-52">
                <SelectValue placeholder="Ask about a resource…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No resource selected</SelectItem>
                {resources.slice(0, 15).map(r => <SelectItem key={r.id} value={r.id}>
                    {r.source_type === 'tutor' ? '👨‍🏫 ' : '📚 '}
                    {r.title.substring(0, 34)}{r.title.length > 34 ? '…' : ''}
                  </SelectItem>)}
              </SelectContent>
            </Select>}
        </div>

        {}
        <div className="flex gap-2 flex-wrap mt-1">
          {quickPrompts.map(({
          label,
          icon,
          prompt
        }) => {
          const Icon = ICON_MAP[icon] || Lightbulb;
          return <button key={label} onClick={() => setInput(prompt)} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-muted hover:bg-primary/10 hover:text-primary transition-colors border border-border" disabled={loading}>
                <Icon className="w-3 h-3" /> {label}
              </button>;
        })}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {}
        {error && <div className="px-4 pt-2">
            <div className="bg-red-50 border border-red-200 rounded-lg p-2 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          </div>}

        {}
        <div className="h-[28rem] overflow-y-auto px-3 sm:px-4 py-3 space-y-4">
          {messages.map((msg, i) => <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {msg.role === 'assistant' && <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-primary-foreground" />
                </div>}
              <div className={`min-w-0 max-w-[92%] sm:max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-sm whitespace-pre-wrap' : 'bg-muted text-foreground rounded-tl-sm'}`}>
                {msg.role === 'assistant' ? <>
                  <LearningAnswer content={msg.sourceMode ? msg.content.split(/\n\n(?:Web-assisted explanation;|General explanations may supplement uploaded material;)/)[0] : msg.content} />
                  {msg.sourceMode && <details className="mt-3 border-t border-border pt-2 text-xs text-muted-foreground">
                    <summary className="cursor-pointer py-1 font-medium">Sources and answer basis</summary>
                    <p className="mt-2 leading-relaxed">{msg.sourceMode.includes('documents') ? 'Includes retrieved material from uploaded learning documents. ' : 'No matching uploaded textbook excerpts were found. '}{msg.webSearch === 'completed' ? 'Web research was also available; general explanations may supplement it.' : 'This answer may include general AI knowledge. Web research was not available for this answer.'}</p>
                    {msg.sources.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-4">
                      {msg.sources.map((source, index) => <li key={index}>{source.source_type === 'web' && /^https:\/\//i.test(source.url || '') ? <a href={source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{source.title}</a> : <>{source.title}{source.page ? `, page ${source.page}` : ''}</>}</li>)}
                    </ul>}
                  </details>}
                </> : msg.content}
              </div>
            </div>)}
          {loading && <div className="flex gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                <Bot className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking…
              </div>
            </div>}
          <div ref={bottomRef} />
        </div>

        {}
        <div className="border-t border-border px-4 py-3 flex gap-2">
          <Input placeholder="Ask about a CAPS concept, request a summary, or get practice questions…" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
          }
        }} disabled={loading} className="text-sm" maxLength={2000} />
          <Button onClick={() => sendMessage()} disabled={loading || !input.trim()} className="bg-primary gap-1.5 flex-shrink-0">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send
          </Button>
        </div>

        {}
        <div className="px-4 py-1.5 border-t border-border/50">
          <p className="text-[9px] text-muted-foreground text-center">
            Do not share personal information. AI answers can be inaccurate; verify with your teacher.

          </p>
        </div>
      </CardContent>
    </Card>;
}

export default function AIStudyAssistant(props) {
 return <ReleaseGate feature="externalAi"><AIStudyAssistantImplementation {...props} /></ReleaseGate>;
}
