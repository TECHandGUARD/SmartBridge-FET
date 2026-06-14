import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, TrendingUp, Brain, Target, FlaskConical, Bookmark, MessageCircle, ClipboardCheck } from 'lucide-react';

const actions = [
  { key: 'subjects',    label: 'My Subjects',    icon: BookOpen,       color: 'bg-primary/10 text-primary',         activeColor: 'bg-primary text-white' },
  { key: 'progress',   label: 'My Progress',    icon: TrendingUp,     color: 'bg-blue-100 text-blue-700',          activeColor: 'bg-blue-600 text-white' },
  { key: 'ai',         label: 'AI Tools',        icon: Brain,          color: 'bg-purple-100 text-purple-700',      activeColor: 'bg-purple-600 text-white' },
  { key: 'goals',      label: 'Goals & Badges',  icon: Target,         color: 'bg-green-100 text-green-700',        activeColor: 'bg-green-600 text-white' },
  { key: 'simulations',label: 'Science Lab',     icon: FlaskConical,   color: 'bg-cyan-100 text-cyan-700',          activeColor: 'bg-cyan-600 text-white' },
  { key: 'bookmarks',  label: 'Bookmarks',       icon: Bookmark,       color: 'bg-amber-100 text-amber-700',        activeColor: 'bg-amber-600 text-white' },
  { key: 'messages',   label: 'Messages',        icon: MessageCircle,  color: 'bg-rose-100 text-rose-700',          activeColor: 'bg-rose-600 text-white' },
  { key: 'applications',label: 'Applications',  icon: ClipboardCheck, color: 'bg-indigo-100 text-indigo-700',      activeColor: 'bg-indigo-600 text-white' },
];

export default function StudentQuickActions({ onAction, activeSection }) {
  return (
    <Card className="border-border sticky top-0 z-20 bg-card/95 backdrop-blur-sm">
      <CardContent className="pt-4 pb-3">
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {actions.map(a => {
            const isActive = activeSection === a.key;
            return (
              <button
                key={a.key}
                onClick={() => onAction(a.key)}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all group ${isActive ? 'bg-muted ring-1 ring-primary/30' : 'hover:bg-muted/50'}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${isActive ? a.activeColor : a.color}`}>
                  <a.icon className="w-5 h-5" />
                </div>
                <span className={`text-[10px] font-medium text-center leading-tight ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{a.label}</span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}