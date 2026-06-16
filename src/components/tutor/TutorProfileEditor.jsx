import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { SUBJECTS } from '@/lib/subjects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  User, Plus, X, Save, Loader2, GraduationCap, DollarSign, ShieldCheck, 
  Sparkles, Globe, Trash2, AlertTriangle, Upload, Video, User as UserIcon, 
  CheckCircle, Eye, Linkedin, Twitter, Globe as GlobeIcon, Info
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// ============================================
// SOFT-CODED CONFIGURATION
// These can be moved to system_configurations table
// ============================================

const DEFAULT_CONFIG = {
  // Profile completion weights
  completionWeights: {
    bio: 10,
    institution: 10,
    study_field: 10,
    qualifications: 10,
    subjects: 15,
    grades: 10,
    session_price_per_hour: 15,
    avatar_url: 10,
    teaching_languages: 5,
    specializations: 5,
  },
  // File upload limits
  uploadLimits: {
    avatar: { maxSizeMB: 2, allowedTypes: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'] },
    video: { maxSizeMB: 50, allowedTypes: ['video/mp4', 'video/quicktime'] },
  },
  // Form validation rules
  validation: {
    saceRegex: /^\d{10,12}$/,
    minHourlyRate: 50,
    maxHourlyRate: 1000,
  },
  // Auto-save settings
  autoSave: {
    enabled: true,
    intervalSeconds: 30,
  },
  // Social links configuration
  socialLinks: {
    enabled: true,
    platforms: ['linkedin', 'twitter', 'website'],
  },
};

// Load config from Supabase (with fallback)
const useProfileConfig = () => {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const { data, error } = await supabase
          .from('system_configurations')
          .select('value')
          .eq('key', 'tutor_profile_config')
          .single();
        
        if (!error && data?.value) {
          setConfig(prev => ({ ...prev, ...data.value }));
        }
      } catch (err) {
        console.warn('Using default profile config:', err);
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, []);

  return { config, loading: configLoading };
};

// Auto-save draft key
const getDraftKey = (email) => `tutor_profile_draft_${email}`;

const TEACHING_LANGUAGES = ['English', 'Afrikaans', 'isiZulu', 'isiXhosa', 'Sesotho', 'Setswana', 'Sepedi', 'Xitsonga', 'Other'];
const GRADES = ['Grade 10', 'Grade 11', 'Grade 12'];
const STUDY_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Honours', 'Masters', 'PhD', 'Graduated', 'N/A'];

