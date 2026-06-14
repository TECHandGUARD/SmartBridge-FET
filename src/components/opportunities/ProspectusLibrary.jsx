import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { BookOpen, ExternalLink, Plus, Trash2, Upload, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function ProspectusLibrary({ isAdmin }) {
  const [prospectuses, setProspectuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ university_name: '', year: new Date().getFullYear() + 1, application_link: '', description: '' });
  const [file, setFile] = useState(null);

  const currentYear = new Date().getFullYear();
  const prospectusYear = currentYear + 1;

  const loadProspectuses = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('university_prospectuses')
        .select('*')
        .eq('is_approved', true)
        .order('year', { ascending: false });
      
      if (error) throw error;
      setProspectuses(data || []);
    } catch (err) {
      console.error('Error loading prospectuses:', err);
      toast.error('Failed to load prospectuses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    loadProspectuses(); 
  }, [loadProspectuses]);

  const handleAdd = async () => {
    if (!file) {
      toast.error('Please select a PDF file');
      return;
    }
    
    if (!form.university_name) {
      toast.error('University name is required');
      return;
    }
    
    // Validate file type
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed');
      return;
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 10MB');
      return;
    }
    
    setUploading(true);
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `university_prospectuses/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('university_prospectuses')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('university_prospectuses')
        .getPublicUrl(fileName);
      
      // Save to database
      const { error: insertError } = await supabase
        .from('university_prospectuses')
        .insert({
          university_name: form.university_name,
          year: Number(form.year),
          description: form.description || null,
          application_link: form.application_link || null,
          file_url: publicUrl,
          is_approved: true,
          status: 'approved'
        });
      
      if (insertError) throw insertError;
      
      toast.success('Prospectus added successfully');
      setShowAdd(false);
      setForm({ university_name: '', year: prospectusYear, application_link: '', description: '' });
      setFile(null);
      loadProspectuses();
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(`Failed to upload: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase
        .from('university_prospectuses')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('Prospectus deleted');
      loadProspectuses();
    } catch (err) {
      console.error('Delete error:', err);
      toast.error(`Failed to delete: ${err.message}`);
    }
  };

  const years = [...new Set(prospectuses.map(p => p.year))].sort((a, b) => b - a);
  const filtered = yearFilter === "All" ? prospectuses : prospectuses.filter(p => p.year === Number(yearFilter));

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
          <BookOpen className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">University Prospectuses</h3>
          <Badge className="bg-primary text-white text-xs">{prospectusYear}</Badge>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setYearFilter("All")}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${yearFilter === "All" ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground'}`}>
            All Years
          </button>
          {years.map(y => (
            <button key={y} onClick={() => setYearFilter(String(y))}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${yearFilter === String(y) ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground'}`}>
              {y}
            </button>
          ))}
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={() => setShowAdd(true)} className="gap-1 text-xs h-7">
              <Plus className="w-3 h-3" /> Add
            </Button>
          )}
        </div>
      </div>

      {prospectuses.length === 0 && (
        <div className="border-2 border-dashed border-border rounded-xl p-10 text-center text-muted-foreground">
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No prospectuses uploaded yet</p>
          <p className="text-sm mt-1">
            {isAdmin ? 'Click "Add" to upload university prospectuses for students.' : 'Prospectuses will appear here once uploaded by an admin.'}
          </p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((p) => (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <Badge variant="outline" className="text-xs">{p.year}</Badge>
                </div>
                <p className="font-semibold text-sm mb-1">{p.university_name}</p>
                {p.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{p.description}</p>}
                <div className="flex gap-2 flex-wrap">
                  <a href={p.file_url} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" className="h-7 text-xs gap-1">
                      <BookOpen className="w-3 h-3" /> View
                    </Button>
                  </a>
                  {p.application_link && (
                    <a href={p.application_link} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                        Apply <ExternalLink className="w-3 h-3" />
                      </Button>
                    </a>
                  )}
                  {isAdmin && (
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(p.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add University Prospectus</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input 
              placeholder="University name" 
              value={form.university_name} 
              onChange={e => setForm({...form, university_name: e.target.value})} 
            />
            <Input 
              type="number" 
              placeholder="Year (e.g. 2027)" 
              value={form.year} 
              onChange={e => setForm({...form, year: e.target.value})} 
            />
            <Input 
              placeholder="Application link (optional)" 
              value={form.application_link} 
              onChange={e => setForm({...form, application_link: e.target.value})} 
            />
            <Input 
              placeholder="Description (optional)" 
              value={form.description} 
              onChange={e => setForm({...form, description: e.target.value})} 
            />
            <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
              <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-2">Upload prospectus PDF (Max 10MB)</p>
              <input 
                type="file" 
                accept=".pdf" 
                onChange={e => setFile(e.target.files[0])} 
                className="text-sm" 
              />
            </div>
            <Button onClick={handleAdd} disabled={!file || !form.university_name || uploading} className="w-full">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {uploading ? 'Uploading...' : 'Add Prospectus'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}