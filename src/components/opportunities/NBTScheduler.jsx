import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Calendar, MapPin, Clock, CheckCircle2, Upload, FileText,
  ChevronDown, ChevronUp, Plus, AlertCircle, Trophy, Loader2
} from 'lucide-react';
import { toast } from 'sonner';

const TESTS = ['AQL', 'MAT', 'QL'];
const BAND_COLORS = {
  Proficient: 'bg-green-100 text-green-700',
  Intermediate: 'bg-yellow-100 text-yellow-700',
  Basic: 'bg-red-100 text-red-700',
};

function TestDateCard({ testDate, registration, onRegister, onRefresh, userEmail }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedTests, setSelectedTests] = useState(TESTS);
  const [registering, setRegistering] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [aqlScore, setAqlScore] = useState(registration?.aql_score ?? '');
  const [matScore, setMatScore] = useState(registration?.mat_score ?? '');
  const [qlScore, setQlScore] = useState(registration?.ql_score ?? '');
  const [band, setBand] = useState(registration?.overall_band ?? '');
  const [savingResults, setSavingResults] = useState(false);

  const daysUntil = Math.ceil((new Date(testDate.test_date) - new Date()) / 86400000);
  const regDeadlineDays = testDate.registration_deadline
    ? Math.ceil((new Date(testDate.registration_deadline) - new Date()) / 86400000)
    : null;
  const isPast = daysUntil < 0;
  const isRegistered = !!registration;

  const toggleTest = (t) => {
    setSelectedTests(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const handleRegister = async () => {
    if (!userEmail) {
      toast.error('Please sign in to register');
      return;
    }
    
    setRegistering(true);
    try {
      // Get current user profile
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      const { error } = await supabase
        .from('nbt_registrations')
        .insert({
          student_email: userEmail,
          student_name: userData.user?.user_metadata?.full_name || userEmail,
          nbt_test_date_id: testDate.id,
          test_date: testDate.test_date,
          venue: testDate.venue,
          city: testDate.city,
          tests_registered: selectedTests,
          status: 'registered',
        });
      
      if (error) throw error;
      
      toast.success('Registration successful!');
      onRefresh();
    } catch (err) {
      console.error('Registration error:', err);
      toast.error(`Failed to register: ${err.message}`);
    } finally {
      setRegistering(false);
    }
  };

  const handleResultsUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !registration) return;
    
    // Validate file
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload PDF, JPG, or PNG files only');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 5MB');
      return;
    }
    
    setUploading(true);
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `nbt_results/${Date.now()}_${registration.id}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('nbt_results')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('nbt_results')
        .getPublicUrl(fileName);
      
      const { error: updateError } = await supabase
        .from('nbt_registrations')
        .update({
          results_uploaded: true,
          results_file_url: publicUrl,
          status: 'completed',
        })
        .eq('id', registration.id);
      
      if (updateError) throw updateError;
      
      toast.success('Results uploaded successfully!');
      onRefresh();
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(`Failed to upload: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveResults = async () => {
    if (!registration) return;
    
    setSavingResults(true);
    try {
      const { error } = await supabase
        .from('nbt_registrations')
        .update({
          aql_score: aqlScore !== '' ? Number(aqlScore) : null,
          mat_score: matScore !== '' ? Number(matScore) : null,
          ql_score: qlScore !== '' ? Number(qlScore) : null,
          overall_band: band || null,
          status: 'completed',
        })
        .eq('id', registration.id);
      
      if (error) throw error;
      
      toast.success('Results saved!');
      onRefresh();
    } catch (err) {
      console.error('Save results error:', err);
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setSavingResults(false);
    }
  };

  return (
    <Card className={`border-border overflow-hidden ${isPast ? 'opacity-60' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className="font-semibold text-sm">{new Date(testDate.test_date).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</p>
              {isRegistered && <Badge className="text-[10px] bg-primary/10 text-primary px-1.5 py-0 flex items-center gap-0.5"><CheckCircle2 className="w-2.5 h-2.5" /> Registered</Badge>}
              {isPast && <Badge className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0">Past</Badge>}
              {!isPast && daysUntil <= 7 && <Badge className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0 flex items-center gap-0.5"><AlertCircle className="w-2.5 h-2.5" /> {daysUntil}d away</Badge>}
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {testDate.venue}, {testDate.city}</span>
              {testDate.test_time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {testDate.test_time}</span>}
            </div>

            <div className="flex flex-wrap gap-1 mt-2">
              {(testDate.tests_available || TESTS).map(t => (
                <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0">{t}</Badge>
              ))}
            </div>

            {regDeadlineDays !== null && !isPast && (
              <p className={`text-[11px] mt-1 ${regDeadlineDays <= 3 ? 'text-red-500 font-semibold' : 'text-muted-foreground'}`}>
                Registration deadline: {regDeadlineDays < 0 ? 'Closed' : `${regDeadlineDays}d left`}
              </p>
            )}

            {/* Registered scores */}
            {isRegistered && registration.results_uploaded && (
              <div className="mt-2 flex flex-wrap gap-2">
                {registration.aql_score != null && <Badge className="text-[10px] bg-blue-50 text-blue-700">AQL: {registration.aql_score}%</Badge>}
                {registration.mat_score != null && <Badge className="text-[10px] bg-purple-50 text-purple-700">MAT: {registration.mat_score}%</Badge>}
                {registration.ql_score != null && <Badge className="text-[10px] bg-green-50 text-green-700">QL: {registration.ql_score}%</Badge>}
                {registration.overall_band && <Badge className={`text-[10px] ${BAND_COLORS[registration.overall_band] || 'bg-muted text-muted-foreground'}`}><Trophy className="w-2.5 h-2.5 mr-0.5" />{registration.overall_band}</Badge>}
              </div>
            )}
          </div>

          <button onClick={() => setExpanded(e => !e)}>
            {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t space-y-3">
            {!isRegistered && !isPast && (
              <div>
                <p className="text-xs font-semibold mb-2">Select tests to register for:</p>
                <div className="flex gap-2 mb-3">
                  {TESTS.map(t => (
                    <button
                      key={t}
                      onClick={() => toggleTest(t)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${selectedTests.includes(t) ? 'bg-primary text-white border-primary' : 'bg-background border-border text-muted-foreground'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 h-8 text-xs" disabled={registering || selectedTests.length === 0} onClick={handleRegister}>
                    {registering ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                    {registering ? 'Registering...' : 'Register Now'}
                  </Button>
                  {testDate.registration_link && (
                    <a href={testDate.registration_link} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="h-8 text-xs">Official Site</Button>
                    </a>
                  )}
                </div>
              </div>
            )}

            {isRegistered && isPast && (
              <div className="space-y-2">
                <p className="text-xs font-semibold">Upload & Record Results</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground">AQL %</label>
                    <Input type="number" min="0" max="100" placeholder="—" value={aqlScore} onChange={e => setAqlScore(e.target.value)} className="h-7 text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">MAT %</label>
                    <Input type="number" min="0" max="100" placeholder="—" value={matScore} onChange={e => setMatScore(e.target.value)} className="h-7 text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">QL %</label>
                    <Input type="number" min="0" max="100" placeholder="—" value={qlScore} onChange={e => setQlScore(e.target.value)} className="h-7 text-xs" />
                  </div>
                </div>
                <select
                  value={band}
                  onChange={e => setBand(e.target.value)}
                  className="w-full h-8 rounded-md border border-input bg-background text-xs px-2 focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Select overall band...</option>
                  {['Proficient', 'Intermediate', 'Basic'].map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" disabled={savingResults} onClick={handleSaveResults}>
                    {savingResults ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                    {savingResults ? 'Saving...' : 'Save Scores'}
                  </Button>
                  <label className="flex-1">
                    <Button size="sm" variant="outline" className="w-full h-8 text-xs gap-1 cursor-pointer" disabled={uploading} asChild>
                      <span>
                        {uploading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Upload className="w-3 h-3" />}
                        {uploading ? 'Uploading...' : 'Upload PDF'}
                      </span>
                    </Button>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleResultsUpload} />
                  </label>
                </div>
                {registration.results_file_url && (
                  <a href={registration.results_file_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline flex items-center gap-1">
                    <FileText className="w-3 h-3" /> View uploaded results
                  </a>
                )}
              </div>
            )}

            {isRegistered && !isPast && (
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="flex items-center gap-1 text-primary font-medium"><CheckCircle2 className="w-3.5 h-3.5" /> You're registered for: {registration.tests_registered?.join(', ')}</p>
                <p>Results can be uploaded here after your test date.</p>
                {testDate.registration_link && (
                  <a href={testDate.registration_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">View official confirmation →</a>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function NBTScheduler({ userEmail, isAdmin }) {
  const [testDates, setTestDates] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDate, setNewDate] = useState({ test_date: '', test_time: '', venue: '', city: '', province: '', registration_deadline: '', registration_link: '', available_slots: '' });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('upcoming');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Load test dates
      const { data: dates, error: datesError } = await supabase
        .from('nbt_test_dates')
        .select('*')
        .eq('is_active', true)
        .order('test_date', { ascending: true });
      
      if (datesError) throw datesError;
      setTestDates(dates || []);
      
      // Load registrations if user is logged in
      if (userEmail) {
        const { data: regs, error: regsError } = await supabase
          .from('nbt_registrations')
          .select('*')
          .eq('student_email', userEmail);
        
        if (regsError) throw regsError;
        setRegistrations(regs || []);
      }
    } catch (err) {
      console.error('Error loading NBT data:', err);
      toast.error('Failed to load NBT schedule');
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  useEffect(() => { load(); }, [load]);

  const handleAddDate = async () => {
    if (!newDate.test_date || !newDate.venue || !newDate.city) {
      toast.error('Test date, venue, and city are required');
      return;
    }
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('nbt_test_dates')
        .insert({
          test_date: newDate.test_date,
          test_time: newDate.test_time || null,
          venue: newDate.venue,
          city: newDate.city,
          province: newDate.province || null,
          registration_deadline: newDate.registration_deadline || null,
          registration_link: newDate.registration_link || null,
          available_slots: newDate.available_slots ? Number(newDate.available_slots) : null,
          tests_available: ['AQL', 'MAT', 'QL'],
          is_active: true,
        });
      
      if (error) throw error;
      
      toast.success('Test date added successfully');
      setShowAddForm(false);
      setNewDate({ test_date: '', test_time: '', venue: '', city: '', province: '', registration_deadline: '', registration_link: '', available_slots: '' });
      load();
    } catch (err) {
      console.error('Error adding test date:', err);
      toast.error(`Failed to add: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const now = new Date();
  const displayed = testDates.filter(d => {
    const isPast = new Date(d.test_date) < now;
    if (filter === 'upcoming') return !isPast;
    if (filter === 'past') return isPast;
    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-playfair font-semibold text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" /> NBT Test Schedule
          </h3>
          <p className="text-xs text-muted-foreground">View upcoming test dates, register, and upload your results</p>
        </div>
        {isAdmin && (
          <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setShowAddForm(s => !s)}>
            <Plus className="w-3.5 h-3.5" /> Add Test Date
          </Button>
        )}
      </div>

      {/* Filter */}
      <div className="flex gap-1.5">
        {['upcoming', 'past', 'all'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all capitalize ${filter === f ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Admin Add Form */}
      {isAdmin && showAddForm && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm">Add New NBT Test Date</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pb-4">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground">Test Date *</label>
                <Input type="date" value={newDate.test_date} onChange={e => setNewDate(p => ({ ...p, test_date: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Test Time</label>
                <Input placeholder="08:00" value={newDate.test_time} onChange={e => setNewDate(p => ({ ...p, test_time: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Venue *</label>
                <Input placeholder="e.g. UCT Upper Campus" value={newDate.venue} onChange={e => setNewDate(p => ({ ...p, venue: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">City *</label>
                <Input placeholder="e.g. Cape Town" value={newDate.city} onChange={e => setNewDate(p => ({ ...p, city: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Registration Deadline</label>
                <Input type="date" value={newDate.registration_deadline} onChange={e => setNewDate(p => ({ ...p, registration_deadline: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Available Slots</label>
                <Input type="number" placeholder="e.g. 200" value={newDate.available_slots} onChange={e => setNewDate(p => ({ ...p, available_slots: e.target.value }))} className="h-8 text-xs" />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">Registration Link</label>
              <Input placeholder="https://nbt.ac.za/..." value={newDate.registration_link} onChange={e => setNewDate(p => ({ ...p, registration_link: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 h-8 text-xs" disabled={!newDate.test_date || !newDate.venue || !newDate.city || saving} onClick={handleAddDate}>
                {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                {saving ? 'Adding...' : 'Add Date'}
              </Button>
              <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {displayed.length === 0 ? (
        <div className="text-center py-10 border rounded-xl text-muted-foreground">
          <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">{filter === 'upcoming' ? 'No upcoming NBT test dates available.' : 'No test dates found.'}</p>
          {isAdmin && <p className="text-xs mt-1">Click "Add Test Date" to add one.</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(td => (
            <TestDateCard
              key={td.id}
              testDate={td}
              registration={registrations.find(r => r.nbt_test_date_id === td.id) || null}
              onRegister={null}
              onRefresh={load}
              userEmail={userEmail}
            />
          ))}
        </div>
      )}
    </div>
  );
}