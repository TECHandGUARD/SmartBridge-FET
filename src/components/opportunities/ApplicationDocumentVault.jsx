import { uploadPrivate, removePrivate } from '@/lib/private-storage';
import FileLink from '@/components/operations/FileLink';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Upload, File, Trash2, CheckCircle2, Clock, XCircle, AlertCircle, ChevronDown, ChevronUp, FolderOpen, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
const DOC_TYPES = ["ID Copy", "Matric Certificate", "Proof of Payment", "NBT Results", "Academic Transcript", "Motivation Letter", "Reference Letter", "Other"];
const STATUS_CONFIG = {
  uploaded: {
    label: "Uploaded",
    icon: <Clock className="w-3 h-3" />,
    color: "bg-blue-100 text-blue-700"
  },
  submitted: {
    label: "Submitted",
    icon: <CheckCircle2 className="w-3 h-3" />,
    color: "bg-purple-100 text-purple-700"
  },
  verified: {
    label: "Verified",
    icon: <CheckCircle2 className="w-3 h-3" />,
    color: "bg-green-100 text-green-700"
  },
  rejected: {
    label: "Rejected",
    icon: <XCircle className="w-3 h-3" />,
    color: "bg-red-100 text-red-700"
  }
};
const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const STORAGE_BUCKET = import.meta.env.VITE_STORAGE_BUCKET || 'application_documents';
const appName = import.meta.env.VITE_APP_NAME || 'SmartBridge FET';
function DocTypeRow({
  docType,
  doc,
  appId,
  studentEmail,
  universityName,
  onRefresh
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileRef = useRef(null);
  const handleUpload = async e => {
    const file = e.target.files[0];
    if (!file) return;
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast.error('Please upload PDF, JPG, or PNG files only.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File too large. Maximum size is 5MB.');
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 10, 90));
    }, 200);
    try {
      const uploaded = await uploadPrivate(supabase, 'application_documents', file);
      const publicUrl = uploaded.reference;
      clearInterval(progressInterval);
      setUploadProgress(100);
      if (doc) {
        const {
          error: updateError
        } = await supabase.from('application_documents').update({
          file_url: publicUrl,
          file_name: file.name,
          status: 'uploaded',
          updated_at: new Date().toISOString()
        }).eq('id', doc.id);
        if (updateError) throw updateError;
      } else {
        const {
          error: insertError
        } = await supabase.from('application_documents').insert({
          application_id: appId,
          student_email: uploaded.actor.email,
          student_id: uploaded.actor.id,
          university_name: universityName,
          doc_type: docType,
          file_url: publicUrl,
          file_name: file.name,
          status: 'uploaded',
          created_at: new Date().toISOString()
        });
        if (insertError) throw insertError;
      }
      toast.success(`${docType} uploaded successfully!`);
      onRefresh();
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(`Failed to upload: ${err.message}`);
    } finally {
      clearInterval(progressInterval);
      setUploading(false);
      setUploadProgress(0);
    }
  };
  const handleDelete = async () => {
    if (!doc) return;
    try {
      await removePrivate(supabase, doc.file_url);
      const {
        error
      } = await supabase.from('application_documents').delete().eq('id', doc.id);
      if (error) throw error;
      toast.success(`${docType} deleted successfully!`);
      onRefresh();
    } catch (err) {
      console.error('Delete error:', err);
      toast.error(`Failed to delete: ${err.message}`);
    }
  };
  const statusCfg = doc ? STATUS_CONFIG[doc.status] : null;
  const isRejected = doc?.status === 'rejected';
  const isVerified = doc?.status === 'verified';
  return <div className={`py-1.5 border-b border-border/50 last:border-0 ${isRejected ? 'bg-red-50/50 rounded-lg px-1' : ''}`}>
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <File className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-xs font-medium text-foreground truncate">{docType}</span>
          </div>
          {doc?.file_name && <div className="text-[10px] text-muted-foreground truncate ml-5">{doc.file_name}</div>}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {statusCfg ? <Badge className={`text-[10px] flex items-center gap-0.5 px-1.5 py-0 ${statusCfg.color}`}>
              {statusCfg.icon} {statusCfg.label}
            </Badge> : <Badge className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0">Missing</Badge>}

          {doc && <FileLink reference={doc.file_url} className="text-[10px] text-primary hover:underline font-medium">View</FileLink>}

          {!isVerified && <button onClick={() => fileRef.current?.click()} disabled={uploading} className={`flex items-center gap-1 text-[10px] font-medium disabled:opacity-50 ${isRejected ? 'text-red-600 hover:text-red-800 font-semibold' : 'text-primary hover:text-primary/80'}`}>
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
              {uploading ? `${uploadProgress}%` : isRejected ? 'Re-upload' : doc ? 'Replace' : 'Upload'}
            </button>}
          <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleUpload} />

          {doc && !isVerified && <button onClick={handleDelete} className="text-destructive/60 hover:text-destructive">
              <Trash2 className="w-3 h-3" />
            </button>}
        </div>
      </div>
      {isRejected && doc?.notes && <div className="ml-5 mt-1 text-[10px] text-red-600 flex items-start gap-1">
          <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
          <span>{doc.notes}</span>
        </div>}
      {isRejected && !doc?.notes && <div className="ml-5 mt-1 text-[10px] text-red-600">Please re-upload this document — it was rejected by your counselor.</div>}
    </div>;
}
export default function ApplicationDocumentVault({
  app
}) {
  const [docs, setDocs] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const loadDocs = async () => {
    if (!app?.id) return;
    setLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.from('application_documents').select('*').eq('application_id', app.id).order('created_at', {
        ascending: true
      });
      if (error) throw error;
      setDocs(data || []);
    } catch (err) {
      console.error('Failed to load documents:', err);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (open) loadDocs();
  }, [open, app?.id]);
  const uploadedCount = DOC_TYPES.filter(dt => docs.find(d => d.doc_type === dt)).length;
  return <div className="border-t border-border/50">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">Document Vault</span>
          <Badge className={`text-[10px] px-1.5 py-0 ${uploadedCount === DOC_TYPES.length ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
            {uploadedCount}/{DOC_TYPES.length}
          </Badge>
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>

      {open && <div className="px-4 pb-3">
          {loading ? <div className="flex justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            </div> : <div>
              <p className="text-[10px] text-muted-foreground mb-2">
                Upload required documents for {app.university_name}. Accepted: PDF, JPG, PNG (Max 5MB).
              </p>
              {DOC_TYPES.map(dt => <DocTypeRow key={dt} docType={dt} doc={docs.find(d => d.doc_type === dt) || null} appId={app.id} studentEmail={app.student_email} universityName={app.university_name} onRefresh={loadDocs} />)}
            </div>}
        </div>}
    </div>;
}
