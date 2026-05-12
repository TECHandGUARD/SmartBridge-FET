import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Upload, Search, Lock, Star, Clock, Eye, Plus, Loader2, X, CheckCircle } from 'lucide-react';
import { SUBJECTS } from '@/lib/subjects';
import { toast } from 'sonner';

const GRADES = ['All Grades', 'Grade 10', 'Grade 11', 'Grade 12'];

export default function VideoLessons() {
  const { user, userProfile } = useOutletContext() || {};
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(null);
  const [filterSubject, setFilterSubject] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [form, setForm] = useState({
    title: '', subject: '', grade: 'Grade 12', description: '', topic: '',
    duration_minutes: 30, is_premium: false,
  });
  const [videoFile, setVideoFile] = useState(null);

  const userRole = userProfile?.role || user?.role;
  const isTutor = userRole === 'sace_tutor' || userRole === 'student_tutor';
  const isAdmin = userRole === 'admin';

  useEffect(() => {
    fetchVideos();
    if (user?.email) {
      fetchSubscription();
    }
  }, [user]);

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('video_lessons')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      let filteredVideos = data || [];
      if (!isAdmin && !isTutor) {
        filteredVideos = filteredVideos.filter(v => v.is_approved);
      }
      setVideos(filteredVideos);
    } catch (error) {
      console.error('Error fetching videos:', error);
      toast.error('Failed to load video lessons');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscription = async () => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_email', user.email)
        .eq('status', 'active')
        .maybeSingle();
      
      if (error) throw error;
      setSubscription(data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  const isPremium = subscription?.status === 'active';

  const filtered = videos.filter(v => {
    const matchSub = !filterSubject || v.subject === filterSubject;
    const matchGrade = !filterGrade || v.grade === filterGrade || v.grade === 'All Grades';
    const matchSearch = !search || v.title.toLowerCase().includes(search.toLowerCase()) || v.topic?.toLowerCase().includes(search.toLowerCase());
    return matchSub && matchGrade && matchSearch;
  });

  const handleUpload = async () => {
    if (!form.title || !form.subject || !videoFile) {
      toast.error('Fill in title, subject, and select a video file.');
      return;
    }
    setUploading(true);
    try {
      // Upload video to Supabase Storage
      const fileName = `videos/${Date.now()}_${videoFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('video_lessons')
        .upload(fileName, videoFile);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('video_lessons')
        .getPublicUrl(fileName);
      
      // Create video lesson record
      const { error: insertError } = await supabase
        .from('video_lessons')
        .insert({
          title: form.title,
          description: form.description,
          url: publicUrl,
          subject: form.subject,
          grade: form.grade,
          topic: form.topic,
          duration_minutes: form.duration_minutes,
          is_premium: form.is_premium,
          is_approved: isAdmin,
          uploaded_by: userProfile?.id,
        });
      
      if (insertError) throw insertError;
      
      toast.success(isAdmin ? 'Video published!' : 'Video submitted for admin approval!');
      setShowUpload(false);
      setVideoFile(null);
      setForm({ title: '', subject: '', grade: 'Grade 12', description: '', topic: '', duration_minutes: 30, is_premium: false });
      fetchVideos();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload video');
    } finally {
      setUploading(false);
    }
  };

  const approveVideo = async (id) => {
    try {
      const { error } = await supabase
        .from('video_lessons')
        .update({ is_approved: true })
        .eq('id', id);
      
      if (error) throw error;
      setVideos(prev => prev.map(v => v.id === id ? { ...v, is_approved: true } : v));
      toast.success('Video approved!');
    } catch (error) {
      console.error('Error approving video:', error);
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
    await supabase
      .from('video_lessons')
      .update({ view_count: (video.view_count || 0) + 1 })
      .eq('id', video.id)
      .catch(() => {});
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

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

        {/* Storage bucket note */}
        {!showUpload && (isTutor || isAdmin) && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
            💡 Make sure you have created a <strong>video_lessons</strong> storage bucket in Supabase 
            before uploading videos. Go to Storage → Create bucket → Name: <code className="bg-blue-100 px-1 rounded">video_lessons</code> → Set to public.
          </div>
        )}

        {/* Upload Form */}
        {showUpload && (
          <Card className="border-primary/20 mb-6 shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="font-playfair text-lg flex items-center gap-2">
                  <Upload className="w-5 h-5 text-primary" /> Upload New Video Lesson
                </CardTitle>
                <Button size="icon" variant="ghost" onClick={() => setShowUpload(false)}><X className="w-4 h-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Title *</Label>
                  <Input placeholder="e.g. Grade 12 Calculus – Derivatives" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Topic / Chapter</Label>
                  <Input placeholder="e.g. Differential Calculus" value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Subject *</Label>
                  <Select value={form.subject} onValueChange={v => setForm({ ...form, subject: v })}>
                    <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                    <SelectContent>{SUBJECTS.map(s => <SelectItem key={s.code} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Grade *</Label>
                  <Select value={form.grade} onValueChange={v => setForm({ ...form, grade: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Description</Label>
                  <Input placeholder="What will students learn from this lesson?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Duration (minutes)</Label>
                  <Input type="number" min={1} value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: Number(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Video File * (.mp4, .mov, .webm)</Label>
                  <Input type="file" accept="video/*" onChange={e => setVideoFile(e.target.files[0] || null)} />
                  {videoFile && <p className="text-xs text-muted-foreground">{videoFile.name}</p>}
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <input type="checkbox" id="vid_premium" checked={form.is_premium} onChange={e => setForm({ ...form, is_premium: e.target.checked })} className="rounded" />
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

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9 h-9" placeholder="Search lessons…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className="h-9 w-44"><SelectValue placeholder="All subjects" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Subjects</SelectItem>
              {SUBJECTS.map(s => <SelectItem key={s.code} value={s.name}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterGrade} onValueChange={setFilterGrade}>
            <SelectTrigger className="h-9 w-36"><SelectValue placeholder="All grades" /></SelectTrigger>
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
              <video controls autoPlay className="w-full rounded-2xl max-h-[60vh] bg-black" src={playing.url}>
                Your browser does not support video playback.
              </video>
              {playing.description && (
                <p className="text-white/70 text-sm mt-3">{playing.description}</p>
              )}
            </div>
          </div>
        )}

        {/* Video Grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-56 bg-muted rounded-2xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-border">
            <CardContent className="text-center py-16">
              <Play className="w-14 h-14 mx-auto mb-4 text-muted-foreground opacity-30" />
              <p className="font-semibold text-muted-foreground">No lessons found</p>
              <p className="text-sm text-muted-foreground mt-1">{(isTutor || isAdmin) ? 'Upload the first video lesson!' : 'Check back soon — tutors are uploading lessons.'}</p>
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
                        <Badge className="bg-amber-400 text-white text-xs gap-1"><Star className="w-3 h-3 fill-current" /> Premium</Badge>
                      </div>
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
                        {video.duration_minutes && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {video.duration_minutes}m</span>}
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {video.view_count || 0}</span>
                      </div>
                      <span>{video.tutor_name || 'EduConnect'}</span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" className="flex-1 bg-primary gap-1.5 h-8 text-xs" onClick={() => handlePlay(video)}>
                        {isLocked ? <><Lock className="w-3 h-3" /> Premium</> : <><Play className="w-3 h-3" /> Watch</>}
                      </Button>
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