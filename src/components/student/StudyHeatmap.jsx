import { useEffect, useState } from 'react';
import { supabase } from '@/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { toast } from 'sonner';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

export default function StudyHeatmap({ user }) {
  const [heatmap, setHeatmap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;
    
    const fetchSessions = async () => {
      setLoading(true);
      try {
        // Fetch study sessions from Supabase
        const { data: sessions, error } = await supabase
          .from('study_sessions')
          .select('*')
          .eq('user_email', user.email);
        
        if (error) throw error;
        
        const map = {};
        (sessions || []).forEach(s => {
          if (!s.session_date || s.hour === undefined) return;
          const d = new Date(s.session_date);
          // Convert JS Sunday=0 to Monday=0 (Monday=0, Sunday=6)
          const dayIdx = (d.getDay() + 6) % 7;
          const key = `${dayIdx}-${s.hour}`;
          map[key] = (map[key] || 0) + 1;
        });
        setHeatmap(map);
      } catch (error) {
        console.error('Error fetching study sessions:', error);
        toast.error('Failed to load study heatmap');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSessions();
  }, [user]);

  const max = Math.max(1, ...Object.values(heatmap));

  const getColor = (count) => {
    if (!count) return 'bg-muted/40';
    const intensity = count / max;
    if (intensity > 0.75) return 'bg-primary';
    if (intensity > 0.5) return 'bg-primary/70';
    if (intensity > 0.25) return 'bg-primary/40';
    return 'bg-primary/20';
  };

  if (loading) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-playfair flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" /> Study Time Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-6">
            <div className="w-5 h-5 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-playfair flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" /> Study Time Heatmap
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[360px]">
            {/* Hour labels */}
            <div className="flex gap-0.5 mb-1 ml-8">
              {HOURS.map(h => (
                <div key={h} className="flex-1 text-center text-xs text-muted-foreground">{h}</div>
              ))}
            </div>
            {/* Grid */}
            {DAYS.map((day, dayIdx) => (
              <div key={day} className="flex items-center gap-0.5 mb-0.5">
                <span className="text-xs text-muted-foreground w-8 text-right pr-1 flex-shrink-0">{day}</span>
                {HOURS.map(hour => {
                  const count = heatmap[`${dayIdx}-${hour}`] || 0;
                  return (
                    <div
                      key={hour}
                      className={`flex-1 h-5 rounded-sm ${getColor(count)} transition-colors cursor-default`}
                      title={count ? `${count} session(s) on ${day} at ${hour}:00` : 'No sessions'}
                    />
                  );
                })}
              </div>
            ))}
            {/* Legend */}
            <div className="flex items-center gap-2 mt-3 justify-end">
              <span className="text-xs text-muted-foreground">Less</span>
              {['bg-muted/40', 'bg-primary/20', 'bg-primary/40', 'bg-primary/70', 'bg-primary'].map(c => (
                <div key={c} className={`w-4 h-4 rounded-sm ${c}`} />
              ))}
              <span className="text-xs text-muted-foreground">More</span>
            </div>
            {Object.keys(heatmap).length === 0 && (
              <p className="text-xs text-muted-foreground text-center mt-2">No study sessions logged yet. Sessions are recorded as you study.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}