// src/pages/VideoLessons.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from 'react-router-dom';
import {
  Play, Upload, Search, Lock, Star, Clock, Eye, Plus, Loader2, X, CheckCircle,
  Filter, Grid3x3, List, AlertCircle, RefreshCw, Sparkles, Award,
  TrendingUp, Calendar, User, BookOpen, FileVideo, Zap, Heart
} from 'lucide-react';
import PremiumBadge from '@/components/ui/PremiumBadge';
import usePremiumAccess from '@/hooks/usePremiumAccess';
import TrialBanner from '@/components/ui/TrialBanner';
import { SUBJECTS } from '@/lib/subjects';
import { toast } from 'sonner';

// ============================================================
// 🔧 SOFT-CODED CONFIGURATION
// ============================================================

const CONFIG = {
  // Storage
  STORAGE_BUCKET: import.meta.env.VITE_VIDEO_STORAGE_BUCKET || 'video-lessons',

  // Allowed file types
  ALLOWED_VIDEO_TYPES: (import.meta.env.VITE_ALLOWED_VIDEO_TYPES || 'video/mp4,video/quicktime,video/webm')
    .split(',').map(t => t.trim()),

  // Max file size (MB)
  MAX_VIDEO_SIZE_MB: Number(import.meta.env.VITE_MAX_VIDEO_SIZE_MB) || 100,
  MAX_VIDEO_SIZE_BYTES: Number(import.meta.env.VITE_MAX_VIDEO_SIZE_MB) || 100 * 1024 * 1024,

  // Grades
  GRADES: (import.meta.env.VITE_VIDEO_GRADES || 'All Grades,Grade 10,Grade 11,Grade 12')
    .split(',').map(g => g.trim()),

  // Display limits
  RESULTS_LIMIT: Number(import.meta.env.VITE_VIDEO_RESULTS_LIMIT) || 100,

  // Feature flags
  ENABLE_AUTO_APPROVE_FOR_ADMIN: import.meta.env.VITE_ENABLE_AUTO_APPROVE_FOR_ADMIN !== 'false',

  // Messages
  MESSAGES: {
    TITLE: import.meta.env.VITE_VIDEO_TITLE || 'Video Lesson Library',
    SUBTITLE: import.meta.env.VITE_VIDEO_SUBTITLE || 'Watch expert tutor lessons for CAPS Grades 10–12',
    LOAD_FAILED: import.meta.env.VITE_VIDEO_LOAD_FAILED_MSG || 'Failed to load videos. Please try again.',
    UPLOAD_SUCCESS: import.meta.env.VITE_VIDEO_UPLOAD_SUCCESS_MSG || 'Video uploaded successfully!',
    UPLOAD_FAILED: import.meta.env.VITE_VIDEO_UPLOAD_FAILED_MSG || 'Failed to upload video. Please try again.',
    APPROVE_SUCCESS: import.meta.env.VITE_VIDEO_APPROVE_SUCCESS_MSG || 'Video approved successfully!',
    APPROVE_FAILED: import.meta.env.VITE_VIDEO_APPROVE_FAILED_MSG || 'Failed to approve video.',
    PREMIUM_LOCKED: import.meta.env.VITE_VIDEO_PREMIUM_LOCKED_MSG || 'This is a premium lesson. Upgrade to access it.',
    NO_VIDEOS: import.meta.env.VITE_VIDEO_NO_VIDEOS_MSG || 'No lessons found.',
    UPLOAD_PLACEHOLDER: import.meta.env.VITE_VIDEO_UPLOAD_PLACEHOLDER || 'Upload the first video lesson!',
    COMING_SOON: import.meta.env.VITE_VIDEO_COMING_SOON_MSG || 'Check back soon — tutors are uploading lessons.',
    INVALID_FILE_TYPE: import.meta.env.VITE_VIDEO_INVALID_FILE_MSG || 'Please upload an MP4, MOV, or WEBM video file.',
    FILE_TOO_LARGE: import.meta.env.VITE_VIDEO_FILE_TOO_LARGE_MSG || 'Video file must be less than {size}MB.',
    FILL_REQUIRED: import.meta.env.VITE_VIDEO_FILL_REQUIRED_MSG || 'Fill in title, subject, and select a video file.',
  },
};

