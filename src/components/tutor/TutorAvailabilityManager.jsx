const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
import { Shield, AlertCircle, Copy, Zap, Sparkles, RefreshCw, X, Edit2, Save } from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
const appName = import.meta.env.VITE_APP_NAME || 'SmartBridge FET';
const TIME_SLOTS = ['06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'];
export default function TutorAvailabilityManager({
  user
}) {
  const [slots, setSlots] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [form, setForm] = useState({
    day_of_week: 'Monday',
    start_time: '09:00',
    end_time: '17:00',
    notes: '',
    is_available: true
  });
  const [bulkDay, setBulkDay] = useState('Monday');
  const [bulkStart, setBulkStart] = useState('09:00');
  const [bulkEnd, setBulkEnd] = useState('17:00');
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const loadSlots = useCallback(async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const {
        data,
        error: queryError
      } = await supabase.from('tutor_availability').select('*').eq('tutor_email', user.email).order('day_of_week', {
        ascending: true
      });
      if (queryError) throw queryError;
      setSlots(data || []);
    } catch (err) {
      console.error('Error loading availability:', err);
      setError('Failed to load availability slots');
      toast.error('Failed to load availability slots');
    } finally {
      setLoading(false);
    }
  }, [user?.email]);
  useEffect(() => {
    loadSlots();
    if (!user?.email) return;
    const channel = supabase.channel('tutor_availability').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'tutor_availability',
      filter: `tutor_email=eq.${user.email}`
    }, payload => {
      if (payload.eventType === 'INSERT') {
        setSlots(prev => [...prev, payload.new]);
      } else if (payload.eventType === 'UPDATE') {
        setSlots(prev => prev.map(s => s.id === payload.new.id ? payload.new : s));
      } else if (payload.eventType === 'DELETE') {
        setSlots(prev => prev.filter(s => s.id !== payload.old.id));
      }
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.email, loadSlots]);
  const hasConflict = useCallback((day, start, end, excludeId = null) => {
    return slots.some(slot => slot.day_of_week === day && slot.id !== excludeId && slot.is_available && (start >= slot.start_time && start < slot.end_time || end > slot.start_time && end <= slot.end_time || start <= slot.start_time && end >= slot.end_time));
  }, [slots]);
  const addSlot = async () => {
    if (!form.start_time || !form.end_time) {
      toast.error('Enter start and end times.');
      return;
    }
    if (form.start_time >= form.end_time) {
      toast.error('Start time must be before end time.');
      return;
    }
    if (hasConflict(form.day_of_week, form.start_time, form.end_time)) {
      toast.error('This time slot conflicts with an existing availability slot.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const {
        data,
        error: insertError
      } = await supabase.from('tutor_availability').insert({
        tutor_email: user.email,
        tutor_id: user.id || null,
        day_of_week: form.day_of_week,
        start_time: form.start_time,
        end_time: form.end_time,
        notes: form.notes || null,
        is_available: true,
        created_at: new Date().toISOString()
      }).select().single();
      if (insertError) throw insertError;
      await Promise.resolve(supabase.from('activity_log').insert({
        event_type: 'availability_added',
        user_email: user.email,
        user_id: user.id || null,
        description: `Added availability slot: ${form.day_of_week} ${form.start_time}-${form.end_time}`,
        metadata: {
          day: form.day_of_week,
          start: form.start_time,
          end: form.end_time
        }
      })).catch(() => {});
      setSlots(prev => [...prev, data]);
      setShowAdd(false);
      setForm({
        day_of_week: 'Monday',
        start_time: '09:00',
        end_time: '17:00',
        notes: '',
        is_available: true
      });
      toast.success('Availability slot added!');
    } catch (err) {
      console.error('Error adding slot:', err);
      setError(err.message || 'Failed to add slot');
      toast.error('Failed to add slot: ' + err.message);
    } finally {
      setSaving(false);
    }
  };
  const bulkAddSlots = async () => {
    if (!bulkStart || !bulkEnd) {
      toast.error('Enter start and end times.');
      return;
    }
    if (bulkStart >= bulkEnd) {
      toast.error('Start time must be before end time.');
      return;
    }
    const slotsToAdd = [];
    let current = bulkStart;
    while (current < bulkEnd) {
      const next = TIME_SLOTS[TIME_SLOTS.indexOf(current) + 1];
      if (!next) break;
      if (!hasConflict(bulkDay, current, next)) {
        slotsToAdd.push({
          tutor_email: user.email,
          tutor_id: user.id || null,
          day_of_week: bulkDay,
          start_time: current,
          end_time: next,
          is_available: true,
          created_at: new Date().toISOString()
        });
      }
      current = next;
    }
    if (slotsToAdd.length === 0) {
      toast.error('No available slots to add (all conflict with existing).');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const {
        data,
        error: insertError
      } = await supabase.from('tutor_availability').insert(slotsToAdd).select();
      if (insertError) throw insertError;
      setSlots(prev => [...prev, ...(data || [])]);
      setShowBulkAdd(false);
      toast.success(`${data?.length || 0} slots added for ${bulkDay}!`);
    } catch (err) {
      console.error('Error bulk adding slots:', err);
      setError(err.message || 'Failed to add slots');
      toast.error('Failed to add slots: ' + err.message);
    } finally {
      setSaving(false);
    }
  };
  const startEdit = slot => {
    setEditingSlot(slot.id);
    setForm({
      day_of_week: slot.day_of_week,
      start_time: slot.start_time,
      end_time: slot.end_time,
      notes: slot.notes || '',
      is_available: slot.is_available
    });
  };
  const saveEdit = async () => {
    if (!form.start_time || !form.end_time) {
      toast.error('Enter start and end times.');
      return;
    }
    if (form.start_time >= form.end_time) {
      toast.error('Start time must be before end time.');
      return;
    }
    if (hasConflict(form.day_of_week, form.start_time, form.end_time, editingSlot)) {
      toast.error('This time slot conflicts with an existing availability slot.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const {
        error: updateError
      } = await supabase.from('tutor_availability').update({
        day_of_week: form.day_of_week,
        start_time: form.start_time,
        end_time: form.end_time,
        notes: form.notes || null,
        is_available: form.is_available,
        updated_at: new Date().toISOString()
      }).eq('id', editingSlot);
      if (updateError) throw updateError;
      setSlots(prev => prev.map(s => s.id === editingSlot ? {
        ...s,
        ...form
      } : s));
      setEditingSlot(null);
      setForm({
        day_of_week: 'Monday',
        start_time: '09:00',
        end_time: '17:00',
        notes: '',
        is_available: true
      });
      toast.success('Slot updated!');
    } catch (err) {
      console.error('Error updating slot:', err);
      setError(err.message || 'Failed to update slot');
      toast.error('Failed to update slot: ' + err.message);
    } finally {
      setSaving(false);
    }
  };
  const toggleSlot = async slot => {
    try {
      const newStatus = !slot.is_available;
      const {
        error: updateError
      } = await supabase.from('tutor_availability').update({
        is_available: newStatus,
        updated_at: new Date().toISOString()
      }).eq('id', slot.id);
      if (updateError) throw updateError;
      setSlots(prev => prev.map(s => s.id === slot.id ? {
        ...s,
        is_available: newStatus
      } : s));
      toast.success(newStatus ? 'Slot marked available' : 'Slot marked unavailable');
    } catch (err) {
      console.error('Error toggling slot:', err);
      toast.error('Failed to update slot status');
    }
  };
  const deleteSlot = async id => {
    try {
      const {
        error: deleteError
      } = await supabase.from('tutor_availability').delete().eq('id', id);
      if (deleteError) throw deleteError;
      setSlots(prev => prev.filter(s => s.id !== id));
      toast.success('Slot removed.');
    } catch (err) {
      console.error('Error deleting slot:', err);
      toast.error('Failed to delete slot');
    }
  };
  const copySlotsToDay = async (sourceDay, targetDay) => {
    const sourceSlots = slots.filter(s => s.day_of_week === sourceDay && s.is_available);
    if (sourceSlots.length === 0) {
      toast.error(`No slots to copy from ${sourceDay}`);
      return;
    }
    if (!confirm(`Copy ${sourceSlots.length} slots from ${sourceDay} to ${targetDay}?`)) return;
    const slotsToCopy = sourceSlots.map(s => ({
      tutor_email: user.email,
      tutor_id: user.id || null,
      day_of_week: targetDay,
      start_time: s.start_time,
      end_time: s.end_time,
      is_available: true,
      notes: s.notes || null,
      created_at: new Date().toISOString()
    }));
    setSaving(true);
    try {
      const {
        data,
        error: insertError
      } = await supabase.from('tutor_availability').insert(slotsToCopy).select();
      if (insertError) throw insertError;
      setSlots(prev => [...prev, ...(data || [])]);
      toast.success(`${data?.length || 0} slots copied to ${targetDay}!`);
    } catch (err) {
      console.error('Error copying slots:', err);
      toast.error('Failed to copy slots');
    } finally {
      setSaving(false);
    }
  };
  const stats = useMemo(() => {
    const total = slots.length;
    const available = slots.filter(s => s.is_available).length;
    const byDay = {};
    DAYS.forEach(d => {
      byDay[d] = slots.filter(s => s.day_of_week === d && s.is_available).length;
    });
    return {
      total,
      available,
      byDay
    };
  }, [slots]);
  const byDay = DAYS.reduce((acc, d) => {
    acc[d] = slots.filter(s => s.day_of_week === d);
    return acc;
  }, {});
  if (loading) {
    return <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-playfair flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" /> My Availability
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </CardContent>
      </Card>;
  }
  return <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-playfair flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" /> My Availability
              <Badge className="bg-green-100 text-green-700 text-xs dark:bg-green-950/30 dark:text-green-300">
                {stats.available} slots available
              </Badge>
            </CardTitle>
            <Badge variant="outline" className="text-[9px] text-muted-foreground flex items-center gap-1">
              <Shield className="w-3 h-3 text-green-500" /> Secure
            </Badge>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={loadSlots} disabled={loading}>
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm" className="bg-primary gap-1.5 h-7 text-xs" onClick={() => setShowAdd(!showAdd)}>
              <Plus className="w-3.5 h-3.5" /> Add Slot
            </Button>
          </div>
        </div>

        {}
        <div className="grid grid-cols-7 gap-1 mt-2">
          {DAYS.map(d => <div key={d} className="text-center">
              <p className="text-[10px] text-muted-foreground">{d.slice(0, 3)}</p>
              <p className={`text-xs font-bold ${stats.byDay[d] > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                {stats.byDay[d]}
              </p>
            </div>)}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {}
        {error && <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-[11px] font-medium flex items-center gap-2 dark:bg-red-950/20 dark:border-red-800 dark:text-red-300">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
            <button onClick={loadSlots} className="ml-auto text-primary hover:underline font-medium">
              Retry
            </button>
          </div>}

        {}
        {showAdd && <div className="bg-muted/50 rounded-xl p-3 space-y-3 border border-border">
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Day</Label>
                <Select value={form.day_of_week} onValueChange={v => setForm({
              ...form,
              day_of_week: v
            })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">From</Label>
                <Input type="time" className="h-8 text-sm" value={form.start_time} onChange={e => setForm({
              ...form,
              start_time: e.target.value
            })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">To</Label>
                <Input type="time" className="h-8 text-sm" value={form.end_time} onChange={e => setForm({
              ...form,
              end_time: e.target.value
            })} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Notes (optional)</Label>
                <Input className="h-8 text-sm" placeholder="e.g. Online only" value={form.notes} onChange={e => setForm({
              ...form,
              notes: e.target.value
            })} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="bg-primary h-7 text-xs" onClick={addSlot} disabled={saving}>
                {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </div>}

        {}
        {showBulkAdd && <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-3 dark:bg-blue-950/20 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">⚡ Bulk Add 30-min Slots</p>
              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setShowBulkAdd(false)}>
                <X className="w-3 h-3" />
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Day</Label>
                <Select value={bulkDay} onValueChange={setBulkDay}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">From</Label>
                <Input type="time" className="h-7 text-xs" value={bulkStart} onChange={e => setBulkStart(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">To</Label>
                <Input type="time" className="h-7 text-xs" value={bulkEnd} onChange={e => setBulkEnd(e.target.value)} />
              </div>
            </div>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 h-7 text-xs" onClick={bulkAddSlots} disabled={saving}>
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
              {saving ? 'Adding...' : 'Bulk Add'}
            </Button>
          </div>}

        {}
        <div className="space-y-2">
          {DAYS.map(day => {
          const daySlots = byDay[day];
          if (daySlots.length === 0) return null;
          return <div key={day}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{day}</p>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-5 text-[9px] px-1.5" onClick={() => {
                  const targetDay = prompt('Copy slots to which day?', 'Tuesday');
                  if (targetDay && DAYS.includes(targetDay)) {
                    copySlotsToDay(day, targetDay);
                  }
                }}>
                      <Copy className="w-2.5 h-2.5" /> Copy
                    </Button>
                  </div>
                </div>
                {daySlots.map(slot => {
              const isEditing = editingSlot === slot.id;
              return <div key={slot.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 mb-1">
                      {isEditing ? <div className="flex-1 grid grid-cols-2 gap-2">
                          <Input type="time" className="h-7 text-xs" value={form.start_time} onChange={e => setForm({
                    ...form,
                    start_time: e.target.value
                  })} />
                          <Input type="time" className="h-7 text-xs" value={form.end_time} onChange={e => setForm({
                    ...form,
                    end_time: e.target.value
                  })} />
                          <Input className="h-7 text-xs col-span-2" placeholder="Notes" value={form.notes} onChange={e => setForm({
                    ...form,
                    notes: e.target.value
                  })} />
                          <div className="col-span-2 flex gap-1">
                            <Button size="sm" className="h-6 text-xs bg-green-600" onClick={saveEdit} disabled={saving}>
                              <Save className="w-3 h-3" /> Save
                            </Button>
                            <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => setEditingSlot(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div> : <>
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${slot.is_available ? 'bg-green-500' : 'bg-red-400'}`} />
                          <span className="text-sm flex-1">{slot.start_time} – {slot.end_time}</span>
                          {slot.notes && <span className="text-xs text-muted-foreground truncate max-w-24">{slot.notes}</span>}
                          <Badge className={`text-xs cursor-pointer ${slot.is_available ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-950/30 dark:text-green-300' : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-950/30 dark:text-red-300'}`} onClick={() => toggleSlot(slot)}>
                            {slot.is_available ? 'Available' : 'Unavailable'}
                          </Badge>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => startEdit(slot)}>
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => deleteSlot(slot.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </>}
                    </div>;
            })}
              </div>;
        })}

          {slots.length === 0 && !showAdd && !showBulkAdd && <div className="text-center py-8">
              <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-30" />
              <p className="text-sm text-muted-foreground">No availability set yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Add slots so students can book you!</p>
            </div>}
        </div>

        {}
        {!showAdd && !showBulkAdd && slots.length > 0 && <Button variant="outline" size="sm" className="w-full text-xs h-7 gap-1.5" onClick={() => setShowBulkAdd(true)}>
            <Zap className="w-3 h-3" /> Bulk Add 30-min Slots
          </Button>}

        {}
        {slots.length === 0 && <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-3 dark:from-purple-950/20 dark:to-blue-950/20 dark:border-purple-800">
            <p className="text-xs text-purple-700 dark:text-purple-300 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              💡 Suggested availability: Set 2-3 hours daily, Monday-Friday. Students book most during 16:00-19:00.
            </p>
          </div>}
      </CardContent>
    </Card>;
}
