import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Zap, ExternalLink, Play } from 'lucide-react';

const SUGGESTED_QUIZZES = {
  Physics: [
    { title: "Newton's Laws Quiz", code: '6458936f3a9c2b001d2f3a1c', topic: 'Forces & Motion' },
    { title: 'Energy & Work', code: '6458936f3a9c2b001d2f3a2d', topic: 'Energy' },
    { title: 'Waves & Optics', code: '6458936f3a9c2b001d2f3a3e', topic: 'Waves' },
    { title: 'Electric Circuits', code: '6458936f3a9c2b001d2f3a4f', topic: 'Electricity' },
  ],
  Chemistry: [
    { title: 'Acids & Bases', code: '6458936f3a9c2b001d2f3a5g', topic: 'Acids & Bases' },
    { title: 'Chemical Bonding', code: '6458936f3a9c2b001d2f3a6h', topic: 'Bonding' },
    { title: 'Reaction Rates', code: '6458936f3a9c2b001d2f3a7i', topic: 'Kinetics' },
    { title: 'States of Matter', code: '6458936f3a9c2b001d2f3a8j', topic: 'Matter' },
  ],
  Biology: [
    { title: 'Cell Structure', code: '6458936f3a9c2b001d2f3a9k', topic: 'Cell Biology' },
    { title: 'Genetics Basics', code: '6458936f3a9c2b001d2f3b1l', topic: 'Genetics' },
    { title: 'Natural Selection', code: '6458936f3a9c2b001d2f3b2m', topic: 'Evolution' },
    { title: 'Nervous System', code: '6458936f3a9c2b001d2f3b3n', topic: 'Physiology' },
  ],
};

export default function QuizSync({ simulation }) {
  const [customCode, setCustomCode] = useState('');
  const [activeCode, setActiveCode] = useState(null);

  const quizzes = SUGGESTED_QUIZZES[simulation.subject] || [];

  const launch = (code) => {
    const url = `https://quizizz.com/admin/quiz/${code}`;
    window.open(url, '_blank');
    setActiveCode(code);
  };

  const launchCustom = () => {
    if (!customCode.trim()) return;
    const code = customCode.trim().replace(/^https?:\/\/quizizz\.com\/admin\/quiz\//,'');
    launch(code);
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-playfair flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" /> Quiz Sync
          <Badge className="bg-primary/10 text-primary border-primary/20 text-xs ml-auto">Powered by Quizizz</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Test students on <span className="font-medium text-foreground">{simulation.caps_topic}</span> immediately after the simulation.
        </p>

        {/* Suggested quizzes */}
        <div className="space-y-1.5">
          {quizzes.map(q => (
            <div key={q.code} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
              <div>
                <p className="text-sm font-medium">{q.title}</p>
                <p className="text-xs text-muted-foreground">{q.topic}</p>
              </div>
              <Button size="sm" className="bg-primary gap-1.5 h-7 text-xs shrink-0" onClick={() => launch(q.code)}>
                <Play className="w-3 h-3" /> Start
              </Button>
            </div>
          ))}
        </div>

        {/* Custom quiz */}
        <div className="border-t border-border pt-3">
          <p className="text-xs text-muted-foreground mb-2">Or paste a custom Quizizz quiz ID / URL:</p>
          <div className="flex gap-2">
            <Input
              className="text-sm h-8"
              placeholder="Quizizz quiz ID or URL..."
              value={customCode}
              onChange={e => setCustomCode(e.target.value)}
            />
            <Button size="sm" className="bg-primary gap-1.5 h-8 text-xs shrink-0" onClick={launchCustom}>
              <ExternalLink className="w-3 h-3" /> Open
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}