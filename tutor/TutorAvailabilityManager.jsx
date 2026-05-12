import { useState, useEffect } from 'react';
import { supabase } from '@/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Plus, Trash2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function TutorAvailabilityManager({ user }) {
  const [slots, setSlots] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ day_of_week: 'Monday', start_time: '09:00', end_time: '17:00', notes: '' });

  useEffect(() => {
    if (!user?.email) return;
    fetchSlots();
  }, [user]);

  const fetchSlots = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tutor_availability')
        .select('*')
        .eq('tutor_email', user.email);
      
      if (error) throw error;
      setSlots(data || []);
    } catch (error) {
      console.error('Error fetching availability:', error);
      toast.error('Failed to load availability');
    } finally {
      setLoading(false);
    }
  };

  const addSlot = async () => {
    if (!form.start_time || !form.end_time) { toast.error('Enter start and end times.'); return; }
    try {
      const { data, error } = await supabase
        .from('tutor_availability')
        .insert({
          tutor_email: user.email,
          day_of_week: form.day_of_week,
          start_time: form.start_time,
          end_time: form.end_time,
          is_available: true,
          notes: form.notes,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setSlots(prev => [...prev, data]);
      setShowAdd(false);
      setForm({ day_of_week: 'Monday', start_time: '09:00', end_time: '17:00', notes: '' });
      toast.success('Availability slot added!');
    } catch (error) {
      console.error('Error adding slot:', error);
      toast.error('Failed to add slot');
    }
  };

  const toggleSlot = async (slot) => {
    try {
      const newStatus = !slot.is_available;
      const { error } = await supabase
        .from('tutor_availability')
        .update({ is_available: newStatus })
        .eq('id', slot.id);
      
      if (error) throw error;
      
      setSlots(prev => prev.map(s => s.id === slot.id ? { ...s, is_available: newStatus } : s));
    } catch (error) {
      console.error('Error toggling slot:', error);
      toast.error('Failed to update slot');
    }
  };

  const deleteSlot = async (id) => {
    try {
      const { error } = await supabase
        .from('tutor_availability')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setSlots(prev => prev.filter(s => s.id !== id));
      toast.success('Slot removed.');
    } catch (error) {
      console.error('Error deleting slot:', error);
      toast.error('Failed to delete slot');
    }
  };

  const byDay = DAYS.reduce((acc, d) => {
    acc[d] = slots.filter(s => s.day_of_week === d);
    return acc;
  }, {});

  if (loading) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-playfair flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" /> My Availability
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-playfair flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" /> My Availability
          </CardTitle>
          <Button size="sm" className="bg-primary gap-1.5 h-7 text-xs" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="w-3.5 h-3.5" /> Add Slot
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {showAdd && (
          <div className="bg-muted/50 rounded-xl p-3 space-y-3 border border-border">
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Day</Label>
                <Select value={form.day_of_week} onValueChange={v => setForm({ ...form, day_of_week: v })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">From</Label>
                <Input type="time" className="h-8 text-sm" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">To</Label>
                <Input type="time" className="h-8 text-sm" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Notes (optional)</Label>
                <Input className="h-8 text-sm" placeholder="e.g. Online only" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="bg-primary h-7 text-xs" onClick={addSlot}>Save</Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {DAYS.map(day => {
            const daySlots = byDay[day];
            if (daySlots.length === 0) return null;
            return (
              <div key={day}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{day}</p>
                {daySlots.map(slot => (
                  <div key={slot.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 mb-1">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${slot.is_available ? 'bg-green-500' : 'bg-red-400'}`} />
                    <span className="text-sm flex-1">{slot.start_time} – {slot.end_time}</span>
                    {slot.notes && <span className="text-xs text-muted-foreground truncate max-w-24">{slot.notes}</span>}
                    <Badge
                      className={`text-xs cursor-pointer ${slot.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                      onClick={() => toggleSlot(slot)}
                    >
                      {slot.is_available ? 'Available' : 'Unavailable'}
                    </Badge>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => deleteSlot(slot.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            );
          })}
          {slots.length === 0 && !showAdd && (
            <p className="text-sm text-muted-foreground text-center py-4">No availability set yet. Add slots so students can book you.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}