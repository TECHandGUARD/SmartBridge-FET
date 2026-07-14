import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Bell, Plus, Trash2, Loader2, AlertCircle, Shield } from 'lucide-react';
import { toast } from 'sonner';

// ============================================================
// Configuration (Soft-coded for admin control)
// ============================================================

const appName = import.meta.env.VITE_APP_NAME || 'SmartBridge FET';

// ============================================================
// Constants
// ============================================================

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const SUBJECT_OPTIONS = [
  { name: 'Mathematics', icon: '📐' },
  { name: 'Physical Sciences', icon: '⚗️' },
  { name: 'Life Sciences', icon: '🧬' },
  { name: 'Accounting', icon: '📊' },
  { name: 'Economics', icon: '📈' },
  { name: 'History', icon: '⏳' },
  { name: 'Geography', icon: '🌍' },
  { name: 'Business Studies', icon: '💼' },
  { name: 'English', icon: '📖' },
  { name: 'Afrikaans', icon: '📝' },
];

// ============================================================
// Main Component
// ============================================================

export default function StudyReminderManager({ user }) {
  const [reminders, setReminders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({ 
    subject: 'Mathematics', 
    day_of_week: 'Monday', 
    reminder_time: '16:00' 
  });

  // ============================================================
  // Fetch Reminders
  // ============================================================

  const fetchReminders = useCallback(async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: dbError } = await supabase
        .from('study_reminders')
        .select('id, subject, day_of_week, reminder_time, is_active')
        .eq('student_email', user.email)
        .order('created_at', { ascending: true });

      if (dbError) throw dbError;
      setReminders(data || []);
    } catch (err) {
      console.error('Error fetching reminders:', err);
      setError(err.message || 'Failed to load reminders');
      toast.error('Failed to load reminders');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  // ============================================================
  // Add Reminder
  // ============================================================

  const handleAddReminder = async () => {
    if (!form.subject) {
      toast.error('Please select a subject');
      return;
    }

    if (!form.reminder_time) {
      toast.error('Please select a time');
      return;
    }
    
    setSaving(true);
    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .from('study_reminders')
        .insert([
          {
            student_email: user.email,
            subject: form.subject,
            day_of_week: form.day_of_week,
            reminder_time: form.reminder_time,
            is_active: true
          }
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      if (data) {
        setReminders(prev => [...prev, data]);
        toast.success(`Reminder set for ${form.subject} on ${form.day_of_week}s at ${form.reminder_time}!`);
        
        // Log activity for POPIA compliance
        await supabase
          .from('activity_log')
          .insert({
            event_type: 'reminder_created',
            user_email: user.email,
            user_id: user.id || null,
            description: `Created study reminder for ${form.subject}`,
            metadata: {
              subject: form.subject,
              day: form.day_of_week,
              time: form.reminder_time
            }
          })
          .catch(() => {});
      }
      
      setShowForm(false);
      setForm({ subject: 'Mathematics', day_of_week: 'Monday', reminder_time: '16:00' });
      
    } catch (err) {
      console.error('Error adding reminder:', err);
      setError(err.message || 'Failed to add reminder');
      toast.error('Failed to add reminder');
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // Remove Reminder
  // ============================================================

  const handleRemoveReminder = async (id) => {
    const reminderToRemove = reminders.find(r => r.id === id);
    
    try {
      setError(null);
      const { error: deleteError } = await supabase
        .from('study_reminders')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      
      setReminders(prev => prev.filter(x => x.id !== id));
      toast.success('Reminder removed');
      
      // Log activity for POPIA compliance
      if (reminderToRemove) {
        await supabase
          .from('activity_log')
          .insert({
            event_type: 'reminder_deleted',
            user_email: user.email,
            user_id: user.id || null,
            description: `Deleted study reminder for ${reminderToRemove.subject}`,
            metadata: {
              subject: reminderToRemove.subject,
              day: reminderToRemove.day_of_week,
              time: reminderToRemove.reminder_time
            }
          })
          .catch(() => {});
      }
      
    } catch (err) {
      console.error('Error removing reminder:', err);
      setError(err.message || 'Failed to remove reminder');
      toast.error('Failed to remove reminder');
    }
  };

  // ============================================================
  // Toggle Reminder Status
  // ============================================================

  const handleToggleActiveStatus = async (reminder) => {
    const nextState = !reminder.is_active;
    
    try {
      const { error: updateError } = await supabase
        .from('study_reminders')
        .update({ 
          is_active: nextState,
          updated_at: new Date().toISOString()
        })
        .eq('id', reminder.id);

      if (updateError) throw updateError;

      setReminders(prev => prev.map(x => x.id === reminder.id ? { ...x, is_active: nextState } : x));
      toast.success(nextState ? 'Reminder enabled' : 'Reminder disabled');
      
      // Log activity
      await supabase
        .from('activity_log')
        .insert({
          event_type: 'reminder_toggled',
          user_email: user.email,
          user_id: user.id || null,
          description: `${nextState ? 'Enabled' : 'Disabled'} study reminder for ${reminder.subject}`,
          metadata: {
            subject: reminder.subject,
            new_state: nextState
          }
        })
        .catch(() => {});
        
    } catch (err) {
      console.error('Error toggling reminder:', err);
      setError(err.message || 'Failed to update reminder status');
      toast.error('Failed to update reminder');
    }
  };

  // ============================================================
  // Loading State
  // ============================================================

  if (loading) {
    return (
      <Card className="border-border shadow-md max-w-xl mx-auto bg-card">
        <CardContent className="flex flex-col items-center justify-center py-12 gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Loading reminders...</span>
        </CardContent>
      </Card>
    );
  }

  // ============================================================
  // Render
  // ============================================================

  return (
    <Card className="border-border shadow-md max-w-xl mx-auto bg-card">
      <CardHeader className="pb-3 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary shrink-0" /> Study Reminders
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[9px] text-muted-foreground flex items-center gap-1">
              <Shield className="w-3 h-3 text-green-500" /> Private
            </Badge>
            <Button 
              type="button"
              size="sm" 
              variant="outline" 
              className="gap-1 text-xs font-bold h-8 px-2.5" 
              onClick={() => {
                setShowForm(!showForm);
                setError(null);
              }}
            >
              <Plus className="w-3.5 h-3.5" /> {showForm ? 'Cancel' : 'Add'}
            </Button>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Get email reminders for your study sessions
        </p>
      </CardHeader>
      
      <CardContent className="pt-4 space-y-3">
        {/* Error Display */}
        {error && (
          <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-[11px] font-medium flex items-center gap-2 dark:bg-red-950/20 dark:border-red-800 dark:text-red-300">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Add Form */}
        {showForm && (
          <div className="bg-muted/30 border border-border rounded-xl p-3.5 space-y-3">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block mb-1">Subject *</label>
              <Select value={form.subject} onValueChange={v => setForm(f => ({ ...f, subject: v }))}>
                <SelectTrigger className="text-xs h-8">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECT_OPTIONS.map(s => (
                    <SelectItem key={s.name} value={s.name} className="text-xs font-medium">
                      {s.icon} {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block mb-1">Day *</label>
                <Select value={form.day_of_week} onValueChange={v => setForm(f => ({ ...f, day_of_week: v }))}>
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map(d => (
                      <SelectItem key={d} value={d} className="text-xs font-medium">{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block mb-1">Time *</label>
                <Input 
                  type="time" 
                  value={form.reminder_time} 
                  onChange={e => setForm(f => ({ ...f, reminder_time: e.target.value }))} 
                  className="text-xs h-8"
                />
              </div>
            </div>
            
            <Button 
              size="sm" 
              type="button" 
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold text-xs h-8" 
              onClick={handleAddReminder}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              {saving ? 'Saving...' : 'Save Reminder'}
            </Button>
          </div>
        )}

        {/* Reminders List */}
        {reminders.length === 0 && !loading ? (
          <p className="text-xs font-medium text-muted-foreground text-center py-6 border border-dashed border-border rounded-xl bg-muted/20">
            No reminders set. Add one to stay on track! 🎯
          </p>
        ) : (
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-0.5">
            {reminders.map(r => {
              const matchedIcon = SUBJECT_OPTIONS.find(s => s.name === r.subject)?.icon || '📚';
              const cleanTimeLabel = r.reminder_time ? r.reminder_time.slice(0, 5) : '--:--';
              
              return (
                <div key={r.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-border bg-card hover:bg-muted/30 transition-all shadow-sm">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-lg select-none shrink-0">{matchedIcon}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{r.subject}</p>
                      <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">
                        {r.day_of_week}s at {cleanTimeLabel}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge
                      onClick={() => handleToggleActiveStatus(r)}
                      className={`text-[10px] font-bold cursor-pointer px-2 py-0.5 ${
                        r.is_active 
                          ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-950/30 dark:text-green-300' 
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {r.is_active ? 'Active' : 'Off'}
                    </Badge>
                    
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-red-50 dark:hover:bg-red-950/20"
                      onClick={() => handleRemoveReminder(r.id)}
                      title="Delete reminder"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Reminder Count */}
        {reminders.length > 0 && (
          <p className="text-[10px] text-muted-foreground text-center pt-1 border-t border-border/50">
            {reminders.filter(r => r.is_active).length} active · {reminders.filter(r => !r.is_active).length} inactive
          </p>
        )}
      </CardContent>
    </Card>
  );
}