// ============================================================
// Sub-Components
// ============================================================

function VideoCard({ video, isPremium, isTutor, isAdmin, onPlay, onApprove, user }) {
  const [isHovering, setIsHovering] = useState(false);
  const isLocked = video.is_premium && !isPremium && !isTutor && !isAdmin;
  const subjectInfo = SUBJECTS.find(s => s.name === video.subject);
  const isPending = !video.is_approved && isAdmin;

  return (
    <Card
      className="border-border group hover:shadow-xl transition-all duration-300 overflow-hidden hover:-translate-y-1"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center overflow-hidden">
        {video.thumbnail_url ? (
          <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="text-6xl opacity-30 group-hover:scale-110 transition-transform duration-500">
            {subjectInfo?.icon || '🎬'}
          </div>
        )}
        <div className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity duration-300 ${isHovering ? 'opacity-100' : 'opacity-0'}`} />

        {/* Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={() => onPlay(video)}
            className={`w-14 h-14 rounded-full bg-primary/90 hover:bg-primary flex items-center justify-center shadow-2xl transition-all duration-300 transform ${
              isHovering ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
            }`}
          >
            {isLocked ? (
              <Lock className="w-6 h-6 text-white" />
            ) : (
              <Play className="w-6 h-6 text-white ml-1" />
            )}
          </button>
        </div>

        {/* Duration Badge */}
        {video.duration_minutes && (
          <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded-md font-medium">
            {video.duration_minutes}m
          </div>
        )}

        {/* Premium Badge */}
        {video.is_premium && (
          <div className="absolute top-2 right-2">
            <PremiumBadge variant="badge" />
          </div>
        )}

        {/* Pending Approval Badge */}
        {isPending && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800 text-xs animate-pulse">
              <Clock className="w-3 h-3 mr-1" /> Pending Approval
            </Badge>
          </div>
        )}

        {/* Lock Overlay */}
        {video.is_premium && isLocked && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <PremiumBadge variant="overlay" />
          </div>
        )}
      </div>

      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {video.title}
          </h3>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-2">
          <Badge variant="outline" className="text-xs">{video.subject}</Badge>
          <Badge variant="outline" className="text-xs">{video.grade}</Badge>
          {video.topic && (
            <Badge className="bg-muted text-muted-foreground text-xs">{video.topic}</Badge>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" /> {video.view_count || 0}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> {video.duration_minutes || 'N/A'}m
            </span>
          </div>
          <span className="truncate max-w-[80px]">{video.tutor_name || 'EduConnect'}</span>
        </div>

        <div className="flex gap-2 mt-3">
          {isLocked ? (
            <Link to="/premium" className="flex-1">
              <button className="w-full h-8 text-xs font-semibold rounded-md bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white flex items-center justify-center gap-1.5 transition-all shadow-md hover:shadow-lg">
                <Lock className="w-3 h-3" /> Unlock Premium
              </button>
            </Link>
          ) : (
            <Button
              size="sm"
              className="flex-1 bg-primary hover:bg-primary/90 gap-1.5 h-8 text-xs shadow-sm hover:shadow-md transition-all duration-300"
              onClick={() => onPlay(video)}
            >
              <Play className="w-3 h-3" /> Watch
            </Button>
          )}
          {isPending && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1 text-green-700 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-950/20"
              onClick={() => onApprove(video.id)}
            >
              <CheckCircle className="w-3 h-3" /> Approve
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function UploadForm({ form, setForm, videoFile, setVideoFile, uploading, onSubmit, onCancel }) {
  const maxSizeMB = CONFIG.MAX_VIDEO_SIZE_MB;

  return (
    <Card className="border-primary/20 mb-6 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-playfair text-lg flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" /> Upload New Video Lesson
          </CardTitle>
          <Button size="icon" variant="ghost" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input
              placeholder="e.g. Grade 12 Calculus – Derivatives"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Topic / Chapter</Label>
            <Input
              placeholder="e.g. Differential Calculus"
              value={form.topic}
              onChange={e => setForm({ ...form, topic: e.target.value })}
            />
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
                {CONFIG.GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Description</Label>
            <Input
              placeholder="What will students learn from this lesson?"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Duration (minutes)</Label>
            <Input
              type="number"
              min={1}
              value={form.duration_minutes}
              onChange={e => setForm({ ...form, duration_minutes: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Video File * (.mp4, .mov, .webm)</Label>
            <Input
              type="file"
              accept="video/*"
              onChange={e => setVideoFile(e.target.files[0] || null)}
            />
            {videoFile && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <FileVideo className="w-3 h-3" />
                {videoFile.name} ({(videoFile.size / (1024 * 1024)).toFixed(1)}MB)
              </p>
            )}
            <p className="text-[10px] text-muted-foreground">Max {maxSizeMB}MB</p>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="vid_premium"
              checked={form.is_premium}
              onChange={e => setForm({ ...form, is_premium: e.target.checked })}
              className="rounded border-primary/30"
            />
            <Label htmlFor="vid_premium" className="cursor-pointer flex items-center gap-1.5 text-sm">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> Premium lesson
            </Label>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button onClick={onSubmit} disabled={uploading} className="bg-primary gap-2">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Uploading…' : 'Submit Lesson'}
          </Button>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function VideoLessons() {
  // ✅ FIXED: Use useAuth() instead of useOutletContext()
  const { user } = useAuth();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(null);
  const [filterSubject, setFilterSubject] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [form, setForm] = useState({
    title: '', subject: '', grade: 'Grade 12', description: '', topic: '',
    duration_minutes: 30, is_premium: false,
  });
  const [videoFile, setVideoFile] = useState(null);

  const isTutor = user?.role === 'tutor' || user?.role === 'sace_tutor' || user?.role === 'student_tutor';
  const isAdmin = user?.role === 'admin';
  const { isPremium, isOnTrial, trialDaysLeft } = usePremiumAccess(user);

  // ============================================================
  // Load Videos
  // ============================================================

  const loadVideos = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('video_lessons')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(CONFIG.RESULTS_LIMIT);

      if (fetchError) throw fetchError;

      let filteredVideos = data || [];
      if (!isAdmin && !isTutor) {
        filteredVideos = filteredVideos.filter(v => v.is_approved);
      }
      setVideos(filteredVideos);
    } catch (err) {
      console.error('Error loading videos:', err);
      setError(CONFIG.MESSAGES.LOAD_FAILED);
      toast.error(CONFIG.MESSAGES.LOAD_FAILED);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isTutor]);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  // ============================================================
  // Upload Video
  // ============================================================

  const uploadVideoToSupabase = async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${CONFIG.STORAGE_BUCKET}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from(CONFIG.STORAGE_BUCKET)
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from(CONFIG.STORAGE_BUCKET)
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleUpload = async () => {
    if (!form.title || !form.subject || !videoFile) {
      toast.error(CONFIG.MESSAGES.FILL_REQUIRED);
      return;
    }

    if (!CONFIG.ALLOWED_VIDEO_TYPES.includes(videoFile.type)) {
      toast.error(CONFIG.MESSAGES.INVALID_FILE_TYPE);
      return;
    }

    if (videoFile.size > CONFIG.MAX_VIDEO_SIZE_BYTES) {
      toast.error(CONFIG.MESSAGES.FILE_TOO_LARGE.replace('{size}', CONFIG.MAX_VIDEO_SIZE_MB));
      return;
    }

    setUploading(true);

    try {
      const videoUrl = await uploadVideoToSupabase(videoFile);

      const { data, error: insertError } = await supabase
        .from('video_lessons')
        .insert({
          title: form.title,
          subject: form.subject,
          grade: form.grade,
          description: form.description || null,
          topic: form.topic || null,
          duration_minutes: Number(form.duration_minutes) || 30,
          is_premium: form.is_premium,
          video_url: videoUrl,
          tutor_email: user.email,
          tutor_name: user.full_name || user.email,
          view_count: 0,
          is_approved: isAdmin || false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setVideos(prev => [data, ...prev]);
      toast.success(CONFIG.MESSAGES.UPLOAD_SUCCESS);
      setShowUpload(false);
      setVideoFile(null);
      setForm({
        title: '', subject: '', grade: 'Grade 12', description: '',
        topic: '', duration_minutes: 30, is_premium: false
      });
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(CONFIG.MESSAGES.UPLOAD_FAILED + ' ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  // ============================================================
  // Approve Video
  // ============================================================

  const approveVideo = async (id) => {
    try {
      const { error } = await supabase
        .from('video_lessons')
        .update({
          is_approved: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      setVideos(prev => prev.map(v =>
        v.id === id ? { ...v, is_approved: true } : v
      ));
      toast.success(CONFIG.MESSAGES.APPROVE_SUCCESS);
    } catch (err) {
      console.error('Approval error:', err);
      toast.error(CONFIG.MESSAGES.APPROVE_FAILED);
    }
  };

  // ============================================================
  // Play Video
  // ============================================================

  const handlePlay = async (video) => {
    if (video.is_premium && !isPremium && !isTutor && !isAdmin) {
      toast.error(CONFIG.MESSAGES.PREMIUM_LOCKED);
      return;
    }
    setPlaying(video);

    try {
      await supabase
        .from('video_lessons')
        .update({ view_count: (video.view_count || 0) + 1 })
        .eq('id', video.id);
    } catch (err) {
      console.error('Error updating view count:', err);
    }
  };

  // ============================================================
  // Computed Values
  // ============================================================

  const filtered = useMemo(() => {
    return videos.filter(v => {
      const matchSub = !filterSubject || v.subject === filterSubject;
      const matchGrade = !filterGrade || v.grade === filterGrade || v.grade === 'All Grades';
      const matchSearch = !search ||
        v.title.toLowerCase().includes(search.toLowerCase()) ||
        v.topic?.toLowerCase().includes(search.toLowerCase());
      return matchSub && matchGrade && matchSearch;
    });
  }, [videos, filterSubject, filterGrade, search]);

  const totalViews = filtered.reduce((sum, v) => sum + (v.view_count || 0), 0);
  const hasFilters = search.trim() || filterSubject || filterGrade;

  // ============================================================
  // Loading State
  // ============================================================

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground animate-pulse">Loading video library...</p>
      </div>
    );
  }

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="min-h-screen bg-background">
      {isOnTrial && <TrialBanner trialDaysLeft={trialDaysLeft} />}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-playfair text-3xl font-bold flex items-center gap-2">
              <BookOpen className="w-7 h-7 text-primary" /> {CONFIG.MESSAGES.TITLE}
            </h1>
            <p className="text-muted-foreground mt-1">{CONFIG.MESSAGES.SUBTITLE}</p>
          </div>
          <div className="flex items-center gap-2">
            {(isTutor || isAdmin) && (
              <Button onClick={() => setShowUpload(!showUpload)} className="bg-primary gap-2 shadow-md hover:shadow-lg transition-all duration-300">
                {showUpload ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showUpload ? 'Cancel' : 'Upload Video Lesson'}
              </Button>
            )}
            <div className="flex items-center gap-1 border-l border-border pl-2 ml-1">
              <Button
                size="sm"
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                onClick={() => setViewMode('grid')}
                className="h-8 w-8 p-0"
              >
                <Grid3x3 className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                onClick={() => setViewMode('list')}
                className="h-8 w-8 p-0"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Upload Form */}
        {showUpload && (
          <UploadForm
            form={form}
            setForm={setForm}
            videoFile={videoFile}
            setVideoFile={setVideoFile}
            uploading={uploading}
            onSubmit={handleUpload}
            onCancel={() => setShowUpload(false)}
          />
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4 flex items-center gap-3 text-sm text-red-700 dark:text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{error}</span>
            <Button variant="outline" size="sm" onClick={loadVideos} className="gap-1">
              <RefreshCw className="w-3 h-3" /> Retry
            </Button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9 pr-9 h-9"
              placeholder="Search lessons…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className="h-9 w-44">
              <SelectValue placeholder="All subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Subjects</SelectItem>
              {SUBJECTS.map(s => <SelectItem key={s.code} value={s.name}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterGrade} onValueChange={setFilterGrade}>
            <SelectTrigger className="h-9 w-36">
              <SelectValue placeholder="All grades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Grades</SelectItem>
              {CONFIG.GRADES.filter(g => g !== 'All Grades').map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSearch(''); setFilterSubject(''); setFilterGrade(''); }}
              className="h-9 gap-1 text-xs"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </Button>
          )}
        </div>

        {/* Stats Bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground">
              {filtered.length} lesson{filtered.length !== 1 ? 's' : ''} found
            </p>
            {totalViews > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                <Eye className="w-3 h-3" /> {totalViews} total views
              </span>
            )}
          </div>
          {filtered.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {filtered.filter(v => v.is_premium).length} premium
            </Badge>
          )}
        </div>

        {/* Video Player Modal */}
        {playing && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setPlaying(null)}>
            <div className="w-full max-w-4xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-white font-semibold text-lg">{playing.title}</h2>
                  <p className="text-white/60 text-sm">{playing.subject} · {playing.grade}</p>
                </div>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setPlaying(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <video controls autoPlay className="w-full rounded-2xl max-h-[60vh] bg-black" src={playing.video_url}>
                Your browser does not support video playback.
              </video>
              {playing.description && (
                <p className="text-white/70 text-sm mt-3">{playing.description}</p>
              )}
            </div>
          </div>
        )}

        {/* Video Grid */}
        {filtered.length === 0 ? (
          <Card className="border-border">
            <CardContent className="text-center py-16">
              <Play className="w-14 h-14 mx-auto mb-4 text-muted-foreground opacity-30" />
              <p className="font-semibold text-muted-foreground">{CONFIG.MESSAGES.NO_VIDEOS}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {(isTutor || isAdmin) ? CONFIG.MESSAGES.UPLOAD_PLACEHOLDER : CONFIG.MESSAGES.COMING_SOON}
              </p>
              {(isTutor || isAdmin) && (
                <Button onClick={() => setShowUpload(true)} className="mt-4 gap-2">
                  <Plus className="w-4 h-4" /> Upload First Lesson
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className={viewMode === 'grid' ? 'grid sm:grid-cols-2 lg:grid-cols-3 gap-5' : 'space-y-3'}>
            {filtered.map(video => (
              <VideoCard
                key={video.id}
                video={video}
                isPremium={isPremium}
                isTutor={isTutor}
                isAdmin={isAdmin}
                onPlay={handlePlay}
                onApprove={approveVideo}
                user={user}
              />
            ))}
          </div>
        )}

        {/* Footer Stats */}
        {filtered.length > 0 && (
          <div className="mt-8 flex flex-wrap items-center gap-4 text-xs text-muted-foreground border-t border-border pt-4">
            <span className="flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              {filtered.length} videos
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {totalViews} total views
            </span>
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {filtered.filter(v => v.is_premium).length} premium
            </span>
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {new Set(filtered.map(v => v.tutor_email)).size} tutors
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
