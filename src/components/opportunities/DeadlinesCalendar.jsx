import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Calendar, Clock, ExternalLink, Plus, Trash2, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format, parseISO, isAfter, isBefore, addDays } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const categoryColors = {
  "University Application": "bg-primary/10 text-primary border-primary/20",
  "NBT": "bg-blue-100 text-blue-700 border-blue-200",
  "Bursary": "bg-gold-light text-yellow-800 border-yellow-200",
  "Other": "bg-muted text-muted-foreground border-border",
};

const STATIC_DEADLINES = [
  { id: 's1', event_name: "UCT Applications Open", university: "UCT", date: "2026-04-01", category: "University Application", link: "https://www.uct.ac.za/apply", description: "Applications open for 2027 intake" },
  { id: 's2', event_name: "Wits Applications Close", university: "Wits", date: "2026-09-30", category: "University Application", link: "https://www.wits.ac.za/apply", description: "Closing date for most programmes" },
  { id: 's3', event_name: "UP Applications Close", university: "UP", date: "2026-06-30", category: "University Application", link: "https://www.up.ac.za/apply", description: "Many programmes have earlier closing dates" },
  { id: 's4', event_name: "NBT Registration Opens", university: "NBT", date: "2026-03-01", category: "NBT", link: "https://www.nbt.ac.za", description: "Registration for March/April NBT sittings opens" },
  { id: 's5', event_name: "NBT June Sitting", university: "NBT", date: "2026-06-15", category: "NBT", link: "https://www.nbt.ac.za", description: "NBT test sitting at various venues" },
  { id: 's6', event_name: "NSFAS Applications Open", university: "NSFAS", date: "2026-09-01", category: "Bursary", link: "https://www.nsfas.org.za", description: "2027 NSFAS bursary applications open" },
  { id: 's7', event_name: "SU Applications Close", university: "Stellenbosch", date: "2026-07-31", category: "University Application", link: "https://www.sun.ac.za/apply", description: "Closing date for most SU programmes" },
  { id: 's8', event_name: "NBT September Sitting", university: "NBT", date: "2026-09-12", category: "NBT", link: "https://www.nbt.ac.za", description: "NBT test sitting at various venues" },
];

