// src/pages/CAPSAdmin.jsx
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Upload, Trash2, FileText, Loader2, PlusCircle, X,
  RefreshCw, Pencil, Check, Search, Filter, AlertTriangle
} from 'lucide-react';

// ============================================================
// 🔧 SOFT-CODED CONFIGURATION
// ============================================================

const CONFIG = {
  // Storage bucket name
  STORAGE_BUCKET: import.meta.env.VITE_CAPS_STORAGE_BUCKET || 'caps-documents',

  // Allowed file types
  ALLOWED_FILE_TYPES: (import.meta.env.VITE_CAPS_ALLOWED_TYPES || 'application/pdf').split(','),

  // Max file size (in MB)
  MAX_FILE_SIZE_MB: Number(import.meta.env.VITE_CAPS_MAX_FILE_SIZE_MB) || 50,

  // Pagination
  PAGE_SIZE: Number(import.meta.env.VITE_CAPS_PAGE_SIZE) || 100,

  // Feature flags
  ENABLE_BULK_DELETE: import.meta.env.VITE_CAPS_ENABLE_BULK_DELETE !== 'false',
  ENABLE_REPLACE_PDF: import.meta.env.VITE_CAPS_ENABLE_REPLACE_PDF !== 'false',

  // Messages
  MESSAGES: {
    UPLOAD_SUCCESS: import.meta.env.VITE_CAPS_UPLOAD_SUCCESS_MSG || 'PDF uploaded successfully.',
    UPLOAD_FAILED: import.meta.env.VITE_CAPS_UPLOAD_FAILED_MSG || 'Upload failed. Please try again.',
    SAVE_SUCCESS: import.meta.env.VITE_CAPS_SAVE_SUCCESS_MSG || 'Document added successfully.',
    SAVE_FAILED: import.meta.env.VITE_CAPS_SAVE_FAILED_MSG || 'Save failed. Please try again.',
    DELETE_SUCCESS: import.meta.env.VITE_CAPS_DELETE_SUCCESS_MSG || 'Document and file deleted.',
    DELETE_FAILED: import.meta.env.VITE_CAPS_DELETE_FAILED_MSG || 'Delete failed. Please try again.',
    UPDATE_SUCCESS: import.meta.env.VITE_CAPS_UPDATE_SUCCESS_MSG || 'Document updated.',
    UPDATE_FAILED: import.meta.env.VITE_CAPS_UPDATE_FAILED_MSG || 'Update failed. Please try again.',
    REPLACE_SUCCESS: import.meta.env.VITE_CAPS_REPLACE_SUCCESS_MSG || 'PDF replaced successfully.',
    REPLACE_FAILED: import.meta.env.VITE_CAPS_REPLACE_FAILED_MSG || 'Replace failed. Please try again.',
    BULK_DELETE_SUCCESS: import.meta.env.VITE_CAPS_BULK_DELETE_SUCCESS_MSG || '{count} document(s) deleted.',
    BULK_DELETE_FAILED: import.meta.env.VITE_CAPS_BULK_DELETE_FAILED_MSG || 'Bulk delete failed. Please try again.',
    FILL_REQUIRED: import.meta.env.VITE_CAPS_FILL_REQUIRED_MSG || 'Please fill in all required fields and upload a PDF.',
    INVALID_FILE_TYPE: import.meta.env.VITE_CAPS_INVALID_FILE_TYPE_MSG || 'Only PDF files are allowed.',
    FILE_TOO_LARGE: import.meta.env.VITE_CAPS_FILE_TOO_LARGE_MSG || 'File size exceeds the {size}MB limit.',
    CONFIRM_DELETE: import.meta.env.VITE_CAPS_CONFIRM_DELETE_MSG || 'Delete "{title}"? This will also remove the actual PDF file.',
    CONFIRM_BULK_DELETE: import.meta.env.VITE_CAPS_CONFIRM_BULK_DELETE_MSG || 'Delete {count} selected document(s)? This will also remove all associated PDF files.',
  },
};

// ============================================================
// Constants
// ============================================================

const SUBJECTS = [
  'Mathematics', 'Mathematical Literacy', 'Physical Sciences', 'Life Sciences',
  'Geography', 'History', 'Accounting', 'Business Studies', 'Economics',
  'English Home Language', 'Life Orientation', 'All Subjects'
];

