import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Loader2, AlertCircle, Info, Shield } from 'lucide-react';
import { toast } from 'sonner';

// ============================================================
// Configuration (Soft-coded for admin control)
// ============================================================

const appName = import.meta.env.VITE_APP_NAME || 'SmartBridge FET';

// ============================================================
// Constants
// ============================================================

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

// ============================================================
// Main Component
// ============================================================

export default function StudyHeatmap({ user }) {
  const [heatmap, setHeatmap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ============================================================
  // Fetch Study Session Heatmap Data
  // ============================================================

  const fetchStudySessionHeatmap = useCallback(async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: dbError } = await supabase
        .from('study_sessions')
        .select('session_date, session_hour')
        .eq('student_email', user.email);

      if (dbError) throw dbError;

      const sessions = data || [];
      const calculatedHeatmap = {};

      sessions.forEach(s => {
        if (!s.session_date || s.session_hour === undefined) return;
        
        const dateObj = new Date(s.session_date);
        const rawDay = dateObj.getDay(); 
        const dayIdx = rawDay === 0 ? 6 : rawDay - 1; // Mon=0, Sun=6

        const key = `${dayIdx}-${s.session_hour}`;
        calculatedHeatmap[key] = (calculatedHeatmap[key] || 0) + 1;
      });

      setHeatmap(calculatedHeatmap);

      // Log activity for POPIA compliance
      if (user?.email) {
        await supabase
          .from('activity_log')
          .insert({
            event_type: 'heatmap_viewed',
            user_email: user.email,
            user_id: user.id || null,
            description: 'Viewed study heatmap',
            metadata: {
              total_sessions: sessions.length,
              unique_hours: Object.keys(calculatedHeatmap).length
            }
          })
          .catch(() => {});
      }

    } catch (err) {
      console.error('Heatmap mapping failure:', err);
      setError(err.message || 'Failed to load study heatmap data');
      toast.error('Failed to load heatmap');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStudySessionHeatmap();
  }, [fetchStudySessionHeatmap]);

  // ============================================================
  // Color Calculation
  // ============================================================

  const maxCountValue = Math.max(1, ...Object.values(heatmap));

  const getCellColorClass = (count) => {
    if (!count) return 'bg-muted/30 border-border dark:bg-muted/20';
    const intensity = count / maxCountValue;
    if (intensity > 0.75) return 'bg-primary border-primary shadow-sm dark:bg-primary/80';
    if (intensity > 0.5) return 'bg-primary/70 border-primary/50 dark:bg-primary/60';
    if (intensity > 0.25) return 'bg-primary/40 border-primary/30 dark:bg-primary/40';
    return 'bg-primary/20 border-primary/20 dark:bg-primary/25';
  };

  // ============================================================
  // Loading State
  // ============================================================

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

  // ============================================================
  // Render
  // ============================================================

  return (
    <Card className="border-border shadow-md max-w-2xl mx-auto bg-card">
      <CardHeader className="pb-3 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary shrink-0" /> Study Time Heatmap
          </CardTitle>
          <Badge variant="outline" className="text-[9px] text-muted-foreground flex items-center gap-1">
            <Shield className="w-3 h-3 text-green-500" /> Private
          </Badge>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Shows your study patterns by day and hour
        </p>
      </CardHeader>
      
      <CardContent className="pt-4">
        {/* Error Display */}
        {error && (
          <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2 dark:bg-red-950/20 dark:border-red-800 dark:text-red-300">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
            <button 
              onClick={fetchStudySessionHeatmap}
              className="ml-auto text-primary hover:underline font-medium"
            >
              Retry
            </button>
          </div>
        )}

        <div className="overflow-x-auto pb-2">
          <div className="min-w-[440px] px-1">
            
            {/* Hour Labels */}
            <div className="flex gap-1 mb-1.5 ml-9">
              {HOURS.map(h => (
                <div key={h} className="flex-1 text-center text-[10px] font-bold text-muted-foreground">
                  {h.toString().padStart(2, '00')}
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
            
            {/* Stats Summary */}
            {Object.keys(heatmap).length > 0 && !error && (
              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-border">
                <div className="text-center">
                  <p className="text-xs font-black text-foreground">
                    {Object.keys(heatmap).length}
                  </p>
                  <p className="text-[9px] text-muted-foreground">Active Hours</p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-black text-foreground">
                    {Object.values(heatmap).reduce((a, b) => a + b, 0)}
                  </p>
                  <p className="text-[9px] text-muted-foreground">Total Sessions</p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-black text-foreground">
                    {maxCountValue}
                  </p>
                  <p className="text-[9px] text-muted-foreground">Peak Hour Sessions</p>
                </div>
              </div>
            )}
            
            {/* Legend */}
            <div className="flex items-center justify-between gap-4 mt-3 pt-2 border-t border-border flex-wrap">
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

            {/* Empty State */}
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