export default function DeadlinesCalendar({ isAdmin }) {
  const [deadlines, setDeadlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ 
    event_name: '', 
    university: '', 
    date: '', 
    category: 'University Application', 
    description: '', 
    link: '' 
  });

  const loadDeadlines = useCallback(async () => {
    setLoading(true);
    try {
      // Load approved deadlines from Supabase
      const { data: dbDeadlines, error } = await supabase
        .from('application_deadlines')
        .select('*')
        .eq('is_approved', true)
        .order('date', { ascending: true });
      
      if (error) throw error;
      
      // Combine static and database deadlines
      const all = [...STATIC_DEADLINES, ...(dbDeadlines || [])];
      all.sort((a, b) => new Date(a.date) - new Date(b.date));
      setDeadlines(all);
    } catch (err) {
      console.error('Error loading deadlines:', err);
      toast.error('Failed to load deadlines');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDeadlines();
  }, [loadDeadlines]);

  const handleAdd = async () => {
    if (!form.event_name || !form.date || !form.category) {
      toast.error('Event name, date, and category are required');
      return;
    }
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('application_deadlines')
        .insert({
          event_name: form.event_name,
          university: form.university || null,
          date: form.date,
          category: form.category,
          description: form.description || null,
          link: form.link || null,
          is_approved: true,
          status: 'approved'
        });
      
      if (error) throw error;
      
      toast.success('Deadline added successfully');
      setShowAdd(false);
      setForm({ event_name: '', university: '', date: '', category: 'University Application', description: '', link: '' });
      loadDeadlines();
    } catch (err) {
      console.error('Error adding deadline:', err);
      toast.error(`Failed to add: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    // Don't delete static deadlines
    if (typeof id === 'string' && id.startsWith('s')) {
      toast.error('Cannot delete static deadlines');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('application_deadlines')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('Deadline deleted');
      loadDeadlines();
    } catch (err) {
      console.error('Error deleting deadline:', err);
      toast.error(`Failed to delete: ${err.message}`);
    }
  };

  const today = new Date();
  const upcoming = deadlines.filter(d => isAfter(parseISO(d.date), addDays(today, -1)));
  const filtered = filter === "All" ? upcoming : upcoming.filter(d => d.category === filter);
  const urgent = filtered.filter(d => isBefore(parseISO(d.date), addDays(today, 30)));

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Application Deadlines</h3>
        </div>
        <div className="flex gap-2 flex-wrap">
          {["All","University Application","NBT","Bursary","Other"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${filter === f ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:border-primary'}`}
            >
              {f}
            </button>
          ))}
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={() => setShowAdd(true)} className="gap-1 text-xs h-7">
              <Plus className="w-3 h-3" /> Add
            </Button>
          )}
        </div>
      </div>

      {urgent.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
          <strong>⚠️ Urgent:</strong> {urgent.length} deadline{urgent.length > 1 ? 's' : ''} within the next 30 days!
        </div>
      )}

      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
        {filtered.length === 0 && (
          <p className="text-muted-foreground text-sm text-center py-8">No upcoming deadlines in this category.</p>
        )}
        {filtered.map((d) => {
          const daysLeft = Math.ceil((new Date(d.date) - today) / (1000 * 60 * 60 * 24));
          const isUrgent = daysLeft <= 30;
          const isStatic = typeof d.id === 'string' && d.id.startsWith('s');
          
          return (
            <Card key={d.id} className={`border ${isUrgent ? 'border-red-200 bg-red-50/30' : ''}`}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="text-center min-w-[50px]">
                  <p className="text-xs text-muted-foreground">{format(parseISO(d.date), 'MMM')}</p>
                  <p className="text-xl font-bold text-primary leading-none">{format(parseISO(d.date), 'd')}</p>
                  <p className="text-xs text-muted-foreground">{format(parseISO(d.date), 'yyyy')}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="font-medium text-sm">{d.event_name}</p>
                    {d.university && <span className="text-xs text-muted-foreground">• {d.university}</span>}
                  </div>
                  {d.description && <p className="text-xs text-muted-foreground truncate">{d.description}</p>}
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={`text-xs ${categoryColors[d.category]}`}>{d.category}</Badge>
                    <span className={`text-xs font-medium ${isUrgent ? 'text-red-600' : 'text-muted-foreground'}`}>
                      <Clock className="w-3 h-3 inline mr-0.5" />{daysLeft}d left
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  {d.link && (
                    <a href={d.link} target="_blank" rel="noopener noreferrer">
                      <Button size="icon" variant="ghost" className="h-7 w-7"><ExternalLink className="w-3 h-3" /></Button>
                    </a>
                  )}
                  {isAdmin && !isStatic && (
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(d.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Deadline</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input 
              placeholder="Event name" 
              value={form.event_name} 
              onChange={(e) => setForm({...form, event_name: e.target.value})} 
            />
            <Input 
              placeholder="University / Organisation" 
              value={form.university} 
              onChange={(e) => setForm({...form, university: e.target.value})} 
            />
            <Input 
              type="date" 
              value={form.date} 
              onChange={(e) => setForm({...form, date: e.target.value})} 
            />
            <Select value={form.category} onValueChange={(v) => setForm({...form, category: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["University Application","NBT","Bursary","Other"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input 
              placeholder="Description (optional)" 
              value={form.description} 
              onChange={(e) => setForm({...form, description: e.target.value})} 
            />
            <Input 
              placeholder="Link (optional)" 
              value={form.link} 
              onChange={(e) => setForm({...form, link: e.target.value})} 
            />
            <Button onClick={handleAdd} disabled={saving} className="w-full">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {saving ? 'Adding...' : 'Add Deadline'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}