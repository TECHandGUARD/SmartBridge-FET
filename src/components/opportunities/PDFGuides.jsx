import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Download, FileText, Plus, Trash2, Upload, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
const categoryColors = {
  "NBT Prep": "bg-blue-100 text-blue-700",
  "University Requirements": "bg-primary/10 text-primary",
  "Bursaries": "bg-gold-light text-yellow-800",
  "Career Guidance": "bg-purple-100 text-purple-700",
  "General": "bg-muted text-muted-foreground"
};
const STATIC_GUIDES = [{
  id: 'g1',
  title: "NBT Study Tips & Strategies",
  description: "Comprehensive tips for the AL, QL, and MAT tests including time management strategies.",
  category: "NBT Prep",
  file_url: "https://www.nbt.ac.za/sites/default/files/NBT-Orientation-2017.pdf",
  source: "Static Reference"
}, {
  id: 'g2',
  title: "How to Write a Winning Motivational Letter",
  description: "Step-by-step guide to crafting a compelling motivational letter for university applications.",
  category: "University Requirements",
  file_url: "https://drive.google.com/file/d/example",
  source: "Static Reference"
}, {
  id: 'g3',
  title: "NSFAS Application Guide 2027",
  description: "How to apply for NSFAS funding, eligibility requirements, and documentation needed.",
  category: "Bursaries",
  file_url: "https://www.nsfas.org.za/content/guides",
  source: "Static Reference"
}, {
  id: 'g4',
  title: "Choosing the Right Degree",
  description: "Career paths aligned with South African university degrees and occupational needs.",
  category: "Career Guidance",
  file_url: "https://www.dhet.gov.za/Career-Guidance",
  source: "Static Reference"
}];
const ALLOWED_FILE_TYPES = ['application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const STORAGE_BUCKET = import.meta.env.VITE_STORAGE_BUCKET || 'opportunity_guides';
const appName = import.meta.env.VITE_APP_NAME || 'SmartBridge FET';
export default function PDFGuides({
  isAdmin
}) {
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'NBT Prep'
  });
  const [file, setFile] = useState(null);
  const loadGuides = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: dbGuides,
        error
      } = await supabase.from('opportunity_guides').select('*').eq('is_active', true).eq('is_pending', false).order('created_at', {
        ascending: false
      });
      if (error) throw error;
      setGuides([...STATIC_GUIDES, ...(dbGuides || [])]);
    } catch (err) {
      console.error('Error loading guides:', err);
      toast.error('Failed to load guides');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    loadGuides();
  }, [loadGuides]);
  const uploadFileToSupabase = async file => {
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.\-]/g, '_');
    const fileExt = sanitizedName.split('.').pop();
    const fileName = `opportunity_guides/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const {
      error: uploadError
    } = await supabase.storage.from(STORAGE_BUCKET).upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });
    if (uploadError) throw uploadError;
    const {
      data: {
        publicUrl
      }
    } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
    return publicUrl;
  };
  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }
    if (!form.title) {
      toast.error('Please enter a title');
      return;
    }
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast.error('Only PDF files are allowed');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File too large. Maximum size is 10MB');
      return;
    }
    setUploading(true);
    try {
      const publicUrl = await uploadFileToSupabase(file);
      const {
        error: insertError
      } = await supabase.from('opportunity_guides').insert({
        title: form.title,
        description: form.description || null,
        category: form.category,
        file_url: publicUrl,
        is_pending: false,
        is_active: true
      });
      if (insertError) throw insertError;
      toast.success('Guide uploaded successfully');
      setShowAdd(false);
      setForm({
        title: '',
        description: '',
        category: 'NBT Prep'
      });
      setFile(null);
      loadGuides();
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(`Failed to upload: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };
  const handleDelete = async id => {
    if (typeof id === 'string' && id.startsWith('g')) {
      toast.info('Static reference guides cannot be deleted');
      return;
    }
    if (!confirm('Delete this guide permanently?')) return;
    try {
      const {
        error
      } = await supabase.from('opportunity_guides').delete().eq('id', id);
      if (error) throw error;
      toast.success('Guide deleted');
      loadGuides();
    } catch (err) {
      console.error('Delete error:', err);
      toast.error(`Failed to delete: ${err.message}`);
    }
  };
  const categories = ["All", "NBT Prep", "University Requirements", "Bursaries", "Career Guidance", "General"];
  const filtered = filter === "All" ? guides : guides.filter(g => g.category === filter);
  if (loading) {
    return <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>;
  }
  return <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Download className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Downloadable PDF Guides</h3>
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map(c => <button key={c} onClick={() => setFilter(c)} className={`text-xs px-3 py-1 rounded-full border transition-colors ${filter === c ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:border-primary'}`}>
              {c}
            </button>)}
          {isAdmin && <Button size="sm" variant="outline" onClick={() => setShowAdd(true)} className="gap-1 text-xs h-7">
              <Plus className="w-3 h-3" /> Upload
            </Button>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map(g => {
        const isStatic = typeof g.id === 'string' && g.id.startsWith('g');
        return <Card key={g.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm mb-1">{g.title}</p>
                  {g.description && <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{g.description}</p>}
                  <div className="flex items-center justify-between">
                    <Badge className={`text-xs ${categoryColors[g.category] || 'bg-muted text-muted-foreground'}`}>
                      {g.category}
                    </Badge>
                    <div className="flex gap-1">
                      <a href={g.file_url} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                          <Download className="w-3 h-3" /> Download
                        </Button>
                      </a>
                      {isAdmin && !isStatic && <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(g.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>;
      })}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload PDF Guide</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Guide title *" value={form.title} onChange={e => setForm({
            ...form,
            title: e.target.value
          })} />
            <Input placeholder="Description (optional)" value={form.description} onChange={e => setForm({
            ...form,
            description: e.target.value
          })} />
            <Select value={form.category} onValueChange={v => setForm({
            ...form,
            category: v
          })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["NBT Prep", "University Requirements", "Bursaries", "Career Guidance", "General"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
              <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-2">Select a PDF file (Max 10MB)</p>
              <input type="file" accept=".pdf" onChange={e => setFile(e.target.files[0])} className="text-sm" />
              {file && <p className="text-xs text-green-600 mt-2">
                  ✅ {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </p>}
            </div>
            <Button onClick={handleUpload} disabled={!file || !form.title || uploading} className="w-full">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {uploading ? 'Uploading...' : 'Upload Guide'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>;
}
