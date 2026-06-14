import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Bot, Send, User, Sparkles, Loader2, ExternalLink, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const FALLBACK_SUGGESTIONS = [
  "What is the NBT and do I need it?",
  "What are the minimum requirements for UCT?",
  "How do I apply for NSFAS?",
  "What is the difference between APS and NBT score?",
  "When do university applications open?",
  "Which universities don't require the NBT?",
];

const FALLBACK_WELCOME = "Hi! 👋 I'm your University & NBT AI Guide. I can help you with university applications, NBT preparation, bursaries, and career guidance.\n\nWhat would you like to know?";

export default function AIAssistantChat({ prospectusUrls = [], grade, subject }) {
  const [suggestions, setSuggestions] = useState(FALLBACK_SUGGESTIONS);
  const [messages, setMessages] = useState(null); // null = loading config
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    supabase.functions.invoke('get-chatbot-configuration', { body: {} })
      .then(res => {
        const data = res.data || {};
        setSuggestions(data.suggestions?.length ? data.suggestions : FALLBACK_SUGGESTIONS);
        const welcome = data.welcomeMessage || FALLBACK_WELCOME;
        setMessages([{ role: 'assistant', content: welcome }]);
      })
      .catch((err) => {
        console.error('Failed to load chatbot config:', err);
        setMessages([{ role: 'assistant', content: FALLBACK_WELCOME }]);
      });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || !messages) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userText }]);
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('student-opportunities-assistant', {
        body: {
          message: userText,
          prospectus_urls: prospectusUrls,
          grade: grade || null,
          subject: subject || null
        }
      });
      
      if (error) throw error;
      
      const reply = data?.reply || "Sorry, I couldn't get a response. Please try again.";
      const sources = data?.source_references || [];
      setMessages(prev => [...prev, { role: 'assistant', content: reply, sources }]);
    } catch (err) {
      console.error('AI Assistant error:', err);
      toast.error('Failed to get response. Please try again.');
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, something went wrong. Please try again in a moment." }]);
    } finally {
      setLoading(false);
    }
  };

  if (!messages) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3 pb-3 border-b">
        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="font-semibold text-sm">University & NBT AI Guide</p>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <p className="text-xs text-muted-foreground">Online · Powered by AI</p>
          </div>
        </div>
        <Badge className="ml-auto bg-gold-light text-yellow-800 text-xs gap-1">
          <Sparkles className="w-3 h-3" /> Premium
        </Badge>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[300px] max-h-[400px]">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                <Bot className="w-3.5 h-3.5 text-primary" />
              </div>
            )}
            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed ${
              msg.role === 'user'
                ? 'bg-primary text-white rounded-tr-sm'
                : 'bg-muted text-foreground rounded-tl-sm'
            }`}>
              {msg.content}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-2 border-t border-border/50 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><BookOpen className="w-3 h-3" /> Sources</p>
                  {msg.sources.map((src, si) => (
                    <a key={si} href={src.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-start gap-1.5 text-xs text-primary hover:underline">
                      <ExternalLink className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>{src.title}{src.caps_alignment_tag ? ` — ${src.caps_alignment_tag}` : ''}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                <User className="w-3.5 h-3.5 text-primary" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-2 justify-start">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bot className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="bg-muted rounded-2xl rounded-tl-sm px-3 py-2 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length === 1 && suggestions.length > 0 && (
        <div className="py-3">
          <p className="text-xs text-muted-foreground mb-2">Suggested questions:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map(s => (
              <button key={s} onClick={() => sendMessage(s)}
                className="text-xs bg-accent text-accent-foreground px-2 py-1 rounded-full hover:bg-primary hover:text-white transition-colors">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-3 border-t mt-2">
        <Input
          placeholder="Ask about universities, NBT, bursaries..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          className="text-sm"
        />
        <Button onClick={() => sendMessage()} disabled={!input.trim() || loading} size="icon">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}