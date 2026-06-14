import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, Trash2, ExternalLink, Loader2, BookOpen, 
  Search, Filter, Edit, Save, X, ChevronLeft, ChevronRight,
  AlertTriangle, Upload, FileText, CheckCircle, SortAsc, SortDesc
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const SUBJECTS = [
  'Mathematics', 'Mathematical Literacy', 'Physical Sciences', 'Life Sciences',
  'Geography', 'History', 'Accounting', 'Business Studies', 'Economics',
  'English Home Language', 'Life Orientation', 'All Subjects'
];
const GRADES = ['Grade 10', 'Grade 11', 'Grade 12', 'All Grades'];
const SORT_OPTIONS = [
  { value: '-created_at', label: 'Newest First' },
  { value: 'created_at', label: 'Oldest First' },
  { value: 'title', label: 'Title A-Z' },
  { value: '-title', label: 'Title Z-A' },
  { value: 'subject', label: 'Subject A-Z' },
];
const ITEMS_PER_PAGE = 10;

const ALLOWED_FILE_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const EMPTY_FORM = { 
  id: null, title: '', resource_url: '', subject: '', grade: '', 
  caps_alignment_tag: '', description: '', is_active: true 
};

// Reusable Resource Card Component
const ResourceCard = ({ resource, onEdit, onDelete, onToggleActive }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(resource.id);
    setIsDeleting(false);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <div className="flex items-start gap-3 p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors group">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <BookOpen className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-sm">{resource.title}</p>
            <Badge className={`text-xs ${resource.is_active ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
              {resource.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {resource.subject} · {resource.grade}
            {resource.caps_alignment_tag && ` · ${resource.caps_alignment_tag}`}
          </p>
          {resource.description && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-md">{resource.description}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Added: {new Date(resource.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {resource.resource_url && (
            <a href={resource.resource_url} target="_blank" rel="noopener noreferrer">
              <Button size="icon" variant="ghost" className="h-7 w-7" title="View Resource">
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </a>
          )}
          <Button 
            size="sm" 
            variant="outline" 
            className="h-7 text-xs" 
            onClick={() => onEdit(resource)}
            title="Edit Resource"
          >
            <Edit className="w-3 h-3 mr-1" /> Edit
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="h-7 text-xs" 
            onClick={() => onToggleActive(resource)}
            title={resource.is_active ? 'Disable' : 'Enable'}
          >
            {resource.is_active ? 'Disable' : 'Enable'}
          </Button>
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-7 w-7 text-destructive hover:bg-destructive/10" 
            onClick={() => setShowDeleteDialog(true)}
            title="Delete Resource"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resource</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{resource.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// Reusable Resource Form Component
const ResourceForm = ({ initialData, onSave, onCancel, isSaving }) => {
  const [form, setForm] = useState(initialData || EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadFileToSupabase = async (file) => {
    const fileName = `knowledge-base/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('educational_resources')
      .upload(fileName, file);
    
    if (uploadError) throw uploadError;
    
    const { data: { publicUrl } } = supabase.storage
      .from('educational_resources')
      .getPublicUrl(fileName);
    
    return publicUrl;
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast.error('Invalid file type. Please upload PDF, DOC, DOCX, or TXT files.');
      return;
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File too large. Maximum size is 10MB.');
      return;
    }
    
    setUploading(true);
    setUploadProgress(0);
    
    // Simulate progress for better UX
    const interval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 10, 90));
    }, 200);
    
    try {
      const fileUrl = await uploadFileToSupabase(file);
      setForm(prev => ({ ...prev, resource_url: fileUrl }));
      setUploadProgress(100);
      toast.success('File uploaded!');
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      clearInterval(interval);
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const required = ['title', 'resource_url', 'subject', 'grade'];
    const missing = required.filter(field => !form[field]);
    
    if (missing.length) {
      toast.error(`Missing required fields: ${missing.join(', ')}`);
      return;
    }
    
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs">Title *</Label>
          <Input 
            className="h-8 text-xs" 
            placeholder="e.g. Grade 12 Calculus Study Guide" 
            value={form.title} 
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))} 
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Subject *</Label>
          <Select value={form.subject} onValueChange={v => setForm(p => ({ ...p, subject: v }))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select subject" /></SelectTrigger>
            <SelectContent>
              {SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Grade *</Label>
          <Select value={form.grade} onValueChange={v => setForm(p => ({ ...p, grade: v }))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select grade" /></SelectTrigger>
            <SelectContent>
              {GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">CAPS Alignment Tag</Label>
          <Input 
            className="h-8 text-xs" 
            placeholder="e.g. Calculus – Differentiation" 
            value={form.caps_alignment_tag} 
            onChange={e => setForm(p => ({ ...p, caps_alignment_tag: e.target.value }))} 
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Upload File</Label>
          <div className="flex items-center gap-2">
            <Input 
              type="file" 
              className="h-8 text-xs flex-1" 
              accept=".pdf,.doc,.docx,.txt" 
              onChange={handleFileUpload} 
              disabled={uploading} 
            />
            {uploading && (
              <div className="flex items-center gap-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="text-xs">{uploadProgress}%</span>
              </div>
            )}
          </div>
          {form.resource_url && !uploading && (
            <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
              <CheckCircle className="w-3 h-3" /> File uploaded
            </p>
          )}
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs">Or paste resource URL</Label>
          <Input 
            className="h-8 text-xs" 
            placeholder="https://..." 
            value={form.resource_url} 
            onChange={e => setForm(p => ({ ...p, resource_url: e.target.value }))} 
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs">Description</Label>
          <Textarea 
            className="text-xs min-h-[60px]" 
            placeholder="Brief summary of this resource's content..." 
            value={form.description} 
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))} 
          />
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="submit" size="sm" className="h-8 text-xs bg-primary" disabled={isSaving || uploading}>
          {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
          {form.id ? 'Update Resource' : 'Save Resource'}
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default function KnowledgeBaseManager({ user }) {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  
  // Filter & Pagination State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterGrade, setFilterGrade] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('-created_at');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Active Tab
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('educational_resources')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setResources(data || []);
    } catch (err) {
      console.error('Failed to load resources:', err);
      toast.error(`Failed to load: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Filtered and Sorted Resources
  const filteredResources = useMemo(() => {
    let filtered = [...resources];
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(r => 
        r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.caps_alignment_tag?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Subject filter
    if (filterSubject !== 'all') {
      filtered = filtered.filter(r => r.subject === filterSubject);
    }
    
    // Grade filter
    if (filterGrade !== 'all') {
      filtered = filtered.filter(r => r.grade === filterGrade);
    }
    
    // Status filter (for tab)
    if (activeTab === 'active') {
      filtered = filtered.filter(r => r.is_active === true);
    } else if (activeTab === 'inactive') {
      filtered = filtered.filter(r => r.is_active === false);
    }
    
    // Sort
    filtered.sort((a, b) => {
      if (sortBy === '-created_at') return new Date(b.created_at) - new Date(a.created_at);
      if (sortBy === 'created_at') return new Date(a.created_at) - new Date(b.created_at);
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === '-title') return b.title.localeCompare(a.title);
      if (sortBy === 'subject') return (a.subject || '').localeCompare(b.subject || '');
      return 0;
    });
    
    return filtered;
  }, [resources, searchTerm, filterSubject, filterGrade, sortBy, activeTab]);

  // Pagination
  const totalPages = Math.ceil(filteredResources.length / ITEMS_PER_PAGE);
  const paginatedResources = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredResources.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredResources, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterSubject, filterGrade, activeTab, sortBy]);

  const handleSave = async (formData) => {
    setSaving(true);
    try {
      if (formData.id) {
        // Update existing
        const { error } = await supabase
          .from('educational_resources')
          .update({
            title: formData.title,
            resource_url: formData.resource_url,
            subject: formData.subject,
            grade: formData.grade,
            caps_alignment_tag: formData.caps_alignment_tag,
            description: formData.description,
          })
          .eq('id', formData.id);
        
        if (error) throw error;
        
        setResources(prev => prev.map(r => 
          r.id === formData.id ? { ...r, ...formData } : r
        ));
        toast.success('Resource updated!');
      } else {
        // Create new
        const { data, error } = await supabase
          .from('educational_resources')
          .insert({
            title: formData.title,
            resource_url: formData.resource_url,
            subject: formData.subject,
            grade: formData.grade,
            caps_alignment_tag: formData.caps_alignment_tag,
            description: formData.description,
            uploaded_by: user?.email,
            is_active: true
          })
          .select()
          .single();
        
        if (error) throw error;
        
        setResources(prev => [data, ...prev]);
        toast.success('Resource added to Knowledge Base!');
      }
      
      setShowForm(false);
      setEditingResource(null);
    } catch (err) {
      console.error('Save error:', err);
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (resource) => {
    setEditingResource(resource);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase
        .from('educational_resources')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setResources(prev => prev.filter(r => r.id !== id));
      toast.success('Resource removed.');
    } catch (err) {
      console.error('Delete error:', err);
      toast.error(`Failed to remove: ${err.message}`);
    }
  };

  const toggleActive = async (resource) => {
    const newStatus = !resource.is_active;
    try {
      const { error } = await supabase
        .from('educational_resources')
        .update({ is_active: newStatus })
        .eq('id', resource.id);
      
      if (error) throw error;
      
      setResources(prev => prev.map(r => 
        r.id === resource.id ? { ...r, is_active: newStatus } : r
      ));
    } catch (err) {
      console.error('Toggle error:', err);
      toast.error(`Failed to update: ${err.message}`);
      // Revert optimistic update on error
      setResources(prev => prev.map(r => 
        r.id === resource.id ? { ...r, is_active: resource.is_active } : r
      ));
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterSubject('all');
    setFilterGrade('all');
    setFilterStatus('all');
    setActiveTab('all');
    setSortBy('-created_at');
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-playfair text-lg font-bold">Knowledge Base Manager</h3>
          <p className="text-sm text-muted-foreground">
            {filteredResources.length} resource{filteredResources.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <Button size="sm" className="bg-primary gap-1.5 text-xs h-8" onClick={() => { setEditingResource(null); setShowForm(!showForm); }}>
          <Plus className="w-3.5 h-3.5" /> Add Resource
        </Button>
      </div>

      {/* Add/Edit Form Modal */}
      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) setEditingResource(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-playfair">
              {editingResource ? 'Edit Resource' : 'Add New Resource'}
            </DialogTitle>
          </DialogHeader>
          <ResourceForm 
            initialData={editingResource || EMPTY_FORM}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditingResource(null); }}
            isSaving={saving}
          />
        </DialogContent>
      </Dialog>

      {/* Filters Bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input 
            className="pl-8 h-8 text-sm" 
            placeholder="Search resources..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={filterSubject} onValueChange={setFilterSubject}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="All Subjects" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterGrade} onValueChange={setFilterGrade}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="All Grades" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grades</SelectItem>
            {GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {(searchTerm || filterSubject !== 'all' || filterGrade !== 'all' || activeTab !== 'all' || sortBy !== '-created_at') && (
          <Button size="sm" variant="ghost" className="h-8 text-xs gap-1" onClick={clearFilters}>
            <X className="w-3 h-3" /> Clear Filters
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All ({resources.length})</TabsTrigger>
          <TabsTrigger value="active">Active ({resources.filter(r => r.is_active).length})</TabsTrigger>
          <TabsTrigger value="inactive">Inactive ({resources.filter(r => !r.is_active).length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Resource List */}
      <div className="space-y-2">
        {paginatedResources.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-muted-foreground">No resources found.</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters or add a new resource.</p>
          </div>
        ) : (
          paginatedResources.map(resource => (
            <ResourceCard 
              key={resource.id}
              resource={resource}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleActive={toggleActive}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-xs text-muted-foreground">
            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredResources.length)} of {filteredResources.length}
          </p>
          <div className="flex gap-1">
            <Button 
              size="sm" 
              variant="outline" 
              className="h-7 w-7 p-0"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <Button 
                  key={pageNum}
                  size="sm" 
                  variant={currentPage === pageNum ? 'default' : 'outline'}
                  className="h-7 w-7 p-0 text-xs"
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
            <Button 
              size="sm" 
              variant="outline" 
              className="h-7 w-7 p-0"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}