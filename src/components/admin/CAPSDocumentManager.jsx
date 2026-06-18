import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';  // ✅ Fixed import path
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Upload, Trash2, FileText, Loader2, PlusCircle, X, RefreshCw } from 'lucide-react';

const SUBJECTS = [
  'Mathematics', 'Mathematical Literacy', 'Physical Sciences', 'Life Sciences',
  'Geography', 'History', 'Accounting', 'Business Studies', 'Economics',
  'English Home Language', 'Life Orientation', 'All Subjects'
];
const GRADES = ['Grade 10', 'Grade 11', 'Grade 12', 'All Grades'];
const DOC_TYPES = ['CAPS', 'ATP', 'Revised ATP', 'DBE Workbook', 'LTSM Catalogue', 'Study Guide', 'Guidelines'];

const EMPTY_FORM = {
  title: '', description: '', file_url: '', document_type: '', subject: '',
  grade: '', year: '', official_doc_number: ''
};

export default function CAPSDocumentManager() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [replacingId, setReplacingId] = useState(null);

  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('caps_documents')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setDocs(data || []);
    } catch (error) {
      console.error('Error fetching CAPS documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const uploadFileToSupabase = async (file, folder = 'caps') => {
    const fileName = `${folder}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('caps_documents')
      .upload(fileName, file);
    
    if (uploadError) throw uploadError;
    
    const { data: { publicUrl } } = supabase.storage
      .from('caps_documents')
      .getPublicUrl(fileName);
    
    return publicUrl;
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { toast.error('Only PDF files are allowed.'); return; }
    setUploading(true);
    try {
      const fileUrl = await uploadFileToSupabase(file);
      setForm(f => ({ ...f, file_url: fileUrl }));
      toast.success('PDF uploaded successfully.');
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.title || !form.file_url || !form.document_type || !form.subject || !form.grade) {
      toast.error('Please fill in all required fields and upload a PDF.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('caps_documents')
        .insert({
          title: form.title,
          description: form.description,
          file_url: form.file_url,
          document_type: form.document_type,
          subject: form.subject,
          grade: form.grade,
          year: form.year ? Number(form.year) : null,
          official_number: form.official_doc_number,
          is_public: true,
          download_count: 0,
        });
      
      if (error) throw error;
      
      toast.success('Document added successfully.');
      setForm(EMPTY_FORM);
      setShowForm(false);
      fetchDocs();
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReplacePDF = async (e, doc) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { toast.error('Only PDF files are allowed.'); return; }
    setReplacingId(doc.id);
    try {
      const fileUrl = await uploadFileToSupabase(file);
      const { error } = await supabase
        .from('caps_documents')
        .update({ file_url: fileUrl })
        .eq('id', doc.id);
      
      if (error) throw error;
      
      setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, file_url: fileUrl } : d));
      toast.success(`PDF updated for "${doc.title}"`);
    } catch (err) {
      console.error('Replace error:', err);
      toast.error('Replace failed: ' + err.message);
    } finally {
      setReplacingId(null);
      e.target.value = '';
    }
  };

  const handleDelete = async (doc) => {
    if (!confirm(`Delete "${doc.title}"?`)) return;
    try {
      const { error } = await supabase
        .from('caps_documents')
        .delete()
        .eq('id', doc.id);
      
      if (error) throw error;
      
      setDocs(prev => prev.filter(d => d.id !== doc.id));
      toast.success('Document deleted.');
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Delete failed: ' + err.message);
    }
  };

  const filtered = filterType === 'all' ? docs : docs.filter(d => d.document_type === filterType);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-playfair text-lg font-bold">CAPS Document Library</h3>
          <p className="text-sm text-muted-foreground">{docs.length} official documents uploaded</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="Filter type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" className="gap-1.5 bg-primary" onClick={() => setShowForm(v => !v)}>
            {showForm ? <X className="w-3.5 h-3.5" /> : <PlusCircle className="w-3.5 h-3.5" />}
            {showForm ? 'Cancel' : 'Add Document'}
          </Button>
        </div>
      </div>

      {/* Upload Form */}
      {showForm && (
        <Card className="border-primary/30 bg-accent/30">
          <CardHeader className="pb-3">
            <CardTitle className="font-playfair text-base">Add New CAPS Document</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <Input placeholder="Document title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              <Input placeholder="Official document number (optional)" value={form.official_doc_number} onChange={e => setForm(f => ({ ...f, official_doc_number: e.target.value }))} />
            </div>
            <Input placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <div className="grid sm:grid-cols-3 gap-3">
              <Select value={form.document_type} onValueChange={v => setForm(f => ({ ...f, document_type: v }))}>
                <SelectTrigger><SelectValue placeholder="Document type *" /></SelectTrigger>
                <SelectContent>{DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={form.subject} onValueChange={v => setForm(f => ({ ...f, subject: v }))}>
                <SelectTrigger><SelectValue placeholder="Subject *" /></SelectTrigger>
                <SelectContent>{SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={form.grade} onValueChange={v => setForm(f => ({ ...f, grade: v }))}>
                <SelectTrigger><SelectValue placeholder="Grade *" /></SelectTrigger>
                <SelectContent>{GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Input type="number" placeholder="Year (e.g. 2024)" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} className="w-40" />

            {/* PDF Upload */}
            <div className="flex items-center gap-3">
              <label className="cursor-pointer">
                <input type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} />
                <Button type="button" variant="outline" size="sm" className="gap-1.5 pointer-events-none" asChild>
                  <span>
                    {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    {uploading ? 'Uploading...' : 'Upload PDF *'}
                  </span>
                </Button>
              </label>
              {form.file_url && <span className="text-xs text-green-600 font-medium">✅ PDF ready</span>}
            </div>

            <div className="flex gap-2 pt-1">
              <Button onClick={handleSave} disabled={saving} className="bg-primary gap-1.5">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {saving ? 'Saving...' : 'Save Document'}
              </Button>
              <Button variant="ghost" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document List */}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-10 text-sm">No documents found. Upload the first one above.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(doc => (
            <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors">
              <FileText className="w-5 h-5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{doc.title}</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <Badge className="text-xs bg-primary/10 text-primary border-0">{doc.document_type}</Badge>
                  <Badge variant="outline" className="text-xs">{doc.subject}</Badge>
                  <Badge variant="outline" className="text-xs">{doc.grade}</Badge>
                  {doc.year && <Badge variant="secondary" className="text-xs">{doc.year}</Badge>}
                  {doc.official_number && <Badge variant="outline" className="text-xs">{doc.official_number}</Badge>}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-muted-foreground">{doc.download_count || 0} dl</span>
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs">View</Button>
                </a>
                {/* Replace PDF */}
                <label className="cursor-pointer" title="Replace PDF">
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={e => handleReplacePDF(e, doc)}
                    disabled={replacingId === doc.id}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs text-blue-600 border-blue-200 hover:bg-blue-50 pointer-events-none"
                    asChild
                  >
                    <span>
                      {replacingId === doc.id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <RefreshCw className="w-3 h-3" />}
                    </span>
                  </Button>
                </label>
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleDelete(doc)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
