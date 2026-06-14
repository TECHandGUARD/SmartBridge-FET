import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Loader2, AlertCircle, Info } from 'lucide-react';
import { toast } from 'sonner';

interface UserProps {
  email: string;
}

interface DBStudySession {
  session_date: string;
  session_hour: number;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

export default function StudyHeatmap({ user }: { user: UserProps }) {
  const [heatmap, setHeatmap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.email) return;
    fetchStudySessionHeatmap();
  }, [user?.email]);

  const fetchStudySessionHeatmap = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: dbError } = await supabase
        .from('study_sessions')
        .select('session_date, session_hour')
        .eq('student_email', user.email);

      if (dbError) throw dbError;

      const sessions: DBStudySession[] = data || [];
      const calculatedHeatmap: Record<string, number> = {};

      sessions.forEach(s => {
        if (!s.session_date || s.session_hour === undefined) return;
        
        const dateObj = new Date(s.session_date);
        const rawDay = dateObj.getDay(); 
        const dayIdx = rawDay === 0 ? 6 : rawDay - 1; // Mon=0, Sun=6

        const key = `${dayIdx}-${s.session_hour}`;
        calculatedHeatmap[key] = (calculatedHeatmap[key] || 0) + 1;
      });

      setHeatmap(calculatedHeatmap);
    } catch (err: any) {
      console.error('Heatmap mapping failure:', err);
      setError(err.message || 'Failed to load study heatmap data');
      toast.error('Failed to load heatmap');
    } finally {
      setLoading(false);
    }
  };

  const maxCountValue = Math.max(1, ...Object.values(heatmap));

  const getCellColorClass = (count: number) => {
    if (!count) return 'bg-muted/30 border-border';
    const intensity = count / maxCountValue;
    if (intensity > 0.75) return 'bg-primary border-primary shadow-sm';
    if (intensity > 0.5) return 'bg-primary/70 border-primary/50';
    if (intensity > 0.25) return 'bg-primary/40 border-primary/30';
    return 'bg-primary/20 border-primary/20';
  };

  if (loading) {
    return (
      <Card className="border-border shadow-md max-w-2xl mx-auto bg-card">
        <CardContent className="flex flex-col items-center justify-center py-12 gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Loading heatmap data...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border shadow-md max-w-2xl mx-auto bg-card">
      <CardHeader className="pb-3 border-b bg-muted/30">
        <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary shrink-0" /> Study Time Heatmap
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-4">
        {error && (
          <div className="p-3 mb-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="overflow-x-auto pb-2">
          <div className="min-w-[440px] px-1">
            
            {/* Hour Labels */}
            <div className="flex gap-1 mb-1.5 ml-9">
              {HOURS.map(h => (
                <div key={h} className="flex-1 text-center text-[10px] font-bold text-muted-foreground">
                  {h.toString().padStart(2, '0')}
                </div>
              ))}
            </div>
            
            {/* Grid Rows */}
            {DAYS.map((day, dayIdx) => (
              <div key={day} className="flex items-center gap-1 mb-1">
                <span className="text-[11px] font-bold text-muted-foreground w-8 text-right pr-2 shrink-0">
                  {day}
                </span>
                
                {HOURS.map(hour => {
                  const count = heatmap[`${dayIdx}-${hour}`] || 0;
                  return (
                    <div
                      key={hour}
                      className={`flex-1 h-6 rounded-md border transition-all duration-200 ${getCellColorClass(count)}`}
                      title={count ? `${count} session(s) on ${day} at ${hour}:00` : 'No study sessions'}
                    />
                  );
                })}
              </div>
            ))}
            
            {/* Legend */}
            <div className="flex items-center justify-between gap-4 mt-4 pt-3 border-t border-border flex-wrap">
              <p className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                <Info className="w-3.5 h-3.5 text-muted-foreground" /> Hover over cells to see session details.
              </p>
              
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mr-0.5">Less</span>
                {['bg-muted/30', 'bg-primary/20', 'bg-primary/40', 'bg-primary/70', 'bg-primary'].map((c, i) => (
                  <div key={i} className={`w-3.5 h-3.5 rounded border shadow-inner ${c}`} />
                ))}
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide ml-0.5">More</span>
              </div>
            </div>

            {Object.keys(heatmap).length === 0 && !error && (
              <p className="text-xs font-medium text-muted-foreground text-center py-6 border border-dashed border-border bg-muted/20 rounded-xl mt-3">
                No study sessions logged yet. Activity tracks automatically as you study.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
