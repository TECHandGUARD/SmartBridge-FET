import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2, XCircle, Clock, Eye, File, SlidersHorizontal,
  RefreshCw, ChevronDown, ChevronUp, MessageSquare
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const STATUS_CONFIG = {
  uploaded:  { label: 'Pending Review', color: 'bg-blue-100 text-blue-700',   icon: <Clock className="w-3 h-3" /> },
  submitted: { label: 'Submitted',      color: 'bg-purple-100 text-purple-700', icon: <Clock className="w-3 h-3" /> },
  verified:  { label: 'Verified',       color: 'bg-green-100 text-green-700',  icon: <CheckCircle2 className="w-3 h-3" /> },
  rejected:  { label: 'Rejected',       color: 'bg-red-100 text-red-700',      icon: <XCircle className="w-3 h-3" /> },
};

function DocRow({ doc, onAction }) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const cfg = STATUS_CONFIG[doc.status] || STATUS_CONFIG.uploaded;

  const handleAction = async (action) => {
    if (!doc.id) return;
    setLoading(true);
    try {
      await onAction(doc.id, action, notes);
      setExpanded(false);
      setNotes('');
    } catch (err) {
      console.error('Action failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const isPending = doc.status === 'uploaded' || doc.status === 'submitted';

  return (
    <div className="border rounded-xl overflow-hidden mb-2">
      <div className="flex items-start gap-3 p-3">
        <File className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">{doc.doc_type || 'Document'}</span>
            <Badge className={`text-[10px] flex items-center gap-0.5 px-1.5 py-0 ${cfg.color}`}>
              {cfg.icon} {cfg.label}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            <span className="font-medium">{doc.student_email || 'Unknown'}</span>
            {doc.university_name && ` · ${doc.university_name}`}
          </p>
          {doc.file_name && <p className="text-[10px] text-muted-foreground">{doc.file_name}</p>}
          {doc.notes && (
            <p className="text-xs text-muted-foreground mt-1 italic">Note: {doc.notes}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {doc.file_url && (
            <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
              <Button size="icon" variant="ghost" className="h-7 w-7">
                <Eye className="w-3.5 h-3.5" />
              </Button>
            </a>
          )}
          {isPending && (
            <Button
              size="icon" 
              variant="ghost"
              className="h-7 w-7"
              onClick={() => setExpanded(e => !e)}
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </Button>
          )}
          {!isPending && doc.status === 'verified' && (
            <div className="h-7 w-7 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
            </div>
          )}
          {!isPending && doc.status === 'rejected' && (
            <div className="h-7 w-7 flex items-center justify-center">
              <XCircle className="w-3.5 h-3.5 text-red-500" />
            </div>
          )}
        </div>
      </div>

      {expanded && isPending && (
        <div className="border-t bg-muted/20 p-3 space-y-2">
          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
            <MessageSquare className="w-3 h-3" /> Reviewer note (optional — sent to student)
          </div>
          <textarea
            className="w-full rounded-lg border border-border bg-background text-xs px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            rows={2}
            placeholder="e.g. Document is blurry, please re-upload a clearer scan..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 h-8 text-xs gap-1.5 bg-green-600 hover:bg-green-700"
              disabled={loading}
              onClick={() => handleAction('approved')}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {loading ? 'Processing...' : 'Approve & Notify'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-8 text-xs gap-1.5 border-red-300 text-red-600 hover:bg-red-50"
              disabled={loading}
              onClick={() => handleAction('rejected')}
            >
              <XCircle className="w-3.5 h-3.5" />
              {loading ? 'Processing...' : 'Reject & Notify'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DocumentVerificationPanel() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const { toast } = useToast();

  const loadDocs = useCallback(async () => {
    setLoading(true);
    try {
      // Load application_documents from Supabase
      const { data, error } = await supabase
        .from('application_documents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      
      if (error) throw error;
      setDocs(data || []);
    } catch (err) {
      console.error('Failed to load documents:', err);
      toast({
        title: 'Error Loading Documents',
        description: err.message || 'Failed to load documents',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { 
    loadDocs(); 
  }, [loadDocs]);

  const handleAction = useCallback(async (docId, action, notes) => {
    if (!docId) {
      toast({
        title: 'Error',
        description: 'Invalid document ID',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Call Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('notify-document-status', {
        body: {
          doc_id: docId,
          action,
          reviewer_notes: notes || '',
        }
      });
      
      if (error) throw error;
      
      if (data?.success) {
        toast({
          title: action === 'approved' ? 'Document Approved' : 'Document Rejected',
          description: data.notified ? `Student notified at ${data.notified}` : 'Status updated successfully',
        });
        // Reload to get updated status
        await loadDocs();
      } else {
        throw new Error(data?.message || 'Action failed');
      }
    } catch (err) {
      console.error('Action error:', err);
      toast({
        title: 'Action Failed',
        description: err.message || 'Failed to process document',
        variant: 'destructive',
      });
      throw err; // Re-throw so DocRow knows it failed
    }
  }, [toast, loadDocs]);

  const filtered = docs.filter(d => {
    if (filter === 'pending') return d.status === 'uploaded' || d.status === 'submitted';
    if (filter === 'verified') return d.status === 'verified';
    if (filter === 'rejected') return d.status === 'rejected';
    return true;
  });

  const pendingCount = docs.filter(d => d.status === 'uploaded' || d.status === 'submitted').length;

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-playfair text-base flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-primary" />
            Document Verification
            {pendingCount > 0 && (
              <Badge className="bg-amber-100 text-amber-700 text-xs px-1.5">
                {pendingCount} pending
              </Badge>
            )}
          </CardTitle>
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-8 w-8" 
            onClick={loadDocs}
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Review student documents and send automatic notifications on approval or rejection.
        </p>

        {/* Filter tabs */}
        <div className="flex gap-1.5 mt-2">
          {[
            { key: 'pending', label: 'Pending' },
            { key: 'verified', label: 'Approved' },
            { key: 'rejected', label: 'Rejected' },
            { key: 'all', label: 'All' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                filter === f.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <File className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">
              {filter === 'pending' 
                ? 'No documents awaiting review.' 
                : filter === 'verified'
                ? 'No approved documents.'
                : filter === 'rejected'
                ? 'No rejected documents.'
                : 'No documents found.'}
            </p>
          </div>
        ) : (
          <div>
            {filtered.map(doc => (
              <DocRow key={doc.id} doc={doc} onAction={handleAction} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}