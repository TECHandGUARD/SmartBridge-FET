import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { SUBJECTS } from '@/lib/subjects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileText, BookOpen, ClipboardList, Lightbulb, Star, Loader2, ArrowLeft, Shield, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

// ============================================================
// Configuration (Soft-coded for admin control)
// ============================================================

const appName = import.meta.env.VITE_APP_NAME || 'SmartBridge FET';
const STORAGE_BUCKET = import.meta.env.VITE_STORAGE_BUCKET || 'tutor-resources';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// ============================================================
// Templates (Soft-coded for admin control)
// ============================================================

const TEMPLATES = [
  {
    key: 'lesson_notes',
    label: 'Lesson Notes',
    icon: BookOpen,
    color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800',
    type: 'Notes',
    description: 'Structured notes covering a specific topic or chapter, with key concepts highlighted.',
    fields: { title_hint: 'e.g. Gr12 Maths – Differential Calculus Notes', desc_hint: 'Key concepts: limits, first principles, differentiation rules…' },
  },
  {
    key: 'practice_paper',
    label: 'Practice Paper',
    icon: ClipboardList,
    color: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800',
    type: 'Past Paper',
    description: 'Question paper with or without a memo, formatted like a test or exam.',
    fields: { title_hint: 'e.g. Gr11 Physical Sciences – June Test Paper 1', desc_hint: 'Sections: Multiple choice (Q1-10), Structured (Q11-15). Includes memo.' },
  },
  {
    key: 'study_guide',
    label: 'Study Guide',
    icon: Lightbulb,
    color: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800',
    type: 'Summary',
    description: 'Comprehensive revision guide summarising an entire term or exam scope.',
    fields: { title_hint: 'e.g. Gr10 Life Sciences – Term 2 Study Guide', desc_hint: 'Covers: Plant & animal tissues, support systems, transport systems…' },
  },
  {
    key: 'worksheet',
    label: 'Worksheet',
    icon: FileText,
    color: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800',
    type: 'Worksheet',
    description: 'Targeted practice exercises on a specific sub-topic with worked examples.',
    fields: { title_hint: 'e.g. Gr12 Accounting – Cash Flow Statement Worksheet', desc_hint: '10 exercises progressing from easy to exam-level difficulty.' },
  },
];

// ============================================================
// Main Component
// ============================================================

