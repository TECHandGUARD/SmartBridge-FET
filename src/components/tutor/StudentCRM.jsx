import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Plus, ArrowLeft, Search, FileText, BookOpen, Smile, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const MOOD_ICONS = {
  Engaged: '🔥', Struggling: '😓', Distracted: '😶', Confident: '💪', Neutral: '😊',
};

export default function StudentCRM({ user }) {
  const [bookings, setBookings] = useState([]);
  const [notes, setNotes] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [search, setSearch] = useState('');
  const [showAddNote, setShowAddNote] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [noteForm, setNoteForm] = useState({
    note: '', subject: '', session_date: '', strengths: '', areas_to_improve: '', next_steps: '', mood: 'Neutral',
  });

  const loadData = useCallback(async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      // Load tutor bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('tutor_bookings')
        .select('*')
        .eq('tutor_email', user.email)
        .order('date', { ascending: false });
      
      if (bookingsError) throw bookingsError;
      
      // Load student notes
      const { data: notesData, error: notesError } = await supabase
        .from('student_notes')
        .select('*')
        .eq('tutor_email', user.email)
        .order('created_at', { ascending: false });
      
      if (notesError) throw notesError;
      
      setBookings(bookingsData || []);
      setNotes(notesData || []);
    } catch (err) {
      console.error('Error loading CRM data:', err);
      toast.error('Failed to load student data');
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Build student list from completed/confirmed bookings
  const students = useMemo(() => {
    const map = {};
    bookings.forEach(b => {
      if (!map[b.student_email]) {
        map[b.student_email] = { 
          email: b.student_email, 
          sessions: 0, 
          subjects: new Set(), 
          lastSession: null, 
          totalSpent: 0 
        };
      }
      map[b.student_email].sessions++;
      map[b.student_email].subjects.add(b.subject);
      map[b.student_email].totalSpent += (b.amount || 0);
      if (!map[b.student_email].lastSession || b.date > map[b.student_email].lastSession) {
        map[b.student_email].lastSession = b.date;
      }
    });
    return Object.values(map)
      .map(s => ({ ...s, subjects: [...s.subjects] }))
      .sort((a, b) => (b.lastSession || '').localeCompare(a.lastSession || ''));
  }, [bookings]);

  const filteredStudents = students.filter(s =>
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  const studentNotes = selectedStudent
    ? notes.filter(n => n.student_email === selectedStudent.email).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    : [];

  const handleAddNote = async () => {
    if (!noteForm.note.trim()) { 
      toast.error('Please write a note.'); 
      return; 
    }
    
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('student_notes')
        .insert({
          tutor_email: user.email,
          student_email: selectedStudent.email,
          student_name: selectedStudent.email,
          note: noteForm.note,
          subject: noteForm.subject || null,
          session_date: noteForm.session_date || null,
          strengths: noteForm.strengths || null,
          areas_to_improve: noteForm.areas_to_improve || null,
          next_steps: noteForm.next_steps || null,
          mood: noteForm.mood || 'Neutral',
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setNotes(prev => [data, ...prev]);
      setNoteForm({ 
        note: '', subject: '', session_date: '', strengths: '', 
        areas_to_improve: '', next_steps: '', mood: 'Neutral' 
      });
      setShowAddNote(false);
      toast.success('Session note saved!');
    } catch (err) {
      console.error('Error adding note:', err);
      toast.error('Failed to save note: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-playfair flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> My Students
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-playfair flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" /> My Students
          <Badge className="bg-primary/10 text-primary text-xs ml-1">{students.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!selectedStudent ? (
          // Student list
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            {filteredStudents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">{students.length === 0 ? 'No students yet. Students will appear here after they book sessions.' : 'No results.'}</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredStudents.map(s => {
                  const noteCount = notes.filter(n => n.student_email === s.email).length;
                  return (
                    <button
                      key={s.email}
                      onClick={() => setSelectedStudent(s)}
                      className="w-full text-left p-3 rounded-xl hover:bg-muted/50 transition-colors flex items-center gap-3 border border-transparent hover:border-border"
                    >
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                        {s.email[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{s.email}</p>
                        <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground mt-0.5">
                          <span>{s.sessions} sessions</span>
                          <span>•</span>
                          <span>{s.subjects.join(', ')}</span>
                          {noteCount > 0 && <><span>•</span><span>{noteCount} notes</span></>}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-semibold text-primary">R{s.totalSpent.toLocaleString()}</p>
                        {s.lastSession && <p className="text-[10px] text-muted-foreground">{s.lastSession}</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          // Student detail view
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedStudent(null); setShowAddNote(false); }}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                {selectedStudent.email[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{selectedStudent.email}</p>
                <p className="text-[10px] text-muted-foreground">{selectedStudent.sessions} sessions · {selectedStudent.subjects.join(', ')}</p>
              </div>
              <Button size="sm" className="bg-primary gap-1 h-7 text-xs" onClick={() => setShowAddNote(!showAddNote)}>
                <Plus className="w-3 h-3" /> Add Note
              </Button>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <p className="text-lg font-bold">{selectedStudent.sessions}</p>
                <p className="text-[10px] text-muted-foreground">Sessions</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <p className="text-lg font-bold">R{selectedStudent.totalSpent.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">Revenue</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <p className="text-lg font-bold">{studentNotes.length}</p>
                <p className="text-[10px] text-muted-foreground">Notes</p>
              </div>
            </div>

            {/* Add Note Form */}
            {showAddNote && (
              <div className="bg-accent/30 rounded-xl p-4 space-y-3 border border-primary/20">
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-primary" /> New Session Note
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Subject</Label>
                    <Input className="h-8 text-sm" placeholder="e.g. Mathematics" value={noteForm.subject} onChange={e => setNoteForm({ ...noteForm, subject: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Session Date</Label>
                    <Input type="date" className="h-8 text-sm" value={noteForm.session_date} onChange={e => setNoteForm({ ...noteForm, session_date: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Student Mood</Label>
                    <Select value={noteForm.mood} onValueChange={v => setNoteForm({ ...noteForm, mood: v })}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(MOOD_ICONS).map(([mood, icon]) => (
                          <SelectItem key={mood} value={mood}>{icon} {mood}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Session Notes *</Label>
                  <Textarea className="text-sm min-h-[60px] resize-none" placeholder="What was covered in this session..." value={noteForm.note} onChange={e => setNoteForm({ ...noteForm, note: e.target.value })} />
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Strengths</Label>
                    <Input className="h-8 text-sm" placeholder="What they did well" value={noteForm.strengths} onChange={e => setNoteForm({ ...noteForm, strengths: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Needs Improvement</Label>
                    <Input className="h-8 text-sm" placeholder="Areas to work on" value={noteForm.areas_to_improve} onChange={e => setNoteForm({ ...noteForm, areas_to_improve: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Next Steps</Label>
                    <Input className="h-8 text-sm" placeholder="Homework or follow-up" value={noteForm.next_steps} onChange={e => setNoteForm({ ...noteForm, next_steps: e.target.value })} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-primary gap-1 h-7 text-xs" onClick={handleAddNote} disabled={saving}>
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    {saving ? 'Saving...' : 'Save Note'}
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowAddNote(false)}>Cancel</Button>
                </div>
              </div>
            )}

            {/* Notes Timeline */}
            <div>
              <p className="text-sm font-semibold mb-2">Session Notes</p>
              {studentNotes.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No notes yet. Add your first note after a session.</p>
              ) : (
                <div className="space-y-2">
                  {studentNotes.map(n => (
                    <div key={n.id} className="p-3 rounded-xl bg-muted/40 space-y-1.5 border-l-4 border-primary/30">
                      <div className="flex items-center gap-2 flex-wrap">
                        {n.subject && <Badge className="bg-primary/10 text-primary text-[10px]">{n.subject}</Badge>}
                        {n.mood && <span className="text-xs">{MOOD_ICONS[n.mood]} {n.mood}</span>}
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {n.session_date || new Date(n.created_at).toLocaleDateString('en-ZA')}
                        </span>
                      </div>
                      <p className="text-sm">{n.note}</p>
                      {(n.strengths || n.areas_to_improve || n.next_steps) && (
                        <div className="grid grid-cols-3 gap-2 text-[10px] pt-1">
                          {n.strengths && <div><span className="text-green-600 font-semibold">✅ Strengths:</span> {n.strengths}</div>}
                          {n.areas_to_improve && <div><span className="text-amber-600 font-semibold">⚠️ Improve:</span> {n.areas_to_improve}</div>}
                          {n.next_steps && <div><span className="text-blue-600 font-semibold">📋 Next:</span> {n.next_steps}</div>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}