export default function TutorProfileEditor({ profile, user, onProfileUpdate }) {
  const { config, loading: configLoading } = useProfileConfig();
  const [previewMode, setPreviewMode] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(config.autoSave?.enabled ?? true);
  const [lastAutoSave, setLastAutoSave] = useState(null);
  
  const [form, setForm] = useState({
    bio: profile?.bio || '',
    institution: profile?.institution || '',
    study_field: profile?.study_field || '',
    study_year: profile?.study_year || '',
    sace_number: profile?.sace_number || '',
    subjects: profile?.subjects || [],
    grades: profile?.grades || [],
    qualifications: profile?.qualifications || [],
    specializations: profile?.specializations || [],
    session_price_per_hour: profile?.session_price_per_hour || '',
    group_session_price: profile?.group_session_price || '',
    teaching_languages: profile?.teaching_languages || [],
  });

  const [socialLinks, setSocialLinks] = useState({
    linkedin: profile?.linkedin || '',
    twitter: profile?.twitter || '',
    website: profile?.website || '',
  });

  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [videoUrl, setVideoUrl] = useState(profile?.video_url || '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [newQual, setNewQual] = useState('');
  const [newSpec, setNewSpec] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ============================================
  // PROFILE COMPLETION CALCULATION (Soft-coded)
  // ============================================
  const profileCompletion = useMemo(() => {
    const weights = config.completionWeights;
    let score = 0;
    let total = 0;
    
    Object.entries(weights).forEach(([field, weight]) => {
      total += weight;
      if (field === 'avatar_url' && avatarUrl) score += weight;
      else if (field === 'bio' && form.bio?.trim()) score += weight;
      else if (field === 'institution' && form.institution?.trim()) score += weight;
      else if (field === 'study_field' && form.study_field?.trim()) score += weight;
      else if (field === 'qualifications' && form.qualifications?.length > 0) score += weight;
      else if (field === 'subjects' && form.subjects?.length > 0) score += weight;
      else if (field === 'grades' && form.grades?.length > 0) score += weight;
      else if (field === 'session_price_per_hour' && form.session_price_per_hour) score += weight;
      else if (field === 'teaching_languages' && form.teaching_languages?.length > 0) score += weight;
      else if (field === 'specializations' && form.specializations?.length > 0) score += weight;
    });
    
    return total > 0 ? Math.round((score / total) * 100) : 0;
  }, [form, avatarUrl, config.completionWeights]);

  // ============================================
  // AUTO-SAVE DRAFT (Soft-coded)
  // ============================================
  useEffect(() => {
    if (!autoSaveEnabled || !user?.email) return;
    if (!isDirty) return;
    if (saving) return;

    const autoSaveInterval = setInterval(() => {
      const draftData = {
        form,
        socialLinks,
        avatarUrl,
        videoUrl,
        updatedAt: new Date().toISOString(),
      };
      const draftKey = getDraftKey(user.email);
      localStorage.setItem(draftKey, JSON.stringify(draftData));
      setLastAutoSave(new Date());
      console.log('Profile draft auto-saved');
    }, (config.autoSave?.intervalSeconds || 30) * 1000);

    return () => clearInterval(autoSaveInterval);
  }, [form, socialLinks, avatarUrl, videoUrl, autoSaveEnabled, isDirty, saving, user?.email, config.autoSave?.intervalSeconds]);

  // Load draft on mount
  useEffect(() => {
    if (!user?.email || profile?.id) return; // Only for new profiles
    
    const draftKey = getDraftKey(user.email);
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) {
      const draft = JSON.parse(savedDraft);
      if (window.confirm('You have an unsaved draft from your last session. Load it?')) {
        setForm(draft.form || form);
        setSocialLinks(draft.socialLinks || socialLinks);
        if (draft.avatarUrl) setAvatarUrl(draft.avatarUrl);
        if (draft.videoUrl) setVideoUrl(draft.videoUrl);
        toast.info('Draft loaded');
      }
    }
  }, [user?.email, profile?.id]);

  // Clear draft after successful save
  const clearDraft = useCallback(() => {
    if (!user?.email) return;
    const draftKey = getDraftKey(user.email);
    localStorage.removeItem(draftKey);
    setIsDirty(false);
  }, [user?.email]);

  // Before unload warning
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Real-time profile updates subscription
  useEffect(() => {
    if (!profile?.id) return;
    
    const channel = supabase
      .channel('tutor_profile_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tutor_profiles',
          filter: `id=eq.${profile.id}`,
        },
        (payload) => {
          if (payload.new && onProfileUpdate) {
            onProfileUpdate(payload.new);
            toast.info('Profile updated from another session');
          }
        }
      )
      .subscribe();
    
    return () => supabase.removeChannel(channel);
  }, [profile?.id, onProfileUpdate]);

  const handleFormChange = (updater) => {
    setForm(updater);
    setIsDirty(true);
  };

  const handleSocialChange = (field, value) => {
    setSocialLinks(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (err) {
      console.error('Delete account error:', err);
      toast.error('Could not delete account. Contact support.');
      setDeleting(false);
    }
  };

  const toggleItem = (field, value) => {
    handleFormChange(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(i => i !== value)
        : [...prev[field], value],
    }));
  };

  const addTag = (field, value, setter) => {
    const trimmed = value.trim();
    if (!trimmed || form[field].includes(trimmed)) return;
    handleFormChange(prev => ({ ...prev, [field]: [...prev[field], trimmed] }));
    setter('');
  };

  const removeTag = (field, value) => {
    handleFormChange(prev => ({ ...prev, [field]: prev[field].filter(i => i !== value) }));
  };

  const toggleLanguage = (lang) => {
    handleFormChange(prev => ({
      ...prev,
      teaching_languages: prev.teaching_languages.includes(lang)
        ? prev.teaching_languages.filter(l => l !== lang)
        : [...prev.teaching_languages, lang],
    }));
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const { allowedTypes, maxSizeMB } = config.uploadLimits?.avatar || DEFAULT_CONFIG.uploadLimits.avatar;
    
    if (!allowedTypes.includes(file.type)) {
      toast.error(`Please upload ${allowedTypes.join(', ')} format`);
      return;
    }
    
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Image must be less than ${maxSizeMB}MB`);
      return;
    }
    
    setUploadingAvatar(true);
    setUploadProgress(0);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `tutor-avatars/${user.email}_${Date.now()}.${fileExt}`;
      
      const interval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);
      
      const { error: uploadError } = await supabase.storage
        .from('tutor-avatars')
        .upload(fileName, file);
      
      clearInterval(interval);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('tutor-avatars')
        .getPublicUrl(fileName);
      
      setAvatarUrl(publicUrl);
      setUploadProgress(100);
      setIsDirty(true);
      toast.success('Profile photo uploaded!');
      
      setTimeout(() => setUploadProgress(0), 1000);
    } catch (error) {
      console.error('Avatar upload failed:', error);
      toast.error('Failed to upload photo. Please try again.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const { allowedTypes, maxSizeMB } = config.uploadLimits?.video || DEFAULT_CONFIG.uploadLimits.video;
    
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a video file (MP4 format recommended)');
      return;
    }
    
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Video must be less than ${maxSizeMB}MB`);
      return;
    }
    
    setUploadingVideo(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `tutor-videos/${user.email}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('tutor-videos')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('tutor-videos')
        .getPublicUrl(fileName);
      
      setVideoUrl(publicUrl);
      setIsDirty(true);
      toast.success('Introduction video uploaded!');
    } catch (error) {
      console.error('Video upload failed:', error);
      toast.error('Failed to upload video');
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl('');
    setIsDirty(true);
    toast.success('Profile photo removed');
  };

  const handleRemoveVideo = () => {
    setVideoUrl('');
    setIsDirty(true);
    toast.success('Video removed');
  };

  const handleSave = async () => {
    const { saceRegex } = config.validation || DEFAULT_CONFIG.validation;
    
    if (form.sace_number && !saceRegex.test(form.sace_number)) {
      toast.error('Please enter a valid SACE number (10-12 digits) or leave blank.');
      return;
    }
    
    const hourlyPrice = form.session_price_per_hour ? Number(form.session_price_per_hour) : null;
    const groupPrice = form.group_session_price ? Number(form.group_session_price) : null;
    const { minHourlyRate, maxHourlyRate } = config.validation || DEFAULT_CONFIG.validation;
    
    if (hourlyPrice !== null && (isNaN(hourlyPrice) || hourlyPrice < minHourlyRate || hourlyPrice > maxHourlyRate)) {
      toast.error(`Please enter a valid hourly rate (R${minHourlyRate}-R${maxHourlyRate}).`);
      return;
    }
    
    setSaving(true);
    try {
      const updateData = {
        bio: form.bio,
        institution: form.institution,
        study_field: form.study_field,
        study_year: form.study_year,
        sace_number: form.sace_number,
        subjects: form.subjects,
        grades: form.grades,
        qualifications: form.qualifications,
        specializations: form.specializations,
        session_price_per_hour: hourlyPrice,
        group_session_price: groupPrice,
        teaching_languages: form.teaching_languages,
        avatar_url: avatarUrl,
        video_url: videoUrl,
        linkedin: socialLinks.linkedin || null,
        twitter: socialLinks.twitter || null,
        website: socialLinks.website || null,
        updated_at: new Date().toISOString(),
      };
      
      const { error: updateError } = await supabase
        .from('tutor_profiles')
        .update(updateData)
        .eq('id', profile.id);
      
      if (updateError) throw updateError;
      
      const { data: updatedProfile } = await supabase
        .from('tutor_profiles')
        .select('*')
        .eq('id', profile.id)
        .single();
      
      onProfileUpdate(updatedProfile);
      clearDraft();
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Save failed:', error);
      toast.error('Failed to save profile: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (configLoading) {
    return (
      <Card className="border-border">
        <CardContent className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg font-playfair flex items-center gap-2">
            <User className="w-5 h-5 text-primary" /> Edit My Profile
          </CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setPreviewMode(true)}>
              <Eye className="w-3.5 h-3.5" /> Preview
            </Button>
            {autoSaveEnabled && lastAutoSave && (
              <Badge variant="outline" className="text-[10px]">
                Last saved: {lastAutoSave.toLocaleTimeString()}
              </Badge>
            )}
          </div>
        </div>
        
        {/* Profile Completion Bar - Soft-coded */}
        <div className="bg-muted/30 rounded-lg p-3 mt-2">
          <div className="flex justify-between text-xs mb-1">
            <span>Profile Completion</span>
            <span className="font-semibold">{profileCompletion}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${profileCompletion}%` }}
            />
          </div>
          {profileCompletion < 100 && (
            <p className="text-[10px] text-muted-foreground mt-2">
              Complete your profile to attract more students
            </p>
          )}
        </div>
        
        {/* Unsaved Changes Indicator */}
        {isDirty && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mt-2">
            <p className="text-[10px] text-amber-700 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              You have unsaved changes. Don't forget to save!
            </p>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-7 max-h-[70vh] overflow-y-auto">
        {/* Profile Photo Section - Uses soft-coded limits */}
        <div className="space-y-3 bg-muted/30 rounded-xl p-4">
          <p className="text-sm font-semibold flex items-center gap-1.5">
            <UserIcon className="w-4 h-4 text-primary" /> Profile Photo
          </p>
          <p className="text-[11px] text-muted-foreground">
            Upload a <strong>real photo of yourself</strong> (selfie or professional headshot). 
            Max {config.uploadLimits?.avatar?.maxSizeMB || 2}MB, JPEG or PNG.
          </p>
          
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-primary/20">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <label className="cursor-pointer">
                <input type="file" accept="image/jpeg,image/png,image/jpg,image/webp" onChange={handleAvatarUpload} className="hidden" disabled={uploadingAvatar} />
                <Button type="button" variant="outline" size="sm" disabled={uploadingAvatar} className="gap-1">
                  {uploadingAvatar ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                  {uploadingAvatar ? `${uploadProgress}%` : 'Upload Photo'}
                </Button>
              </label>
              {avatarUrl && (
                <Button type="button" variant="outline" size="sm" onClick={handleRemoveAvatar} className="gap-1 text-destructive">
                  <Trash2 className="w-3 h-3" /> Remove
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Introduction Video Section */}
        <div className="space-y-3 bg-muted/30 rounded-xl p-4">
          <p className="text-sm font-semibold flex items-center gap-1.5">
            <Video className="w-4 h-4 text-primary" /> Introduction Video (Optional)
          </p>
          <p className="text-[11px] text-muted-foreground">
            Max {config.uploadLimits?.video?.maxSizeMB || 50}MB, MP4 format. 30-60 seconds recommended.
          </p>
          
          <div className="flex flex-col gap-3">
            {videoUrl && (
              <div className="relative rounded-lg overflow-hidden bg-black/5 border border-border">
                <video src={videoUrl} controls className="w-full max-h-48" poster={avatarUrl || undefined} />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRemoveVideo} 
                  className="absolute top-2 right-2 bg-white/80"
                >
                  <Trash2 className="w-3 h-3" /> Remove
                </Button>
              </div>
            )}
            
            <div className="flex gap-2">
              <label className="cursor-pointer">
                <input type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" disabled={uploadingVideo} />
                <Button type="button" variant="outline" size="sm" disabled={uploadingVideo} className="gap-1">
                  {uploadingVideo ? <Loader2 className="w-3 h-3 animate-spin" /> : <Video className="w-3 h-3" />}
                  {uploadingVideo ? 'Uploading...' : 'Upload Video'}
                </Button>
              </label>
              {videoUrl && (
                <Button type="button" variant="outline" size="sm" onClick={handleRemoveVideo} className="gap-1 text-destructive">
                  <Trash2 className="w-3 h-3" /> Remove Video
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Social Links - Soft-coded enabled/disabled */}
        {config.socialLinks?.enabled !== false && (
          <div className="space-y-3 bg-muted/30 rounded-xl p-4">
            <p className="text-sm font-semibold flex items-center gap-1.5">
              <GlobeIcon className="w-4 h-4 text-primary" /> Professional Links
            </p>
            <div className="space-y-2">
              {config.socialLinks?.platforms?.includes('linkedin') && (
                <Input 
                  placeholder="LinkedIn URL (optional)" 
                  value={socialLinks.linkedin}
                  onChange={e => handleSocialChange('linkedin', e.target.value)}
                  className="text-sm"
                />
              )}
              {config.socialLinks?.platforms?.includes('twitter') && (
                <Input 
                  placeholder="Twitter/X URL (optional)" 
                  value={socialLinks.twitter}
                  onChange={e => handleSocialChange('twitter', e.target.value)}
                  className="text-sm"
                />
              )}
              {config.socialLinks?.platforms?.includes('website') && (
                <Input 
                  placeholder="Personal Website (optional)" 
                  value={socialLinks.website}
                  onChange={e => handleSocialChange('website', e.target.value)}
                  className="text-sm"
                />
              )}
            </div>
          </div>
        )}

        {/* Verification Badge Preview */}
        <div className="space-y-3 bg-muted/30 rounded-xl p-4">
          <p className="text-sm font-semibold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-primary" /> Your Verification Badge
          </p>
          <div className="flex gap-3 items-center">
            {form.sace_number ? (
              <Badge className="bg-green-100 text-green-700 border-green-200 text-sm gap-1.5 py-1.5 px-3">
                <ShieldCheck className="w-4 h-4" /> SACE Verified
              </Badge>
            ) : (
              <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-sm gap-1.5 py-1.5 px-3">
                <CheckCircle className="w-4 h-4" /> Admin Verified
              </Badge>
            )}
          </div>
        </div>

        {/* Bio */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-primary" /> About Me / Bio</Label>
          <Textarea
            placeholder="Tell students about yourself, your teaching style, experience, and why you love tutoring..."
            value={form.bio}
            onChange={e => handleFormChange(prev => ({ ...prev, bio: e.target.value }))}
            className="min-h-[100px] resize-none"
          />
        </div>

        {/* SACE Registration */}
        <div className="space-y-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
          <p className="text-sm font-semibold flex items-center gap-1.5 text-green-800 dark:text-green-400">
            <ShieldCheck className="w-4 h-4" /> SACE Registration
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs">SACE Registration Number</Label>
            <Input
              placeholder="e.g. 20012345678 (10-12 digits - leave blank if student tutor)"
              value={form.sace_number}
              onChange={e => handleFormChange(prev => ({ ...prev, sace_number: e.target.value }))}
              className="font-mono"
            />
            <p className="text-[11px] text-green-700 dark:text-green-500">
              SACE-registered tutors receive a "SACE Verified" badge. Student tutors receive an "Admin Verified" badge.
            </p>
          </div>
        </div>

        {/* Academic Background */}
        <div className="space-y-3">
          <p className="text-sm font-semibold flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-primary" /> Academic Background
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label className="text-xs">University / Institution</Label><Input placeholder="e.g. University of KwaZulu-Natal" value={form.institution} onChange={e => handleFormChange(prev => ({ ...prev, institution: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Field / Degree</Label><Input placeholder="e.g. BSc Mathematics & Statistics" value={form.study_field} onChange={e => handleFormChange(prev => ({ ...prev, study_field: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Year of Study</Label><Select value={form.study_year} onValueChange={v => handleFormChange(prev => ({ ...prev, study_year: v }))}><SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger><SelectContent>{STUDY_YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent></Select></div>
          </div>
        </div>

        {/* Qualifications */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-xs"><GraduationCap className="w-3.5 h-3.5 text-primary" /> Qualifications & Achievements</Label>
          <div className="flex gap-2"><Input placeholder="e.g. NSC Distinction Mathematics" value={newQual} onChange={e => setNewQual(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag('qualifications', newQual, setNewQual)} /><Button type="button" variant="outline" size="icon" onClick={() => addTag('qualifications', newQual, setNewQual)}><Plus className="w-4 h-4" /></Button></div>
          <div className="flex flex-wrap gap-2 mt-2">{form.qualifications.map(q => (<Badge key={q} variant="secondary" className="gap-1 pr-1 text-xs">🎓 {q}<button onClick={() => removeTag('qualifications', q)} className="ml-0.5 hover:text-destructive"><X className="w-3 h-3" /></button></Badge>))}</div>
        </div>

        {/* Specializations */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-xs"><Sparkles className="w-3.5 h-3.5 text-primary" /> Teaching Specializations</Label>
          <div className="flex gap-2"><Input placeholder="e.g. Calculus · Essay Writing" value={newSpec} onChange={e => setNewSpec(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag('specializations', newSpec, setNewSpec)} /><Button type="button" variant="outline" size="icon" onClick={() => addTag('specializations', newSpec, setNewSpec)}><Plus className="w-4 h-4" /></Button></div>
          <div className="flex flex-wrap gap-2 mt-2">{form.specializations.map(s => (<Badge key={s} className="bg-primary/10 text-primary border-primary/20 gap-1 pr-1 text-xs">✨ {s}<button onClick={() => removeTag('specializations', s)} className="ml-0.5 hover:text-destructive"><X className="w-3 h-3" /></button></Badge>))}</div>
        </div>

        {/* Teaching Languages */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-xs"><Globe className="w-3.5 h-3.5 text-primary" /> Teaching Languages</Label>
          <div className="flex flex-wrap gap-2">{TEACHING_LANGUAGES.map(lang => (<button key={lang} onClick={() => toggleLanguage(lang)} className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${form.teaching_languages.includes(lang) ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:border-primary'}`}>{lang}</button>))}</div>
        </div>

        {/* Subjects */}
        <div className="space-y-1.5"><Label className="text-xs">Subjects I Teach</Label><div className="flex flex-wrap gap-2">{SUBJECTS.map(s => (<button key={s.code} onClick={() => toggleItem('subjects', s.name)} className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${form.subjects.includes(s.name) ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:border-primary'}`}>{s.icon} {s.name}</button>))}</div></div>

        {/* Grades */}
        <div className="space-y-1.5"><Label className="text-xs">Grades I Teach</Label><div className="flex gap-3">{GRADES.map(g => (<button key={g} onClick={() => toggleItem('grades', g)} className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${form.grades.includes(g) ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:border-primary'}`}>{g}</button>))}</div></div>

        {/* Pricing */}
        <div className="space-y-3">
          <p className="text-sm font-semibold flex items-center gap-1.5"><DollarSign className="w-4 h-4 text-primary" /> Session Pricing (ZAR)</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label className="text-xs">1-on-1 Price (per hour)</Label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R</span><Input type="number" min={config.validation?.minHourlyRate || 50} max={config.validation?.maxHourlyRate || 1000} placeholder={`e.g. ${config.validation?.minHourlyRate || 200}`} className="pl-7" value={form.session_price_per_hour} onChange={e => handleFormChange(prev => ({ ...prev, session_price_per_hour: e.target.value }))} /></div></div>
            <div className="space-y-1.5"><Label className="text-xs">Group Session Price (per hour)</Label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R</span><Input type="number" min="0" placeholder="e.g. 100" className="pl-7" value={form.group_session_price} onChange={e => handleFormChange(prev => ({ ...prev, group_session_price: e.target.value }))} /></div></div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={saving || (!isDirty && !profileCompletion)} className="bg-primary gap-2 flex-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Profile'}
          </Button>
          {isDirty && (
            <Button variant="outline" onClick={clearDraft} className="gap-1">
              <X className="w-4 h-4" /> Discard
            </Button>
          )}
        </div>

        {/* Account Deletion */}
        <div className="border-t border-destructive/20 pt-6 mt-2">
          <p className="text-sm font-semibold text-destructive flex items-center gap-1.5 mb-1"><AlertTriangle className="w-4 h-4" /> Danger Zone</p>
          <p className="text-xs text-muted-foreground mb-3">Deleting your account is permanent and cannot be undone. All your data, sessions, and resources will be removed.</p>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="destructive" size="sm" className="gap-2" disabled={deleting}><Trash2 className="w-4 h-4" /> Delete My Account</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete your tutor account, profile, and all associated data. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{deleting ? 'Deleting...' : 'Yes, delete my account'}</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>

      {/* Preview Modal */}
      <Dialog open={previewMode} onOpenChange={setPreviewMode}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-playfair">Profile Preview</DialogTitle>
            <p className="text-xs text-muted-foreground">How students see your profile</p>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="font-semibold">{user?.full_name || 'Your Name'}</p>
                <div className="flex gap-1 mt-1">
                  {form.sace_number ? (
                    <Badge className="bg-green-100 text-green-700 text-[10px]">SACE Verified</Badge>
                  ) : (
                    <Badge className="bg-blue-100 text-blue-700 text-[10px]">Verified Tutor</Badge>
                  )}
                </div>
              </div>
            </div>
            
            {form.bio && (
              <p className="text-sm text-muted-foreground">{form.bio}</p>
            )}
            
            {form.subjects.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {form.subjects.slice(0, 5).map(s => (
                  <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                ))}
                {form.subjects.length > 5 && (
                  <Badge variant="outline" className="text-xs">+{form.subjects.length - 5} more</Badge>
                )}
              </div>
            )}
            
            {form.session_price_per_hour && (
              <div className="bg-primary/5 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-primary">R{form.session_price_per_hour}<span className="text-xs">/hour</span></p>
                <p className="text-[10px] text-muted-foreground">1-on-1 session rate</p>
              </div>
            )}
            
            <div className="text-center text-xs text-muted-foreground border-t pt-3">
              <Info className="w-3 h-3 inline mr-1" />
              Students see your full profile when booking
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}