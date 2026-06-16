import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { SUBJECTS } from '@/lib/subjects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileText, BookOpen, ClipboardList, Lightbulb, Star, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const TEMPLATES = [
  {
    key: 'lesson_notes',
    label: 'Lesson Notes',
    icon: BookOpen,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    type: 'Notes',
    description: 'Structured notes covering a specific topic or chapter, with key concepts highlighted.',
    fields: { title_hint: 'e.g. Gr12 Maths – Differential Calculus Notes', desc_hint: 'Key concepts: limits, first principles, differentiation rules…' },
  },
  {
    key: 'practice_paper',
    label: 'Practice Paper',
    icon: ClipboardList,
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    type: 'Past Paper',
    description: 'Question paper with or without a memo, formatted like a test or exam.',
    fields: { title_hint: 'e.g. Gr11 Physical Sciences – June Test Paper 1', desc_hint: 'Sections: Multiple choice (Q1-10), Structured (Q11-15). Includes memo.' },
  },
  {
    key: 'study_guide',
    label: 'Study Guide',
    icon: Lightbulb,
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    type: 'Summary',
    description: 'Comprehensive revision guide summarising an entire term or exam scope.',
    fields: { title_hint: 'e.g. Gr10 Life Sciences – Term 2 Study Guide', desc_hint: 'Covers: Plant & animal tissues, support systems, transport systems…' },
  },
  {
    key: 'worksheet',
    label: 'Worksheet',
    icon: FileText,
    color: 'bg-green-100 text-green-700 border-green-200',
    type: 'Worksheet',
    description: 'Targeted practice exercises on a specific sub-topic with worked examples.',
    fields: { title_hint: 'e.g. Gr12 Accounting – Cash Flow Statement Worksheet', desc_hint: '10 exercises progressing from easy to exam-level difficulty.' },
  },
];

export default function ResourceTemplateUploader({ user, onUploaded }) {
  const [step, setStep] = useState('choose');
  const [template, setTemplate] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [form, setForm] = useState({
    title: '', subject: '', grade: 'Grade 12', description: '', is_premium: false,
  });

  const selectTemplate = (t) => {
    setTemplate(t);
    setForm({ title: '', subject: '', grade: 'Grade 12', description: '', is_premium: false });
    setSelectedFile(null);
    setStep('fill');
  };

  const handleUpload = async () => {
    if (!form.title || !form.subject || !selectedFile) {
      toast.error('Please fill in all required fields and select a file.');
      return;
    }

    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error('Please upload a PDF, DOCX, PNG, or JPG file.');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 10MB.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const interval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `tutor-resources/${user.email}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('tutor-resources')
        .upload(fileName, selectedFile);

      clearInterval(interval);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('tutor-resources')
        .getPublicUrl(fileName);

      setUploadProgress(100);

      // Save to unified_resources table
      const { error: insertError } = await supabase
        .from('unified_resources')
        .insert({
          title: form.title,
          description: form.description,
          file_url: publicUrl,
          subject: form.subject,
          grade: form.grade,
          source_type: 'tutor',
          uploaded_by: user.email,
          is_active: true,
          is_premium: form.is_premium,
        });

      if (insertError) throw insertError;

      toast.success('Resource uploaded successfully! It will now be available to students and the AI assistant.');
      setStep('choose');
      setTemplate(null);
      setSelectedFile(null);
      onUploaded?.();
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload resource: ' + error.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

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
          </div>
          <p className="text-xs text-muted-foreground ml-9">{template.description}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input placeholder={template.fields.title_hint} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Subject *</Label>
              <Select value={form.subject} onValueChange={v => setForm({ ...form, subject: v })}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map(s => <SelectItem key={s.code} value={s.name}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Grade *</Label>
              <Select value={form.grade} onValueChange={v => setForm({ ...form, grade: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Grade 10', 'Grade 11', 'Grade 12'].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Input value={template.type} disabled className="bg-muted/50" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Description / Contents</Label>
              <Textarea placeholder={template.fields.desc_hint} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label>File *</Label>
              <Input type="file" onChange={e => setSelectedFile(e.target.files[0] || null)} accept=".pdf,.docx,.png,.jpg" />
              {selectedFile && <p className="text-xs text-muted-foreground">{selectedFile.name}</p>}
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
              <input type="checkbox" id="tpl_premium" checked={form.is_premium} onChange={e => setForm({ ...form, is_premium: e.target.checked })} className="rounded" />
              <Label htmlFor="tpl_premium" className="cursor-pointer flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> Premium Resource
              </Label>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button onClick={handleUpload} disabled={uploading} className="bg-primary gap-2">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? `Uploading ${uploadProgress}%...` : 'Upload ' + template.label}
            </Button>
            <Button variant="outline" onClick={() => setStep('choose')}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-playfair flex items-center gap-2">
          <Upload className="w-5 h-5 text-primary" /> Upload Resource — Choose a Template
        </CardTitle>
        <p className="text-xs text-muted-foreground">Select a template to upload a structured resource for your students. These resources will also power the AI Study Assistant.</p>
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
              <span className="text-[10px] text-muted-foreground leading-tight">{t.description.slice(0, 60)}…</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}