import { useState, useEffect } from 'react';
import { supabase } from '@/supabaseClient';
import { SUBJECTS } from '@/lib/subjects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Bell, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

export default function StudyReminderManager({ user }) {
  const [reminders, setReminders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ subject: '', day_of_week: 'Monday', time: '16:00' });

  // Fetch reminders from Supabase
  useEffect(() => {
    if (!user?.email) return;
    
    const fetchReminders = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('study_reminders')
          .select('*')
          .eq('user_email', user.email)
          .order('created_at', { ascending: true });
        
        if (error) throw error;
        setReminders(data || []);
      } catch (error) {
        console.error('Error fetching reminders:', error);
        toast.error('Failed to load reminders');
      } finally {
        setLoading(false);
      }
    };
    
    fetchReminders();
  }, [user]);

  const add = async () => {
    if (!form.subject) {
      toast.error('Please select a subject');
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('study_reminders')
        .insert({
          user_email: user.email,
          subject: form.subject,
          day_of_week: form.day_of_week,
          reminder_time: form.time,
          is_active: true,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setReminders(r => [...r, data]);
      setShowForm(false);
      setForm({ subject: '', day_of_week: 'Monday', time: '16:00' });
      toast.success('Reminder added!');
    } catch (error) {
      console.error('Error adding reminder:', error);
      toast.error('Failed to add reminder');
    }
  };

  const remove = async (id) => {
    try {
      const { error } = await supabase
        .from('study_reminders')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      setReminders(r => r.filter(x => x.id !== id));
      toast.success('Reminder removed');
    } catch (error) {
      console.error('Error removing reminder:', error);
      toast.error('Failed to remove reminder');
    }
  };

  const toggle = async (reminder) => {
    try {
      const newStatus = !reminder.is_active;
      const { error } = await supabase
        .from('study_reminders')
        .update({ is_active: newStatus })
        .eq('id', reminder.id);
      
      if (error) throw error;
      setReminders(r => r.map(x => x.id === reminder.id ? { ...x, is_active: newStatus } : x));
      toast.success(newStatus ? 'Reminder activated' : 'Reminder deactivated');
    } catch (error) {
      console.error('Error toggling reminder:', error);
      toast.error('Failed to update reminder');
    }
  };

  if (loading) {
    return (
      <Card className="border-border">
        <CardContent className="pt-6 pb-6 flex justify-center">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-playfair flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" /> Study Reminders
          </CardTitle>
          <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowForm(!showForm)}>
            <Plus className="w-3.5 h-3.5" /> Add
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showForm && (
          <div className="bg-muted/50 rounded-xl p-4 mb-4 space-y-3">
            <Select value={form.subject} onValueChange={v => setForm(f => ({ ...f, subject: v }))}>
              <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
              <SelectContent>
                {SUBJECTS.map(s => <SelectItem key={s.code} value={s.name}>{s.icon} {s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Select value={form.day_of_week} onValueChange={v => setForm(f => ({ ...f, day_of_week: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
            </div>
            <Button size="sm" className="w-full bg-primary" onClick={add}>Save Reminder</Button>
          </div>
        )}

        {reminders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No reminders set. Add one to stay on track!</p>
        ) : (
          <div className="space-y-2">
            {reminders.map(r => {
              const sub = SUBJECTS.find(s => s.name === r.subject);
              return (
                <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/50">
                  <span className="text-base">{sub?.icon || '📚'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.subject}</p>
                    <p className="text-xs text-muted-foreground">{r.day_of_week} at {r.reminder_time || r.time}</p>
                  </div>
                  <Badge
                    onClick={() => toggle(r)}
                    className={`text-xs cursor-pointer ${r.is_active ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}
                  >
                    {r.is_active ? 'On' : 'Off'}
                  </Badge>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(r.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}