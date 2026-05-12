import { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { supabase } from '@/supabaseClient';
import { SUBJECTS } from '@/lib/subjects';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Upload, FileText, Star, CheckCircle, Plus, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import BookingCalendar from '@/components/tutor/BookingCalendar';
import SimulationLab from '@/components/simulations/SimulationLab';
import TutorAvailabilityManager from '@/components/tutor/TutorAvailabilityManager';
import MeetingLinks from '@/components/tutor/MeetingLinks';
import TutorVerificationBadge from '@/components/tutor/TutorVerificationBadge';
import QuizBuilder from '@/components/quiz/QuizBuilder';
import ChatInbox from '@/components/tutor/ChatInbox';
import TutorReviews from '@/components/tutor/TutorReviews';
import BookingRequests from '@/components/tutor/BookingRequests';

export default function TutorDashboard() {
  const { user, userProfile } = useOutletContext() || {};
  const [profile, setProfile] = useState(null);
  const [resources, setResources] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadData, setUploadData] = useState({
    title: '', subject: '', grade: 'Grade 10', type: 'Notes', description: '', is_premium: false,
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Get user role from profile or user
  const userRole = userProfile?.role || user?.role;
  const isTutorRole = ['sace_tutor', 'student_tutor', 'tutor_pending'].includes(userRole);
  const isVerifiedTutor = profile?.is_verified === true;

  useEffect(() => {
    if (!user?.email) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch tutor profile
        const { data: profiles, error: profileError } = await supabase
          .from('tutor_profiles')
          .select('*')
          .eq('user_email', user.email)
          .maybeSingle();

        if (profileError) console.error('Profile fetch error:', profileError);
        setProfile(profiles);

        // Fetch tutor's resources
        const { data: resourcesData, error: resourcesError } = await supabase
          .from('resources')
          .select('*')
          .eq('uploaded_by', profiles?.id || '')
          .order('created_at', { ascending: false });

        if (resourcesError) console.error('Resources fetch error:', resourcesError);
        setResources(resourcesData || []);

      } catch (error) {
        console.error('Error fetching tutor data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleFileChange = (e) => setSelectedFile(e.target.files[0] || null);

  const handleUpload = async () => {
    if (!uploadData.title || !uploadData.subject || !selectedFile) {
      toast.error('Please fill in all required fields and select a file.');
      return;
    }
    setUploading(true);
    
    try {
      // Upload file to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `resources/${user.email}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('resources')
        .upload(filePath, selectedFile);
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('resources')
        .getPublicUrl(filePath);
      
      // Create resource record
      const { data: newResource, error: createError } = await supabase
        .from('resources')
        .insert({
          title: uploadData.title,
          description: uploadData.description,
          file_url: publicUrl,
          subject: uploadData.subject,
          grade: uploadData.grade,
          type: uploadData.type,
          is_premium: uploadData.is_premium,
          is_approved: false,
          uploaded_by: profile?.id,
          tutor_email: user.email,
          download_count: 0,
        })
        .select()
        .single();
      
      if (createError) throw createError;
      
      setResources([newResource, ...resources]);
      setUploadData({ title: '', subject: '', grade: 'Grade 10', type: 'Notes', description: '', is_premium: false });
      setSelectedFile(null);
      setShowUploadForm(false);
      toast.success('Resource uploaded successfully! Awaiting admin approval.');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload resource. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (resourceId) => {
    try {
      const { error } = await supabase
        .from('resources')
        .delete()
        .eq('id', resourceId);
      
      if (error) throw error;
      
      setResources(prev => prev.filter(r => r.id !== resourceId));
      toast.success('Resource deleted.');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete resource');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-sm">
          <BookOpen className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="font-playfair text-2xl font-bold mb-2">Tutor Dashboard</h2>
          <p className="text-muted-foreground mb-6">Please sign in to access your tutor dashboard.</p>
          <Button onClick={() => window.location.href = '/login'} className="bg-primary">Sign In</Button>
        </div>
      </div>
    );
  }

  // Role-based access control
  if (userRole === 'tutor_pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-sm px-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="font-playfair text-2xl font-bold mb-2">Application Submitted</h2>
          <p className="text-muted-foreground mb-3">Your tutor profile is currently under review by our admin team. You'll receive an email once verified.</p>
          <p className="text-sm text-muted-foreground bg-amber-50 border border-amber-200 rounded-xl p-3">⏳ Verification typically takes <strong>1–2 business days</strong>.</p>
        </div>
      </div>
    );
  }

  if (!isTutorRole || !isVerifiedTutor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-sm px-4">
          <BookOpen className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="font-playfair text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">This area is for verified tutors only. Students cannot access the tutor management dashboard.</p>
          <Button onClick={() => window.location.href = '/'} variant="outline">Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-playfair text-3xl font-bold text-foreground">
              Tutor Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">Upload resources and manage your tutoring materials.</p>
          </div>
          <div className="flex items-center gap-2">
            {isVerifiedTutor && (
              <Badge className="bg-green-100 text-green-700 border-green-200 gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" /> Verified Tutor
              </Badge>
            )}
            <Button onClick={() => setShowUploadForm(!showUploadForm)} className="bg-primary gap-2">
              <Plus className="w-4 h-4" /> Upload Resource
            </Button>
          </div>
        </div>

        {/* Stats — dynamically computed from live resources */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Uploads', value: resources.length },
            { label: 'Premium Resources', value: resources.filter(r => r.is_premium).length },
            { label: 'Free Resources', value: resources.filter(r => !r.is_premium).length },
            { label: 'Total Downloads', value: resources.reduce((sum, r) => sum + (Number(r.download_count) || 0), 0) },
          ].map(({ label, value }) => (
            <Card key={label} className="border-border">
              <CardContent className="pt-5 pb-4 text-center">
                <p className="font-playfair text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Upload Form */}
        {showUploadForm && (
          <Card className="border-primary/20 mb-6 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-playfair flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" /> Upload New Resource
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Title *</Label>
                  <Input
                    placeholder="e.g. Grade 12 Maths Notes – Calculus"
                    value={uploadData.title}
                    onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Subject *</Label>
                  <Select value={uploadData.subject} onValueChange={(v) => setUploadData({ ...uploadData, subject: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBJECTS.map((s) => (
                        <SelectItem key={s.code} value={s.name}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Grade *</Label>
                  <Select value={uploadData.grade} onValueChange={(v) => setUploadData({ ...uploadData, grade: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Grade 10">Grade 10</SelectItem>
                      <SelectItem value="Grade 11">Grade 11</SelectItem>
                      <SelectItem value="Grade 12">Grade 12</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Type *</Label>
                  <Select value={uploadData.type} onValueChange={(v) => setUploadData({ ...uploadData, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['Notes', 'Past Paper', 'Worksheet', 'Summary', 'Textbook', 'Video'].map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Description</Label>
                  <Input
                    placeholder="Brief description of this resource..."
                    value={uploadData.description}
                    onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>File *</Label>
                  <Input type="file" onChange={handleFileChange} accept=".pdf,.docx,.pptx,.xlsx,.png,.jpg" />
                  {selectedFile && <p className="text-xs text-muted-foreground">{selectedFile.name}</p>}
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="is_premium"
                    checked={uploadData.is_premium}
                    onChange={(e) => setUploadData({ ...uploadData, is_premium: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="is_premium" className="cursor-pointer flex items-center gap-1.5">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> Mark as Premium Resource
                  </Label>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button onClick={handleUpload} disabled={uploading} className="bg-primary gap-2">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? 'Uploading...' : 'Upload Resource'}
                </Button>
                <Button variant="outline" onClick={() => setShowUploadForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tutor Pro Plan upsell */}
        {profile && !profile.is_premium && (
          <div className="bg-gradient-to-r from-primary/10 to-green-dark/10 border border-primary/20 rounded-2xl p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <p className="font-playfair font-bold text-lg text-foreground">Go Tutor Pro — R150/month</p>
              <p className="text-sm text-muted-foreground mt-0.5">Eliminate the 10% platform commission on all your bookings. Featured listing + advanced analytics.</p>
              <p className="text-xs text-muted-foreground mt-1">Use your email as reference on Yoco. Activated by Admin within 60 min.</p>
            </div>
            <a href="https://pay.yoco.com/r/78MMPk" target="_blank" rel="noopener noreferrer">
              <Button className="bg-primary gap-2 whitespace-nowrap">
                <Star className="w-4 h-4 fill-current" /> Upgrade to Pro
              </Button>
            </a>
          </div>
        )}

        {/* Verification + Meeting Links */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <TutorVerificationBadge user={user} profile={profile} onProfileUpdate={setProfile} />
          <MeetingLinks user={user} />
          <TutorAvailabilityManager user={user} />
        </div>

        {/* Booking Requests */}
        <div className="mb-6">
          <BookingRequests user={user} />
        </div>

        {/* Booking Calendar */}
        <div className="mb-6">
          <BookingCalendar user={user} />
        </div>

        {/* Science Simulation Lab */}
        <div className="mb-6">
          <SimulationLab isTutor={true} />
        </div>

        {/* Student Messages */}
        <div className="mb-6">
          <ChatInbox user={user} />
        </div>

        {/* Student Reviews */}
        <div className="mb-6">
          <TutorReviews tutorEmail={user?.email} />
        </div>

        {/* Quiz Builder */}
        <div className="mb-6">
          <QuizBuilder user={user} />
        </div>

        {/* Resources List */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-playfair">My Uploaded Resources ({resources.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {resources.length === 0 ? (
              <div className="text-center py-12">
                <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="font-semibold mb-1">No resources uploaded yet</p>
                <p className="text-sm text-muted-foreground">Click "Upload Resource" to share your first study material.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {resources.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted transition-colors">
                    <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{r.title}</p>
                        {r.is_premium && (
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs gap-1">
                            <Star className="w-3 h-3 fill-current" /> Premium
                          </Badge>
                        )}
                        {!r.is_approved && (
                          <Badge className="bg-amber-100 text-amber-700 text-xs">Pending Approval</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{r.subject} • {r.grade} • {r.type}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {r.file_url && (
                        <a href={r.file_url} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="ghost" className="text-primary text-xs h-8">View</Button>
                        </a>
                      )}
                      <Button size="sm" variant="ghost" className="text-destructive h-8" onClick={() => handleDelete(r.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}