export default function ResourceTemplateUploader({ user, onUploaded }) {
  const [step, setStep] = useState('choose');
  const [template, setTemplate] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    title: '', subject: '', grade: 'Grade 12', description: '', is_premium: false,
  });

  // ============================================================
  // Template Selection
  // ============================================================

  const selectTemplate = (t) => {
    setTemplate(t);
    setForm({ title: '', subject: '', grade: 'Grade 12', description: '', is_premium: false });
    setSelectedFile(null);
    setError(null);
    setStep('fill');
  };

  // ============================================================
  // File Validation
  // ============================================================

  const validateFile = (file) => {
    const allowedTypes = [
      'application/pdf', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'image/png', 
      'image/jpeg', 
      'image/jpg',
      'text/plain'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a PDF, DOC, DOCX, PNG, JPG, or TXT file.');
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`);
      return false;
    }

    setError(null);
    return true;
  };

  // ============================================================
  // Upload Resource
  // ============================================================

  const handleUpload = async () => {
    // Validate form
    if (!form.title.trim()) {
      toast.error('Please enter a title.');
      return;
    }
    
    if (!form.subject) {
      toast.error('Please select a subject.');
      return;
    }
    
    if (!selectedFile) {
      toast.error('Please select a file to upload.');
      return;
    }

    // Validate file
    if (!validateFile(selectedFile)) {
      toast.error(error);
      return;
    }
    
    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // Progress simulation for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Sanitize file name
      const sanitizedName = selectedFile.name.replace(/[^a-zA-Z0-9.\-]/g, '_');
      const fileExt = sanitizedName.split('.').pop();
      const fileName = `tutor-resources/${user.email}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      clearInterval(progressInterval);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(fileName);

      setUploadProgress(100);

      // ✅ Fixed: educational_resources table (matches your schema)
      const { data, error: insertError } = await supabase
        .from('educational_resources')
        .insert({
          title: form.title.trim(),
          description: form.description.trim() || null,
          resource_url: publicUrl,
          subject: form.subject,
          grade: form.grade,
          caps_alignment_tag: template?.type || null,
          uploaded_by: user.email,
          uploaded_by_id: user.id || null,
          source_type: 'tutor',
          is_active: true,
          is_approved: true,  // Auto-approve for tutors
          is_premium: form.is_premium,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // ✅ Added: Activity logging for POPIA compliance
      await supabase
        .from('activity_log')
        .insert({
          event_type: 'tutor_resource_uploaded',
          user_email: user.email,
          user_id: user.id || null,
          description: `Uploaded ${template?.label || 'resource'}: ${form.title}`,
          metadata: {
            resource_id: data?.id,
            subject: form.subject,
            grade: form.grade,
            is_premium: form.is_premium,
            file_type: selectedFile.type,
            file_size: selectedFile.size
          }
        })
        .catch(() => {});

      toast.success('Resource uploaded successfully! It will now be available to students and the AI assistant.');
      setStep('choose');
      setTemplate(null);
      setSelectedFile(null);
      setError(null);
      
      if (onUploaded) onUploaded(data);
      
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload resource');
      toast.error('Failed to upload resource: ' + err.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // ============================================================
  // Form View
  // ============================================================

  if (step === 'fill' && template) {
    return (
      <Card className="border-primary/20 shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setStep('choose')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <template.icon className="w-5 h-5 text-primary" />
            <CardTitle className="text-base font-playfair">Upload {template.label}</CardTitle>
            <Badge variant="outline" className="text-[9px] text-muted-foreground flex items-center gap-1">
              <Shield className="w-3 h-3 text-green-500" /> Secure
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground ml-9">{template.description}</p>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 dark:bg-red-950/20 dark:border-red-800">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input 
                placeholder={template.fields.title_hint} 
                value={form.title} 
                onChange={e => setForm({ ...form, title: e.target.value })}
                disabled={uploading}
              />
            </div>
            
            <div className="space-y-1.5">
              <Label>Subject *</Label>
              <Select value={form.subject} onValueChange={v => setForm({ ...form, subject: v })} disabled={uploading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map(s => <SelectItem key={s.code} value={s.name}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1.5">
              <Label>Grade *</Label>
              <Select value={form.grade} onValueChange={v => setForm({ ...form, grade: v })} disabled={uploading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['Grade 10', 'Grade 11', 'Grade 12'].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Input value={template.type} disabled className="bg-muted/50 dark:bg-muted/20" />
            </div>
            
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Description / Contents</Label>
              <Textarea 
                placeholder={template.fields.desc_hint} 
                value={form.description} 
                onChange={e => setForm({ ...form, description: e.target.value })} 
                rows={3}
                disabled={uploading}
              />
            </div>
            
            <div className="space-y-1.5">
              <Label>File *</Label>
              <Input 
                type="file" 
                onChange={e => {
                  const file = e.target.files?.[0] || null;
                  setSelectedFile(file);
                  if (file) validateFile(file);
                }} 
                accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.txt"
                disabled={uploading}
              />
              {selectedFile && !error && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  ✅ {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
              {uploading && (
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                    <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground">{uploadProgress}%</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2 pt-6">
              <input 
                type="checkbox" 
                id="tpl_premium" 
                checked={form.is_premium} 
                onChange={e => setForm({ ...form, is_premium: e.target.checked })} 
                className="rounded"
                disabled={uploading}
              />
              <Label htmlFor="tpl_premium" className="cursor-pointer flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> Premium Resource
              </Label>
            </div>
          </div>
          
          <div className="flex gap-3 pt-2">
            <Button 
              onClick={handleUpload} 
              disabled={uploading || !selectedFile || !form.title || !form.subject} 
              className="bg-primary gap-2"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? `Uploading ${uploadProgress}%...` : 'Upload ' + template.label}
            </Button>
            <Button variant="outline" onClick={() => setStep('choose')} disabled={uploading}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ============================================================
  // Choose Template View
  // ============================================================

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-playfair flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" /> Upload Resource
          </CardTitle>
          <Badge variant="outline" className="text-[9px] text-muted-foreground flex items-center gap-1">
            <Shield className="w-3 h-3 text-green-500" /> Secure
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Choose a template to upload a structured resource for your students. 
          Resources will be available in the AI Study Assistant.
        </p>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {TEMPLATES.map(t => (
            <button
              key={t.key}
              onClick={() => selectTemplate(t)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-accent/30 transition-all text-center group"
            >
              <div className={`w-12 h-12 rounded-xl ${t.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <t.icon className="w-6 h-6" />
              </div>
              <span className="text-sm font-semibold">{t.label}</span>
              <span className="text-[10px] text-muted-foreground leading-tight line-clamp-2">{t.description}</span>
            </button>
          ))}
        </div>
        
        {/* Info box */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-950/20 dark:border-blue-800">
          <p className="text-[10px] text-blue-700 dark:text-blue-300 flex items-center gap-1">
            <Lightbulb className="w-3 h-3" />
            💡 Resources uploaded here are automatically available to students and power the AI Study Assistant.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