const GRADES = ['Grade 10', 'Grade 11', 'Grade 12', 'All Grades'];
const DOC_TYPES = ['CAPS', 'ATP', 'Revised ATP', 'DBE Workbook', 'LTSM Catalogue', 'Study Guide', 'Guidelines'];

const EMPTY_FORM = {
  title: '',
  description: '',
  file_url: '',
  document_type: '',
  subject: '',
  grade: '',
  year: '',
  official_doc_number: ''
};

// ============================================================
// Main Component
// ============================================================

export default function CAPSAdmin() {
  // ---------- State ----------
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterGrade, setFilterGrade] = useState('all');

  // Inline edit state
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [replacingId, setReplacingId] = useState(null);

  // Bulk delete
  const [selected, setSelected] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // ---------- Helper Functions ----------
  const getStoragePathFromUrl = useCallback((url) => {
    if (!url) return null;
    const parts = url.split(`/storage/v1/object/public/${CONFIG.STORAGE_BUCKET}/`);
    return parts.length > 1 ? parts[1] : null;
  }, []);

  const safeParseYear = (value) => {
    if (!value) return null;
    const num = Number(value);
    return isNaN(num) ? null : num;
  };

  const validateFile = (file) => {
    if (!CONFIG.ALLOWED_FILE_TYPES.includes(file.type)) {
      toast.error(CONFIG.MESSAGES.INVALID_FILE_TYPE);
      return false;
    }
    const maxSizeBytes = CONFIG.MAX_FILE_SIZE_MB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast.error(CONFIG.MESSAGES.FILE_TOO_LARGE.replace('{size}', CONFIG.MAX_FILE_SIZE_MB));
      return false;
    }
    return true;
  };

  // ---------- Upload to Supabase Storage ----------
  const uploadFileToSupabase = useCallback(async (file, subject = '', grade = '') => {
    const fileExt = file.name.split('.').pop();
    const safeSubject = subject.replace(/\s+/g, '_') || 'uncategorized';
    const safeGrade = grade.replace(/\s+/g, '_') || 'uncategorized';
    const fileName = `${safeSubject}/${safeGrade}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from(CONFIG.STORAGE_BUCKET)
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from(CONFIG.STORAGE_BUCKET)
      .getPublicUrl(fileName);

    return publicUrl;
  }, []);

  // ---------- Data Fetching (Server-side filtering) ----------
  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('caps_documents')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (filterType !== 'all') query = query.eq('document_type', filterType);
      if (filterSubject !== 'all') query = query.eq('subject', filterSubject);
      if (filterGrade !== 'all') query = query.eq('grade', filterGrade);
      if (search) query = query.ilike('title', `%${search}%`);

      const { data, error } = await query.limit(CONFIG.PAGE_SIZE);

      if (error) throw error;
      setDocs(data || []);
    } catch (err) {
      console.error('Error fetching CAPS documents:', err);
      toast.error('Failed to load documents: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [filterType, filterSubject, filterGrade, search]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  // ---------- File Upload Handler ----------
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!validateFile(file)) {
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const fileUrl = await uploadFileToSupabase(file, form.subject, form.grade);
      setForm(f => ({ ...f, file_url: fileUrl }));
      toast.success(CONFIG.MESSAGES.UPLOAD_SUCCESS);
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(CONFIG.MESSAGES.UPLOAD_FAILED + ' ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  // ---------- Save New Document ----------
  const handleSave = async () => {
    if (!form.title || !form.file_url || !form.document_type || !form.subject || !form.grade) {
      toast.error(CONFIG.MESSAGES.FILL_REQUIRED);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description?.trim() || null,
        file_url: form.file_url,
        document_type: form.document_type,
        subject: form.subject,
        grade: form.grade,
        year: safeParseYear(form.year),
        official_doc_number: form.official_doc_number?.trim() || null,
        download_count: 0
      };

      const { data, error } = await supabase
        .from('caps_documents')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      setDocs(prev => [data, ...prev]);
      toast.success(CONFIG.MESSAGES.SAVE_SUCCESS);
      setForm(EMPTY_FORM);
      setShowAddForm(false);
    } catch (err) {
      console.error('Save error:', err);
      toast.error(CONFIG.MESSAGES.SAVE_FAILED + ' ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ---------- Inline Edit ----------
  const startEdit = (doc) => {
    setEditingId(doc.id);
    setEditForm({
      title: doc.title || '',
      description: doc.description || '',
      document_type: doc.document_type || '',
      subject: doc.subject || '',
      grade: doc.grade || '',
      year: doc.year || '',
      official_doc_number: doc.official_doc_number || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async (doc) => {
    if (!editForm.title || !editForm.document_type || !editForm.subject || !editForm.grade) {
      toast.error('Title, type, subject and grade are required.');
      return;
    }

    setEditSaving(true);
    try {
      const payload = {
        title: editForm.title.trim(),
        description: editForm.description?.trim() || null,
        document_type: editForm.document_type,
        subject: editForm.subject,
        grade: editForm.grade,
        year: safeParseYear(editForm.year),
        official_doc_number: editForm.official_doc_number?.trim() || null
      };

      const { error } = await supabase
        .from('caps_documents')
        .update(payload)
        .eq('id', doc.id);

      if (error) throw error;

      setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, ...payload } : d));
      toast.success(CONFIG.MESSAGES.UPDATE_SUCCESS);
      setEditingId(null);
    } catch (err) {
      console.error('Update error:', err);
      toast.error(CONFIG.MESSAGES.UPDATE_FAILED + ' ' + err.message);
    } finally {
      setEditSaving(false);
    }
  };

  // ---------- Replace PDF ----------
  const handleReplacePDF = async (e, doc) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!validateFile(file)) {
      e.target.value = '';
      return;
    }

    setReplacingId(doc.id);
    try {
      // 1. Delete old file from storage
      const oldStoragePath = getStoragePathFromUrl(doc.file_url);
      if (oldStoragePath) {
        const { error: deleteError } = await supabase.storage
          .from(CONFIG.STORAGE_BUCKET)
          .remove([oldStoragePath]);

        if (deleteError) {
          console.warn('Failed to delete old file:', deleteError);
          // Continue anyway - we can still upload the new file
        }
      }

      // 2. Upload new file
      const fileUrl = await uploadFileToSupabase(file, doc.subject, doc.grade);

      // 3. Update database
      const { error } = await supabase
        .from('caps_documents')
        .update({ file_url: fileUrl })
        .eq('id', doc.id);

      if (error) throw error;

      setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, file_url: fileUrl } : d));
      toast.success(CONFIG.MESSAGES.REPLACE_SUCCESS);
    } catch (err) {
      console.error('Replace error:', err);
      toast.error(CONFIG.MESSAGES.REPLACE_FAILED + ' ' + err.message);
    } finally {
      setReplacingId(null);
      e.target.value = '';
    }
  };

  // ---------- Delete with Storage Cleanup ----------
  const handleDelete = async (doc) => {
    if (!confirm(CONFIG.MESSAGES.CONFIRM_DELETE.replace('{title}', doc.title))) return;

    try {
      // 1. Delete file from storage
      const storagePath = getStoragePathFromUrl(doc.file_url);
      if (storagePath) {
        const { error: deleteError } = await supabase.storage
          .from(CONFIG.STORAGE_BUCKET)
          .remove([storagePath]);

        if (deleteError) {
          console.warn('Failed to delete file from storage:', deleteError);
          // Continue anyway - database deletion is more important
        }
      }

      // 2. Delete from database
      const { error } = await supabase
        .from('caps_documents')
        .delete()
        .eq('id', doc.id);

      if (error) throw error;

      setDocs(prev => prev.filter(d => d.id !== doc.id));
      setSelected(prev => {
        const next = new Set(prev);
        next.delete(doc.id);
        return next;
      });
      toast.success(CONFIG.MESSAGES.DELETE_SUCCESS);
    } catch (err) {
      console.error('Delete error:', err);
      toast.error(CONFIG.MESSAGES.DELETE_FAILED + ' ' + err.message);
    }
  };

  // ---------- Bulk Delete ----------
  const handleBulkDelete = async () => {
    if (!selected.size) return;
    if (!CONFIG.ENABLE_BULK_DELETE) {
      toast.warning('Bulk delete is currently disabled.');
      return;
    }

    if (!confirm(CONFIG.MESSAGES.CONFIRM_BULK_DELETE.replace('{count}', selected.size))) return;

    setBulkDeleting(true);
    try {
      const docsToDelete = docs.filter(d => selected.has(d.id));

      // 1. Delete all files from storage
      const storagePaths = docsToDelete
        .map(d => getStoragePathFromUrl(d.file_url))
        .filter(Boolean);

      if (storagePaths.length) {
        const { error: deleteError } = await supabase.storage
          .from(CONFIG.STORAGE_BUCKET)
          .remove(storagePaths);

        if (deleteError) {
          console.warn('Failed to delete some files from storage:', deleteError);
          // Continue anyway
        }
      }

      // 2. Delete all from database
      const { error } = await supabase
        .from('caps_documents')
        .delete()
        .in('id', Array.from(selected));

      if (error) throw error;

      setDocs(prev => prev.filter(d => !selected.has(d.id)));
      setSelected(new Set());
      toast.success(CONFIG.MESSAGES.BULK_DELETE_SUCCESS.replace('{count}', docsToDelete.length));
    } catch (err) {
      console.error('Bulk delete error:', err);
      toast.error(CONFIG.MESSAGES.BULK_DELETE_FAILED + ' ' + err.message);
    } finally {
      setBulkDeleting(false);
    }
  };

  // ---------- Selection Handlers ----------
  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === docs.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(docs.map(d => d.id)));
    }
  };

  // ---------- Clear Filters ----------
  const clearFilters = () => {
    setSearch('');
    setFilterType('all');
    setFilterSubject('all');
    setFilterGrade('all');
  };

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Page Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-playfair text-2xl md:text-3xl font-bold text-foreground">CAPS Document Manager</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {docs.length} document{docs.length !== 1 ? 's' : ''}
              {docs.length > 0 && ` · ${selected.size} selected`}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {CONFIG.ENABLE_BULK_DELETE && selected.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="gap-1.5"
              >
                {bulkDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Delete Selected ({selected.size})
              </Button>
            )}
            <Button className="bg-primary gap-2" onClick={() => setShowAddForm(v => !v)}>
              {showAddForm ? <X className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
              {showAddForm ? 'Cancel' : 'Add Document'}
            </Button>
          </div>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <Card className="border-primary/30 bg-accent/20">
            <CardHeader className="pb-3">
              <CardTitle className="font-playfair text-base">New CAPS Document</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <Input
                  placeholder="Title *"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                />
                <Input
                  placeholder="Official document number"
                  value={form.official_doc_number}
                  onChange={e => setForm(f => ({ ...f, official_doc_number: e.target.value }))}
                />
              </div>
              <Input
                placeholder="Description (optional)"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
              <div className="grid sm:grid-cols-3 gap-3">
                <Select value={form.document_type} onValueChange={v => setForm(f => ({ ...f, document_type: v }))}>
                  <SelectTrigger><SelectValue placeholder="Type *" /></SelectTrigger>
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
              <Input
                type="number"
                placeholder="Year (e.g. 2025)"
                value={form.year}
                onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                className="w-40"
              />
              <div className="flex items-center gap-3">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 pointer-events-none"
                    asChild
                  >
                    <span>
                      {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      {uploading ? 'Uploading…' : 'Upload PDF *'}
                    </span>
                  </Button>
                </label>
                {form.file_url && (
                  <span className="text-xs text-green-600 font-medium">✅ PDF ready</span>
                )}
                <span className="text-[10px] text-muted-foreground">
                  Max {CONFIG.MAX_FILE_SIZE_MB}MB · PDF only
                </span>
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  onClick={handleSave}
                  disabled={saving || !form.file_url}
                  className="bg-primary gap-1.5"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? 'Saving…' : 'Save Document'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => { setShowAddForm(false); setForm(EMPTY_FORM); }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search title, description, doc number…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  aria-label="Search documents"
                />
              </div>
              <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-36"><SelectValue placeholder="All Types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterSubject} onValueChange={setFilterSubject}>
                <SelectTrigger className="w-44"><SelectValue placeholder="All Subjects" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterGrade} onValueChange={setFilterGrade}>
                <SelectTrigger className="w-32"><SelectValue placeholder="All Grades" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  {GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
              {(search || filterType !== 'all' || filterSubject !== 'all' || filterGrade !== 'all') && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="w-3.5 h-3.5 mr-1" /> Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Document Table */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : docs.length === 0 ? (
          <Card>
            <CardContent className="text-center py-16">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
              <p className="font-semibold text-muted-foreground">No documents found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {search || filterType !== 'all' || filterSubject !== 'all' || filterGrade !== 'all'
                  ? 'Try adjusting your filters.'
                  : 'Add your first CAPS document using the button above.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              {/* Table header */}
              <div className="flex items-center gap-3 px-4 py-2 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/30 rounded-t-xl">
                <input
                  type="checkbox"
                  className="w-4 h-4 cursor-pointer"
                  checked={selected.size === docs.length && docs.length > 0}
                  onChange={toggleSelectAll}
                  aria-label="Select all documents"
                />
                <span className="flex-1">Title / Metadata</span>
                <span className="w-16 text-right">Dl</span>
                <span className="w-52 text-right">Actions</span>
              </div>

              <div className="divide-y">
                {docs.map(doc => (
                  <div
                    key={doc.id}
                    className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors ${selected.has(doc.id) ? 'bg-red-50/50' : ''}`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 w-4 h-4 cursor-pointer flex-shrink-0"
                      checked={selected.has(doc.id)}
                      onChange={() => toggleSelect(doc.id)}
                      aria-label={`Select ${doc.title}`}
                    />
                    <FileText className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />

                    {/* Content — view or edit mode */}
                    {editingId === doc.id ? (
                      <div className="flex-1 space-y-2">
                        <div className="grid sm:grid-cols-2 gap-2">
                          <Input
                            className="h-8 text-sm"
                            placeholder="Title *"
                            value={editForm.title}
                            onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                          />
                          <Input
                            className="h-8 text-sm"
                            placeholder="Doc number"
                            value={editForm.official_doc_number}
                            onChange={e => setEditForm(f => ({ ...f, official_doc_number: e.target.value }))}
                          />
                        </div>
                        <Input
                          className="h-8 text-sm"
                          placeholder="Description"
                          value={editForm.description}
                          onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                        />
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <Select value={editForm.document_type} onValueChange={v => setEditForm(f => ({ ...f, document_type: v }))}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
                            <SelectContent>{DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                          </Select>
                          <Select value={editForm.subject} onValueChange={v => setEditForm(f => ({ ...f, subject: v }))}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Subject" /></SelectTrigger>
                            <SelectContent>{SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                          </Select>
                          <Select value={editForm.grade} onValueChange={v => setEditForm(f => ({ ...f, grade: v }))}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Grade" /></SelectTrigger>
                            <SelectContent>{GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                          </Select>
                          <Input
                            className="h-8 text-xs"
                            type="number"
                            placeholder="Year"
                            value={editForm.year}
                            onChange={e => setEditForm(f => ({ ...f, year: e.target.value }))}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{doc.title}</p>
                        {doc.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{doc.description}</p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          <Badge className="text-xs bg-primary/10 text-primary border-0 h-5">{doc.document_type}</Badge>
                          <Badge variant="outline" className="text-xs h-5">{doc.subject}</Badge>
                          <Badge variant="outline" className="text-xs h-5">{doc.grade}</Badge>
                          {doc.year && <Badge variant="secondary" className="text-xs h-5">{doc.year}</Badge>}
                          {doc.official_doc_number && (
                            <Badge variant="outline" className="text-xs h-5">{doc.official_doc_number}</Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Download count */}
                    <span className="text-xs text-muted-foreground w-16 text-right flex-shrink-0 mt-1">
                      {doc.download_count || 0} dl
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0 flex-wrap justify-end w-52">
                      {editingId === doc.id ? (
                        <>
                          <Button
                            size="sm"
                            className="h-7 px-2 text-xs bg-primary gap-1"
                            onClick={() => saveEdit(doc)}
                            disabled={editSaving}
                          >
                            {editSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={cancelEdit}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs">View</Button>
                          </a>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                            onClick={() => startEdit(doc)}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          {CONFIG.ENABLE_REPLACE_PDF && (
                            <label className="cursor-pointer" title="Replace PDF">
                              <input
                                type="file"
                                accept=".pdf,application/pdf"
                                className="hidden"
                                onChange={e => handleReplacePDF(e, doc)}
                                disabled={replacingId === doc.id}
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs text-orange-600 border-orange-200 hover:bg-orange-50 pointer-events-none"
                                asChild
                              >
                                <span>
                                  {replacingId === doc.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                </span>
                              </Button>
                            </label>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => handleDelete(doc)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
