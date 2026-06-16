import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from 'react-router-dom';
import { Play, Upload, Search, Lock, Star, Clock, Eye, Plus, Loader2, X, CheckCircle } from 'lucide-react';
import PremiumBadge from '@/components/ui/PremiumBadge';
import usePremiumAccess from '@/hooks/usePremiumAccess';
import TrialBanner from '@/components/ui/TrialBanner';
import { SUBJECTS } from '@/lib/subjects';
import { toast } from 'sonner';

const GRADES = ['All Grades', 'Grade 10', 'Grade 11', 'Grade 12'];

export default function VideoLessons() {
  const { user } = useOutletContext() || {};
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(null);
  const [filterSubject, setFilterSubject] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    title: '', subject: '', grade: 'Grade 12', description: '', topic: '',
    duration_minutes: 30, is_premium: false,
  });
  const [videoFile, setVideoFile] = useState(null);

  const isTutor = user?.role === 'tutor' || user?.role === 'sace_tutor' || user?.role === 'student_tutor';
  const isAdmin = user?.role === 'admin';
  const { isPremium, isOnTrial, trialDaysLeft } = usePremiumAccess(user);

  const loadVideos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('video_lessons')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (fetchError) throw fetchError;

      // Filter based on user role
      let filteredVideos = data || [];
      if (!isAdmin && !isTutor) {
        filteredVideos = filteredVideos.filter(v => v.is_approved);
      }
      setVideos(filteredVideos);
    } catch (err) {
      console.error('Error loading videos:', err);
      setError('Failed to load videos');
      toast.error('Failed to load videos');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isTutor]);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  // Upload file to Supabase Storage
  const uploadVideoToSupabase = async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `video-lessons/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('video-lessons')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('video-lessons')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleUpload = async () => {
    if (!form.title || !form.subject || !videoFile) {
      toast.error('Fill in title, subject, and select a video file.');
      return;
    }

    // Validate video file type
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
    if (!allowedTypes.includes(videoFile.type)) {
      toast.error('Please upload an MP4, MOV, or WEBM video file.');
      return;
    }

    // Validate file size (max 100MB)
    if (videoFile.size > 100 * 1024 * 1024) {
      toast.error('Video file must be less than 100MB.');
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

      // Add to local state
      setVideos(prev => [data, ...prev]);
      toast.success(isAdmin ? 'Video published!' : 'Video submitted for admin approval!');
      setShowUpload(false);
      setVideoFile(null);
      setForm({ 
        title: '', subject: '', grade: 'Grade 12', description: '', 
        topic: '', duration_minutes: 30, is_premium: false 
      });
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Failed to upload video: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

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
      toast.success('Video approved!');
    } catch (err) {
      console.error('Approval error:', err);
      toast.error('Failed to approve video');
    }
  };

  const handlePlay = async (video) => {
    if (video.is_premium && !isPremium && !isTutor && !isAdmin) {
      toast.error('This is a premium lesson. Upgrade to access it.');
      return;
    }
    setPlaying(video);
    // Increment view count
    try {
      await supabase
        .from('video_lessons')
        .update({ 
          view_count: (video.view_count || 0) + 1 
        })
        .eq('id', video.id);
    } catch (err) {
      console.error('Error updating view count:', err);
    }
  };

  const filtered = videos.filter(v => {
    const matchSub = !filterSubject || v.subject === filterSubject;
    const matchGrade = !filterGrade || v.grade === filterGrade || v.grade === 'All Grades';
    const matchSearch = !search || 
      v.title.toLowerCase().includes(search.toLowerCase()) || 
      v.topic?.toLowerCase().includes(search.toLowerCase());
    return matchSub && matchGrade && matchSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {isOnTrial && <TrialBanner trialDaysLeft={trialDaysLeft} />}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-playfair text-3xl font-bold">Video Lesson Library</h1>
            <p className="text-muted-foreground mt-1">Watch expert tutor lessons for CAPS Grades 10–12</p>
          </div>
          {(isTutor || isAdmin) && (
            <Button onClick={() => setShowUpload(!showUpload)} className="bg-primary gap-2">
              <Plus className="w-4 h-4" /> Upload Video Lesson
            </Button>
          )}
        </div>

        {/* Upload Form */}
        {showUpload && (
          <Card className="border-primary/20 mb-6 shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="font-playfair text-lg flex items-center gap-2">
                  <Upload className="w-5 h-5 text-primary" /> Upload New Video Lesson
                </CardTitle>
                <Button size="icon" variant="ghost" onClick={() => setShowUpload(false)}>
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
                      {GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
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
                  {videoFile && <p className="text-xs text-muted-foreground">{videoFile.name}</p>}
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <input 
                    type="checkbox" 
                    id="vid_premium" 
                    checked={form.is_premium} 
                    onChange={e => setForm({ ...form, is_premium: e.target.checked })} 
                    className="rounded" 
                  />
                  <Label htmlFor="vid_premium" className="cursor-pointer flex items-center gap-1.5">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> Premium lesson
                  </Label>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button onClick={handleUpload} disabled={uploading} className="bg-primary gap-2">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? 'Uploading…' : 'Submit Lesson'}
                </Button>
                <Button variant="outline" onClick={() => setShowUpload(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-700">
            {error}
            <Button variant="outline" size="sm" className="ml-4" onClick={loadVideos}>Retry</Button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              className="pl-9 h-9" 
              placeholder="Search lessons…" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
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
              <SelectItem value="Grade 10">Grade 10</SelectItem>
              <SelectItem value="Grade 11">Grade 11</SelectItem>
              <SelectItem value="Grade 12">Grade 12</SelectItem>
            </SelectContent>
          </Select>
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
              <p className="font-semibold text-muted-foreground">No lessons found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {(isTutor || isAdmin) ? 'Upload the first video lesson!' : 'Check back soon — tutors are uploading lessons.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(video => {
              const isLocked = video.is_premium && !isPremium && !isTutor && !isAdmin;
              const subjectInfo = SUBJECTS.find(s => s.name === video.subject);
              return (
                <Card key={video.id} className="border-border group hover:shadow-lg transition-shadow overflow-hidden">
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center overflow-hidden">
                    {video.thumbnail_url ? (
                      <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-5xl">{subjectInfo?.icon || '🎬'}</div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <button
                        onClick={() => handlePlay(video)}
                        className="w-12 h-12 rounded-full bg-primary/90 hover:bg-primary flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100"
                      >
                        {isLocked ? <Lock className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white ml-0.5" />}
                      </button>
                    </div>
                    {video.is_premium && (
                      <div className="absolute top-2 right-2">
                        <PremiumBadge variant="badge" />
                      </div>
                    )}
                    {video.is_premium && isLocked && (
                      <PremiumBadge variant="overlay" />
                    )}
                    {isAdmin && !video.is_approved && (
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-amber-100 text-amber-700 text-xs">Pending Approval</Badge>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-sm leading-snug line-clamp-2">{video.title}</h3>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      <Badge variant="outline" className="text-xs">{video.subject}</Badge>
                      <Badge variant="outline" className="text-xs">{video.grade}</Badge>
                      {video.topic && <Badge className="bg-muted text-muted-foreground text-xs">{video.topic}</Badge>}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        {video.duration_minutes && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {video.duration_minutes}m
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" /> {video.view_count || 0}
                        </span>
                      </div>
                      <span>{video.tutor_name || 'EduConnect'}</span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      {isLocked ? (
                        <Link to="/premium" className="flex-1">
                          <button className="w-full h-8 text-xs font-semibold rounded-md bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white flex items-center justify-center gap-1.5 transition-all">
                            <Lock className="w-3 h-3" /> Unlock Premium
                          </button>
                        </Link>
                      ) : (
                        <Button size="sm" className="flex-1 bg-primary gap-1.5 h-8 text-xs" onClick={() => handlePlay(video)}>
                          <Play className="w-3 h-3" /> Watch
                        </Button>
                      )}
                      {isAdmin && !video.is_approved && (
                        <Button size="sm" variant="outline" className="h-8 text-xs gap-1 text-green-700 border-green-200" onClick={() => approveVideo(video.id)}>
                          <CheckCircle className="w-3 h-3" /> Approve
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}