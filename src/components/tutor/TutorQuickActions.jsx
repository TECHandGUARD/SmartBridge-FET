import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, Calendar, Users, Wallet, MessageCircle, BookOpen, Star, Video } from 'lucide-react';

const actions = [
  { key: 'upload', label: 'Upload Resource', icon: Upload, color: 'bg-blue-100 text-blue-700', activeColor: 'bg-blue-600 text-white' },
  { key: 'availability', label: 'Set Availability', icon: Calendar, color: 'bg-green-100 text-green-700', activeColor: 'bg-green-600 text-white' },
  { key: 'students', label: 'My Students', icon: Users, color: 'bg-purple-100 text-purple-700', activeColor: 'bg-purple-600 text-white' },
  { key: 'earnings', label: 'View Earnings', icon: Wallet, color: 'bg-amber-100 text-amber-700', activeColor: 'bg-amber-600 text-white' },
  { key: 'messages', label: 'Messages', icon: MessageCircle, color: 'bg-cyan-100 text-cyan-700', activeColor: 'bg-cyan-600 text-white' },
  { key: 'bookings', label: 'Booking Requests', icon: BookOpen, color: 'bg-rose-100 text-rose-700', activeColor: 'bg-rose-600 text-white' },
  { key: 'reviews', label: 'My Reviews', icon: Star, color: 'bg-orange-100 text-orange-700', activeColor: 'bg-orange-600 text-white' },
  { key: 'sessions', label: 'Live Sessions', icon: Video, color: 'bg-indigo-100 text-indigo-700', activeColor: 'bg-indigo-600 text-white' },
];

export default function TutorQuickActions({ onAction, activeSection, stats }) {
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
                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all relative group ${isActive ? 'bg-muted ring-1 ring-primary/30' : 'hover:bg-muted/50'}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${isActive ? a.activeColor : a.color}`}>
                  <a.icon className="w-5 h-5" />
                </div>
                <span className={`text-[10px] font-medium text-center leading-tight ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{a.label}</span>
                {stats?.[a.key] > 0 && (
                  <Badge className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] h-4 min-w-4 px-1 flex items-center justify-center">
                    {stats[a.key]}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}