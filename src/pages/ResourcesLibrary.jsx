import {StudyPackLinks} from './StudyPacks';
import { useAuth } from '@/lib/AuthContext';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, Search, BookOpen, Loader2, Archive, X, ChevronDown, ChevronUp, Clock, Sparkles, Star, Bookmark, Grid3x3, List, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import CAPSDocRating from '@/components/resources/CAPSDocRating';
const CONFIG = {
  SUBJECTS: (import.meta.env.VITE_CAPS_SUBJECTS || 'All Subjects,Mathematics,Mathematical Literacy,Physical Sciences,Life Sciences,Geography,History,Accounting,Business Studies,Economics,English Home Language,Life Orientation').split(',').map(s => s.trim()),
  GRADES: (import.meta.env.VITE_CAPS_GRADES || 'All Grades,Grade 10,Grade 11,Grade 12').split(',').map(g => g.trim()),
  DOC_TYPES: (import.meta.env.VITE_CAPS_DOC_TYPES || 'All Types,CAPS,ATP,Revised ATP,DBE Workbook,LTSM Catalogue,Study Guide,Guidelines').split(',').map(t => t.trim()),
  TYPE_COLORS: {
    'CAPS': import.meta.env.VITE_CAPS_COLOR_CAPS || 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400',
    'ATP': import.meta.env.VITE_CAPS_COLOR_ATP || 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
    'Revised ATP': import.meta.env.VITE_CAPS_COLOR_REVISED_ATP || 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-400',
    'DBE Workbook': import.meta.env.VITE_CAPS_COLOR_DBE || 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
    'LTSM Catalogue': import.meta.env.VITE_CAPS_COLOR_LTSM || 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400',
    'Study Guide': import.meta.env.VITE_CAPS_COLOR_STUDY_GUIDE || 'bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400',
    'Guidelines': import.meta.env.VITE_CAPS_COLOR_GUIDELINES || 'bg-pink-100 text-pink-700 dark:bg-pink-950/30 dark:text-pink-400'
  },
  RESULTS_LIMIT: Number(import.meta.env.VITE_CAPS_RESULTS_LIMIT) || 500,
  ZIP_MAX_DOCS: Number(import.meta.env.VITE_CAPS_ZIP_MAX_DOCS) || 20,
  ENABLE_ZIP_DOWNLOAD: import.meta.env.VITE_CAPS_ENABLE_ZIP_DOWNLOAD !== 'false',
  ENABLE_RATINGS: import.meta.env.VITE_CAPS_ENABLE_RATINGS !== 'false',
  MESSAGES: {
    LOAD_FAILED: import.meta.env.VITE_CAPS_LOAD_FAILED_MSG || 'Failed to load documents. Please try again.',
    ZIP_TOO_MANY: import.meta.env.VITE_CAPS_ZIP_TOO_MANY_MSG || 'Too many documents to ZIP at once. Please narrow your filters to under {max} documents.',
    ZIP_PREPARING: import.meta.env.VITE_CAPS_ZIP_PREPARING_MSG || 'Preparing ZIP file, please wait…',
    ZIP_SUCCESS: import.meta.env.VITE_CAPS_ZIP_SUCCESS_MSG || 'ZIP downloaded successfully!',
    ZIP_FAILED: import.meta.env.VITE_CAPS_ZIP_FAILED_MSG || 'ZIP download failed. Please try again.',
    NO_DOCUMENTS: import.meta.env.VITE_CAPS_NO_DOCUMENTS_MSG || 'No documents match the current filters.',
    DOWNLOAD_SUCCESS: import.meta.env.VITE_CAPS_DOWNLOAD_SUCCESS_MSG || 'Download started!',
    DOWNLOAD_FAILED: import.meta.env.VITE_CAPS_DOWNLOAD_FAILED_MSG || 'Failed to download document.',
    FREE_RESOURCES: import.meta.env.VITE_CAPS_FREE_RESOURCES_MSG || 'SmartBridge guides are original study supplements. Official DBE curriculum documents are listed separately below. Both collections are free to download.'
  }
};
function DocumentCard({
  doc,
  onDownload,
  user
}) {
  const [expanded, setExpanded] = useState(false);
  const colorClass = CONFIG.TYPE_COLORS[doc.document_type] || 'bg-muted text-muted-foreground';
  return <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 border-border">
      <CardContent className="py-4 px-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm leading-snug">{doc.title}</p>
                {doc.description && <div className="mt-0.5">
                    <button onClick={() => setExpanded(!expanded)} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5">
                      {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {expanded ? 'Show less' : 'Show more'}
                    </button>
                    {expanded && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{doc.description}</p>}
                  </div>}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <Badge className={`text-xs border-0 ${colorClass}`}>
                    {doc.document_type}
                  </Badge>
                  <Badge variant="outline" className="text-xs">{doc.grade}</Badge>
                  {doc.year && <Badge variant="secondary" className="text-xs">{doc.year}</Badge>}
                  {doc.official_doc_number && <Badge variant="outline" className="text-xs text-muted-foreground">#{doc.official_doc_number}</Badge>}
                  {doc.is_featured && <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]">
                      <Star className="w-2.5 h-2.5 fill-current" /> Featured
                    </Badge>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <Button size="sm" className="gap-1.5 bg-primary hover:bg-primary/90 h-8 text-xs" onClick={() => onDownload(doc)}>
                  <Download className="w-3.5 h-3.5" /> Download
                </Button>
                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                  <Download className="w-2.5 h-2.5" /> {doc.download_count || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
        {CONFIG.ENABLE_RATINGS && <CAPSDocRating docId={doc.id} user={user} />}
      </CardContent>
    </Card>;
}
export default function ResourcesLibrary() {
  const {
    user
  } = useAuth() || {};
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSubject, setFilterSubject] = useState('All Subjects');
  const [filterGrade, setFilterGrade] = useState('All Grades');
  const [filterType, setFilterType] = useState('All Types');
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const loadDocs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from('caps_documents').select('*').order('created_at', {
        ascending: false
      });
      if (filterSubject !== 'All Subjects') {
        query = query.eq('subject', filterSubject);
      }
      if (filterGrade !== 'All Grades') {
        query = query.eq('grade', filterGrade);
      }
      if (filterType !== 'All Types') {
        query = query.eq('document_type', filterType);
      }
      if (search.trim()) {
        query = query.ilike('title', `%${search.trim()}%`);
      }
      const {
        data,
        error: fetchError
      } = await query.limit(CONFIG.RESULTS_LIMIT);
      if (fetchError) throw fetchError;
      setDocs(data || []);
    } catch (err) {
      console.error('Error loading CAPS documents:', err);
      setError(CONFIG.MESSAGES.LOAD_FAILED);
      toast.error(CONFIG.MESSAGES.LOAD_FAILED);
    } finally {
      setLoading(false);
    }
  }, [filterSubject, filterGrade, filterType, search]);
  useEffect(() => {
    loadDocs();
  }, [loadDocs]);
  const handleDownload = async doc => {
    try {
      await supabase.from('caps_documents').update({
        download_count: (doc.download_count || 0) + 1
      }).eq('id', doc.id);
      window.open(doc.file_url, '_blank');
      toast.success(CONFIG.MESSAGES.DOWNLOAD_SUCCESS);
    } catch (err) {
      console.error('Download error:', err);
      toast.error(CONFIG.MESSAGES.DOWNLOAD_FAILED);
    }
  };
  const handleDownloadAll = async () => {
    if (!CONFIG.ENABLE_ZIP_DOWNLOAD) {
      toast.warning('ZIP download is currently disabled.');
      return;
    }
    const subject = filterSubject === 'All Subjects' ? 'all' : filterSubject;
    const grade = filterGrade === 'All Grades' ? 'all' : filterGrade;
    const document_type = filterType === 'All Types' ? 'all' : filterType;
    if (filtered.length === 0) {
      toast.error(CONFIG.MESSAGES.NO_DOCUMENTS);
      return;
    }
    if (filtered.length > CONFIG.ZIP_MAX_DOCS) {
      toast.error(CONFIG.MESSAGES.ZIP_TOO_MANY.replace('{max}', CONFIG.ZIP_MAX_DOCS));
      return;
    }
    setDownloading(true);
    toast.info(CONFIG.MESSAGES.ZIP_PREPARING);
    try {
      const {
        data,
        error: functionError
      } = await supabase.functions.invoke('download-caps-zip', {
        body: {
          subject,
          grade,
          document_type
        }
      });
      if (functionError) throw functionError;
      if (data) {
        const blob = new Blob([data], {
          type: 'application/zip'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CAPS_Documents_${subject === 'all' ? 'All' : subject}_${new Date().toISOString().split('T')[0]}.zip`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(CONFIG.MESSAGES.ZIP_SUCCESS);
      }
    } catch (err) {
      console.error('ZIP download error:', err);
      toast.error(CONFIG.MESSAGES.ZIP_FAILED + ' ' + (err.message || ''));
    } finally {
      setDownloading(false);
    }
  };
  const clearFilters = () => {
    setSearch('');
    setFilterSubject('All Subjects');
    setFilterGrade('All Grades');
    setFilterType('All Types');
  };
  const hasFilters = search.trim() || filterSubject !== 'All Subjects' || filterGrade !== 'All Grades' || filterType !== 'All Types';
  const filtered = docs;
  const grouped = filtered.reduce((acc, doc) => {
    const key = doc.subject || 'Uncategorized';
    if (!acc[key]) acc[key] = [];
    acc[key].push(doc);
    return acc;
  }, {});
  const totalDownloads = filtered.reduce((sum, doc) => sum + (doc.download_count || 0), 0);
  return <div className="min-h-screen bg-background py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-md">
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-playfair text-3xl font-bold">Resource Library</h1>
              <p className="text-muted-foreground text-sm">
                SmartBridge study guides and official curriculum references
              </p>
            </div>
            <Badge className="ml-auto bg-green-100 text-green-700 border-green-200 text-xs gap-1">
              <Sparkles className="w-3 h-3" /> {filtered.length} documents
            </Badge>
          </div>
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl text-sm text-green-800 dark:text-green-400 flex items-center gap-2">
            <Bookmark className="w-4 h-4 flex-shrink-0" />
            {CONFIG.MESSAGES.FREE_RESOURCES}
          </div>
        </div>

        {}
        <StudyPackLinks />
        <Card className="mb-6 border-border shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search documents…" className="pl-9 pr-9" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadDocs()} aria-label="Search documents" />
                {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Clear search">
                    <X className="w-4 h-4" />
                  </button>}
              </div>
              <Select value={filterSubject} onValueChange={setFilterSubject}>
                <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
                <SelectContent>
                  {CONFIG.SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterGrade} onValueChange={setFilterGrade}>
                <SelectTrigger><SelectValue placeholder="Grade" /></SelectTrigger>
                <SelectContent>
                  {CONFIG.GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  {CONFIG.DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <p className="text-sm text-muted-foreground">
                  {filtered.length} document{filtered.length !== 1 ? 's' : ''} found
                </p>
                {totalDownloads > 0 && <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                    <Download className="w-3 h-3" /> {totalDownloads} total downloads
                  </span>}
                {hasFilters && <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs gap-1">
                    <X className="w-3 h-3" /> Clear
                  </Button>}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant={viewMode === 'list' ? 'default' : 'ghost'} onClick={() => setViewMode('list')} className="h-7 w-7 p-0" aria-label="List view">
                  <List className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant={viewMode === 'grid' ? 'default' : 'ghost'} onClick={() => setViewMode('grid')} className="h-7 w-7 p-0" aria-label="Grid view">
                  <Grid3x3 className="w-3.5 h-3.5" />
                </Button>
                {CONFIG.ENABLE_ZIP_DOWNLOAD && filtered.length > 0 && <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleDownloadAll} disabled={downloading || filtered.length === 0 || filtered.length > CONFIG.ZIP_MAX_DOCS}>
                    {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5" />}
                    Download All ({filtered.length})
                  </Button>}
              </div>
            </div>

            {error && <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2 text-xs text-red-700 dark:text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
                <Button variant="ghost" size="sm" onClick={loadDocs} className="h-6 text-xs ml-auto">
                  <RefreshCw className="w-3 h-3 mr-1" /> Retry
                </Button>
              </div>}
          </CardContent>
        </Card>

        {}
        {loading ? <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div> : filtered.length === 0 ? <div className="text-center py-16 text-muted-foreground">
            <FileText className="w-14 h-14 mx-auto mb-4 opacity-30" />
            <p className="font-semibold text-lg">No documents found</p>
            <p className="text-sm mt-1">
              {hasFilters ? 'Try adjusting your filters or search term.' : 'Check back soon for new documents.'}
            </p>
            {hasFilters && <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4">
                Clear Filters
              </Button>}
          </div> : <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-3'}>
            {Object.entries(grouped).map(([subject, subjectDocs]) => <div key={subject} className={viewMode === 'grid' ? 'col-span-full' : ''}>
                <h2 className="font-playfair text-lg font-bold mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  {subject}
                  <span className="text-sm font-normal text-muted-foreground">({subjectDocs.length})</span>
                </h2>
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 gap-3' : 'space-y-3'}>
                  {subjectDocs.map(doc => <DocumentCard key={doc.id} doc={doc} onDownload={handleDownload} user={user} />)}
                </div>
              </div>)}
          </div>}

        {}
        {!loading && filtered.length > 0 && <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-muted-foreground border-t border-border pt-4">
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {filtered.length} documents
            </span>
            <span className="flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              {Object.keys(grouped).length} subjects
            </span>
            <span className="flex items-center gap-1">
              <Download className="w-3 h-3" />
              {totalDownloads} total downloads
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Updated: {new Date().toLocaleDateString('en-ZA')}
            </span>
          </div>}
      </div>
    </div>;
}
