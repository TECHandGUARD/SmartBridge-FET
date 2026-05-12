import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, Search, BookOpen, Loader2, Archive } from 'lucide-react';
import { toast } from 'sonner';
import CAPSDocRating from '@/components/resources/CAPSDocRating';

const SUBJECTS = [
  'All Subjects', 'Mathematics', 'Mathematical Literacy', 'Physical Sciences', 'Life Sciences',
  'Geography', 'History', 'Accounting', 'Business Studies', 'Economics',
  'English Home Language', 'Life Orientation'
];
const GRADES = ['All Grades', 'Grade 10', 'Grade 11', 'Grade 12'];
const DOC_TYPES = ['All Types', 'CAPS', 'ATP', 'Revised ATP', 'DBE Workbook', 'LTSM Catalogue', 'Study Guide', 'Guidelines'];

const TYPE_COLORS = {
  'CAPS': 'bg-green-100 text-green-700',
  'ATP': 'bg-blue-100 text-blue-700',
  'Revised ATP': 'bg-cyan-100 text-cyan-700',
  'DBE Workbook': 'bg-amber-100 text-amber-700',
  'LTSM Catalogue': 'bg-purple-100 text-purple-700',
  'Study Guide': 'bg-orange-100 text-orange-700',
  'Guidelines': 'bg-pink-100 text-pink-700',
};

export default function ResourcesLibrary() {
  const { user } = useOutletContext() || {};
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSubject, setFilterSubject] = useState('All Subjects');
  const [filterGrade, setFilterGrade] = useState('All Grades');
  const [filterType, setFilterType] = useState('All Types');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('caps_documents')
        .select('*')
        .eq('is_public', true)
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

  const handleDownload = async (doc) => {
    // Increment download count
    try {
      await supabase
        .from('caps_documents')
        .update({ download_count: (doc.download_count || 0) + 1 })
        .eq('id', doc.id);
    } catch (error) {
      console.error('Error updating download count:', error);
    }
    window.open(doc.file_url, '_blank');
  };

  const handleDownloadAll = async () => {
    const subject = filterSubject === 'All Subjects' ? 'all' : filterSubject;
    const grade = filterGrade === 'All Grades' ? 'all' : filterGrade;
    const document_type = filterType === 'All Types' ? 'all' : filterType;

    if (filtered.length === 0) { toast.error('No documents match the current filters.'); return; }
    if (filtered.length > 20) { toast.error('Too many documents to download at once. Please narrow your filters to under 20 documents.'); return; }

    setDownloading(true);
    toast.info('Preparing download, please wait…');
    
    try {
      // Create a ZIP file from all filtered documents (simplified - downloads individually)
      // Note: For a true ZIP, you'd need a server-side function
      // This is a simplified version that downloads each file individually
      for (const doc of filtered) {
        window.open(doc.file_url, '_blank');
        // Small delay to prevent browser blocking
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      toast.success(`Downloaded ${filtered.length} documents`);
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Download failed: ' + (err.message || 'Unknown error'));
    } finally {
      setDownloading(false);
    }
  };

  const filtered = docs.filter(doc => {
    const matchSearch = !search || doc.title.toLowerCase().includes(search.toLowerCase()) || doc.description?.toLowerCase().includes(search.toLowerCase());
    const matchSubject = filterSubject === 'All Subjects' || doc.subject === filterSubject || doc.subject === 'All Subjects';
    const matchGrade = filterGrade === 'All Grades' || doc.grade === filterGrade || doc.grade === 'All Grades';
    const matchType = filterType === 'All Types' || doc.document_type === filterType;
    return matchSearch && matchSubject && matchGrade && matchType;
  });

  // Group by subject for display
  const grouped = filtered.reduce((acc, doc) => {
    const key = doc.subject;
    if (!acc[key]) acc[key] = [];
    acc[key].push(doc);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-playfair text-3xl font-bold">Official CAPS Resource Library</h1>
              <p className="text-muted-foreground text-sm">Official DBE curriculum documents — free for all users</p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
            📄 All documents are official South African DBE publications. Free to download — no premium required.
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-4 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents…"
                  className="pl-9"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <Select value={filterSubject} onValueChange={setFilterSubject}>
                <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
                <SelectContent>{SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={filterGrade} onValueChange={setFilterGrade}>
                <SelectTrigger><SelectValue placeholder="Grade" /></SelectTrigger>
                <SelectContent>{GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>{DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between mt-3">
              <p className="text-sm text-muted-foreground">{filtered.length} document{filtered.length !== 1 ? 's' : ''} found</p>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={handleDownloadAll}
                disabled={downloading || filtered.length === 0}
              >
                {downloading
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Archive className="w-3.5 h-3.5" />}
                Download All ({filtered.length})
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Documents */}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No documents found</p>
            <p className="text-sm mt-1">Try adjusting your filters or search term.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([subject, subjectDocs]) => (
              <div key={subject}>
                <h2 className="font-playfair text-lg font-bold mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  {subject}
                  <span className="text-sm font-normal text-muted-foreground">({subjectDocs.length})</span>
                </h2>
                <div className="grid gap-3">
                  {subjectDocs.map(doc => (
                    <Card key={doc.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="py-4 px-5">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm leading-snug">{doc.title}</p>
                            {doc.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{doc.description}</p>}
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              <Badge className={`text-xs border-0 ${TYPE_COLORS[doc.document_type] || 'bg-muted text-muted-foreground'}`}>
                                {doc.document_type}
                              </Badge>
                              <Badge variant="outline" className="text-xs">{doc.grade}</Badge>
                              {doc.year && <Badge variant="secondary" className="text-xs">{doc.year}</Badge>}
                              {doc.official_number && (
                                <Badge variant="outline" className="text-xs text-muted-foreground">#{doc.official_number}</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                            <Button size="sm" className="gap-1.5 bg-primary h-8 text-xs" onClick={() => handleDownload(doc)}>
                              <Download className="w-3.5 h-3.5" /> Download
                            </Button>
                            <span className="text-xs text-muted-foreground">{doc.download_count || 0} downloads</span>
                          </div>
                        </div>
                        <CAPSDocRating docId={doc.id} user={user} />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}