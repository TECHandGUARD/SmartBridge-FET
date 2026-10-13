import { Linkedin, Twitter, Shield, AlertCircle } from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { SUBJECTS } from '@/lib/subjects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { User, Plus, X, Save, Loader2, GraduationCap, DollarSign, ShieldCheck, Sparkles, Globe, Trash2, AlertTriangle, Upload, Video, User as UserIcon, CheckCircle, Eye, Globe as GlobeIcon } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
const appName = import.meta.env.VITE_APP_NAME || 'SmartBridge FET';
const DEFAULT_CONFIG = {
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
    specializations: 5
  },
  uploadLimits: {
    avatar: {
      maxSizeMB: 2,
      allowedTypes: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
    },
    video: {
      maxSizeMB: 50,
      allowedTypes: ['video/mp4', 'video/quicktime']
    }
  },
  validation: {
    saceRegex: /^\d{10,12}$/,
    minHourlyRate: 50,
    maxHourlyRate: 1000
  },
  autoSave: {
    enabled: true,
    intervalSeconds: 30
  },
  socialLinks: {
    enabled: true,
    platforms: ['linkedin', 'twitter', 'website']
  }
};
const useProfileConfig = () => {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const {
          data,
          error
        } = await supabase.from('system_configuration').select('value').eq('key', 'tutor_profile_config').single();
        if (!error && data?.value) {
          setConfig(prev => ({
            ...prev,
            ...data.value
          }));
        }
      } catch (err) {
        console.warn('Using default profile config:', err);
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, []);
  return {
    config,
    loading
  };
};
const TEACHING_LANGUAGES = ['English', 'Afrikaans', 'isiZulu', 'isiXhosa', 'Sesotho', 'Setswana', 'Sepedi', 'Xitsonga', 'Other'];
const GRADES = ['Grade 10', 'Grade 11', 'Grade 12'];
const STUDY_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Honours', 'Masters', 'PhD', 'Graduated', 'N/A'];
const getDraftKey = email => `tutor_profile_draft_${email}`;
export default function TutorProfileEditor({
  profile,
  user,
  onProfileUpdate
}) {
  const {
    config,
    loading: configLoading
  } = useProfileConfig();
  const [previewMode, setPreviewMode] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(DEFAULT_CONFIG.autoSave?.enabled ?? true);
  const [lastAutoSave, setLastAutoSave] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [sessionExpiryWarning, setSessionExpiryWarning] = useState(false);
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
    session_price_per_hour: profile?.session_price_per_hour ?? profile?.hourly_rate ?? '',
    group_session_price: profile?.group_session_price || '',
    teaching_languages: profile?.teaching_languages || []
  });
  const [socialLinks, setSocialLinks] = useState({
    linkedin: profile?.metadata?.social_links?.linkedin || '',
    twitter: profile?.metadata?.social_links?.twitter || '',
    website: profile?.metadata?.social_links?.website || ''
  });
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [videoUrl, setVideoUrl] = useState(profile?.metadata?.video_url || '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [newQual, setNewQual] = useState('');
  const [newSpec, setNewSpec] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!configLoading && config.autoSave) {
      setAutoSaveEnabled(config.autoSave.enabled ?? true);
    }
  }, [config, configLoading]);
  const profileCompletion = useMemo(() => {
    const weights = config.completionWeights || DEFAULT_CONFIG.completionWeights;
    let score = 0;
    let total = 0;
    Object.entries(weights).forEach(([field, weight]) => {
      total += weight;
      if (field === 'avatar_url' && avatarUrl) score += weight;else if (field === 'bio' && form.bio?.trim()) score += weight;else if (field === 'institution' && form.institution?.trim()) score += weight;else if (field === 'study_field' && form.study_field?.trim()) score += weight;else if (field === 'qualifications' && form.qualifications?.length > 0) score += weight;else if (field === 'subjects' && form.subjects?.length > 0) score += weight;else if (field === 'grades' && form.grades?.length > 0) score += weight;else if (field === 'session_price_per_hour' && form.session_price_per_hour) score += weight;else if (field === 'teaching_languages' && form.teaching_languages?.length > 0) score += weight;else if (field === 'specializations' && form.specializations?.length > 0) score += weight;
    });
    return total > 0 ? Math.round(score / total * 100) : 0;
  }, [form, avatarUrl, config.completionWeights]);
  const validateForm = useCallback(() => {
    const errors = {};
    const {
      saceRegex,
      minHourlyRate,
      maxHourlyRate
    } = config.validation || DEFAULT_CONFIG.validation;
    if (form.sace_number && !saceRegex.test(form.sace_number)) {
      errors.sace_number = 'Invalid SACE number (10-12 digits)';
    }
    if (form.session_price_per_hour) {
      const price = Number(form.session_price_per_hour);
      if (isNaN(price) || price < minHourlyRate || price > maxHourlyRate) {
        errors.session_price_per_hour = `Rate must be between R${minHourlyRate} and R${maxHourlyRate}`;
      }
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [form, config.validation]);
  useEffect(() => {
    validateForm();
  }, [form.sace_number, form.session_price_per_hour, validateForm]);
  useEffect(() => {
    const checkSession = async () => {
      const {
        data
      } = await supabase.auth.getSession();
      if (data?.session) {
        const expiresAt = new Date(data.session.expires_at * 1000);
        const now = new Date();
        const minutesLeft = (expiresAt - now) / 1000 / 60;
        if (minutesLeft < 10 && minutesLeft > 0) {
          setSessionExpiryWarning(true);
        } else {
          setSessionExpiryWarning(false);
        }
      }
    };
    const interval = setInterval(checkSession, 60000);
    checkSession();
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (!autoSaveEnabled || !user?.email || !isDirty || saving) return;
    const autoSaveInterval = setInterval(() => {
      const draftData = {
        form,
        socialLinks,
        avatarUrl,
        videoUrl,
        updatedAt: new Date().toISOString()
      };
      const draftKey = getDraftKey(user.email);
      localStorage.setItem(draftKey, JSON.stringify(draftData));
      setLastAutoSave(new Date());
      console.log('📝 Profile draft auto-saved');
    }, (config.autoSave?.intervalSeconds || 30) * 1000);
    return () => clearInterval(autoSaveInterval);
  }, [form, socialLinks, avatarUrl, videoUrl, autoSaveEnabled, isDirty, saving, user?.email, config.autoSave?.intervalSeconds]);
  useEffect(() => {
    if (!user?.email || profile?.id) return;
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
  const clearDraft = useCallback(() => {
    if (!user?.email) return;
    const draftKey = getDraftKey(user.email);
    localStorage.removeItem(draftKey);
    setIsDirty(false);
  }, [user?.email]);
  useEffect(() => {
    const handleBeforeUnload = e => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);
  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase.channel('tutor_profile_updates').on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'tutor_profiles',
      filter: `id=eq.${profile.id}`
    }, payload => {
      if (payload.new && onProfileUpdate) {
        onProfileUpdate(payload.new);
        toast.info('Profile updated from another session');
      }
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, onProfileUpdate]);
  const logActivity = async (eventType, description, metadata = {}) => {
    try {
      await supabase.from('activity_log').insert({
        event_type: eventType,
        user_email: user?.email,
        user_id: user?.id || null,
        description,
        metadata: {
          profile_id: profile?.id,
          ...metadata
        }
      });
    } catch (err) {
      console.warn('Activity log error:', err);
    }
  };
  const handleFormChange = updater => {
    setForm(updater);
    setIsDirty(true);
    setError(null);
  };
  const handleSocialChange = (field, value) => {
    setSocialLinks(prev => ({
      ...prev,
      [field]: value
    }));
    setIsDirty(true);
  };
  const toggleItem = (field, value) => {
    handleFormChange(prev => ({
      ...prev,
      [field]: prev[field].includes(value) ? prev[field].filter(i => i !== value) : [...prev[field], value]
    }));
  };
  const addTag = (field, value, setter) => {
    const trimmed = value.trim();
    if (!trimmed || form[field].includes(trimmed)) return;
    handleFormChange(prev => ({
      ...prev,
      [field]: [...prev[field], trimmed]
    }));
    setter('');
  };
  const removeTag = (field, value) => {
    handleFormChange(prev => ({
      ...prev,
      [field]: prev[field].filter(i => i !== value)
    }));
  };
  const toggleLanguage = lang => {
    handleFormChange(prev => ({
      ...prev,
      teaching_languages: prev.teaching_languages.includes(lang) ? prev.teaching_languages.filter(l => l !== lang) : [...prev.teaching_languages, lang]
    }));
  };
  const handleAvatarUpload = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const {
      allowedTypes,
      maxSizeMB
    } = config.uploadLimits?.avatar || DEFAULT_CONFIG.uploadLimits.avatar;
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
    setError(null);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `tutor-avatars/${user.email}_${Date.now()}.${fileExt}`;
      const interval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);
      const {
        error: uploadError
      } = await supabase.storage.from('avatars').upload(fileName, file);
      clearInterval(interval);
      if (uploadError) throw uploadError;
      const {
        data: {
          publicUrl
        }
      } = supabase.storage.from('avatars').getPublicUrl(fileName);
      setAvatarUrl(publicUrl);
      setUploadProgress(100);
      setIsDirty(true);
      toast.success('Profile photo uploaded!');
      await logActivity('avatar_uploaded', 'Uploaded profile photo');
      setTimeout(() => setUploadProgress(0), 1000);
    } catch (error) {
      console.error('Avatar upload failed:', error);
      setError(error.message || 'Failed to upload photo');
      toast.error('Failed to upload photo. Please try again.');
    } finally {
      setUploadingAvatar(false);
    }
  };
  const handleVideoUpload = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const {
      allowedTypes,
      maxSizeMB
    } = config.uploadLimits?.video || DEFAULT_CONFIG.uploadLimits.video;
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a video file (MP4 format recommended)');
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Video must be less than ${maxSizeMB}MB`);
      return;
    }
    setUploadingVideo(true);
    setError(null);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `tutor-videos/${user.email}_${Date.now()}.${fileExt}`;
      const {
        error: uploadError
      } = await supabase.storage.from('videos').upload(fileName, file);
      if (uploadError) throw uploadError;
      const {
        data: {
          publicUrl
        }
      } = supabase.storage.from('videos').getPublicUrl(fileName);
      setVideoUrl(publicUrl);
      setIsDirty(true);
      toast.success('Introduction video uploaded!');
      await logActivity('video_uploaded', 'Uploaded introduction video');
    } catch (error) {
      console.error('Video upload failed:', error);
      setError(error.message || 'Failed to upload video');
      toast.error('Failed to upload video');
    } finally {
      setUploadingVideo(false);
    }
  };
  const handleRemoveAvatar = async () => {
    setAvatarUrl('');
    setIsDirty(true);
    toast.success('Profile photo removed');
    await logActivity('avatar_removed', 'Removed profile photo');
  };
  const handleRemoveVideo = async () => {
    setVideoUrl('');
    setIsDirty(true);
    toast.success('Video removed');
    await logActivity('video_removed', 'Removed introduction video');
  };
  const handleSave = async () => {
    const {
      saceRegex,
      minHourlyRate,
      maxHourlyRate
    } = config.validation || DEFAULT_CONFIG.validation;
    if (form.sace_number && !saceRegex.test(form.sace_number)) {
      toast.error('Please enter a valid SACE number (10-12 digits) or leave blank.');
      return;
    }
    const hourlyPrice = form.session_price_per_hour ? Number(form.session_price_per_hour) : null;
    if (hourlyPrice !== null && (isNaN(hourlyPrice) || hourlyPrice < minHourlyRate || hourlyPrice > maxHourlyRate)) {
      toast.error(`Please enter a valid hourly rate (R${minHourlyRate}-R${maxHourlyRate}).`);
      return;
    }
    const groupPrice = form.group_session_price ? Number(form.group_session_price) : null;
    if(groupPrice!==null && (!Number.isFinite(groupPrice)||groupPrice<0)) {toast.error('Enter a valid group price');return;}
    setSaving(true);
    setError(null);
    try {
      const updateData = {
        bio: form.bio,
        institution: form.institution,
        study_field: form.study_field,
        study_year: form.study_year,
        sace_number: form.sace_number || null,
        subjects: form.subjects,
        grades: form.grades,
        qualifications: form.qualifications,
        specializations: form.specializations,
        session_price_per_hour: hourlyPrice,
        hourly_rate: hourlyPrice,
        group_session_price: groupPrice,
        teaching_languages: form.teaching_languages,
        avatar_url: avatarUrl,
        metadata: {
          ...profile.metadata,
          video_url: videoUrl,
          social_links: socialLinks
        },
        updated_at: new Date().toISOString()
      };
      const {
        error: updateError
      } = await supabase.from('tutor_profiles').update(updateData).eq('id', profile.id);
      if (updateError) throw updateError;
      const {
        data: updatedProfile
      } = await supabase.from('tutor_profiles').select('*').eq('id', profile.id).single();
      onProfileUpdate(updatedProfile);
      clearDraft();
      await logActivity('profile_updated', 'Updated tutor profile', {
        fields_updated: Object.keys(updateData).filter(k => updateData[k] !== null && updateData[k] !== '')
      });
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Save failed:', error);
      setError(error.message || 'Failed to save profile');
      toast.error('Failed to save profile: ' + error.message);
    } finally {
      setSaving(false);
    }
  };
  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await logActivity('account_delete_requested', 'Account deletion requested');
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (err) {
      console.error('Delete account error:', err);
      toast.error('Could not delete account. Contact support.');
      setDeleting(false);
    }
  };
  if (configLoading) {
    return <Card className="border-border">
        <CardContent className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </CardContent>
      </Card>;
  }
  return <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-playfair flex items-center gap-2">
              <User className="w-5 h-5 text-primary" /> Edit My Profile
            </CardTitle>
            <Badge variant="outline" className="text-[9px] text-muted-foreground flex items-center gap-1">
              <Shield className="w-3 h-3 text-green-500" /> Secure
            </Badge>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setPreviewMode(true)}>
              <Eye className="w-3.5 h-3.5" /> Preview
            </Button>
            {autoSaveEnabled && lastAutoSave && <Badge variant="outline" className="text-[10px]">
                💾 {lastAutoSave.toLocaleTimeString()}
              </Badge>}
          </div>
        </div>

        {}
        {sessionExpiryWarning && <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mt-2 dark:bg-amber-950/20 dark:border-amber-800">
            <p className="text-[10px] text-amber-700 dark:text-amber-300 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              ⚠️ Your session will expire soon. Save your changes to avoid losing them.
            </p>
          </div>}

        {}
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-2 mt-2 dark:bg-red-950/20 dark:border-red-800">
            <p className="text-xs text-red-700 dark:text-red-300 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {error}
            </p>
          </div>}

        {}
        <div className="bg-muted/30 rounded-lg p-3 mt-2 dark:bg-muted/20">
          <div className="flex justify-between text-xs mb-1">
            <span>Profile Completion</span>
            <span className="font-semibold">{profileCompletion}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{
            width: `${profileCompletion}%`
          }} />
          </div>
          {profileCompletion < 100 && <p className="text-[10px] text-muted-foreground mt-2">
              Complete your profile to attract more students
            </p>}
        </div>

        {}
        {isDirty && <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mt-2 dark:bg-amber-950/20 dark:border-amber-800">
            <p className="text-[10px] text-amber-700 dark:text-amber-300 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              You have unsaved changes. Don't forget to save!
            </p>
          </div>}
      </CardHeader>

      <CardContent className="space-y-7 max-h-[70vh] overflow-y-auto">
        {}
        <div className="space-y-3 bg-muted/30 rounded-xl p-4 dark:bg-muted/20">
          <p className="text-sm font-semibold flex items-center gap-1.5">
            <UserIcon className="w-4 h-4 text-primary" /> Profile Photo
          </p>
          <p className="text-[11px] text-muted-foreground">
            Upload a <strong>real photo of yourself</strong> (selfie or professional headshot).
            Max {config.uploadLimits?.avatar?.maxSizeMB || 2}MB, JPEG or PNG.
          </p>

          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-primary/20">
              {avatarUrl ? <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" /> : <UserIcon className="w-8 h-8 text-muted-foreground" />}
            </div>

            <div className="flex gap-2 flex-wrap">
              <label className="cursor-pointer">
                <input type="file" accept="image/jpeg,image/png,image/jpg,image/webp" onChange={handleAvatarUpload} className="hidden" disabled={uploadingAvatar} />
                <Button type="button" variant="outline" size="sm" disabled={uploadingAvatar} className="gap-1">
                  {uploadingAvatar ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                  {uploadingAvatar ? `${uploadProgress}%` : 'Upload Photo'}
                </Button>
              </label>
              {avatarUrl && <Button type="button" variant="outline" size="sm" onClick={handleRemoveAvatar} className="gap-1 text-destructive">
                  <Trash2 className="w-3 h-3" /> Remove
                </Button>}
            </div>
          </div>
        </div>

        {}
        <div className="space-y-3 bg-muted/30 rounded-xl p-4 dark:bg-muted/20">
          <p className="text-sm font-semibold flex items-center gap-1.5">
            <Video className="w-4 h-4 text-primary" /> Introduction Video (Optional)
          </p>
          <p className="text-[11px] text-muted-foreground">
            Max {config.uploadLimits?.video?.maxSizeMB || 50}MB, MP4 format. 30-60 seconds recommended.
          </p>

          <div className="flex flex-col gap-3">
            {videoUrl && <div className="relative rounded-lg overflow-hidden bg-black/5 border border-border">
                <video src={videoUrl} controls className="w-full max-h-48" poster={avatarUrl || undefined} />
                <Button type="button" variant="outline" size="sm" onClick={handleRemoveVideo} className="absolute top-2 right-2 bg-white/80 dark:bg-black/80">
                  <Trash2 className="w-3 h-3" /> Remove
                </Button>
              </div>}

            <div className="flex gap-2">
              <label className="cursor-pointer">
                <input type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" disabled={uploadingVideo} />
                <Button type="button" variant="outline" size="sm" disabled={uploadingVideo} className="gap-1">
                  {uploadingVideo ? <Loader2 className="w-3 h-3 animate-spin" /> : <Video className="w-3 h-3" />}
                  {uploadingVideo ? 'Uploading...' : 'Upload Video'}
                </Button>
              </label>
              {videoUrl && <Button type="button" variant="outline" size="sm" onClick={handleRemoveVideo} className="gap-1 text-destructive">
                  <Trash2 className="w-3 h-3" /> Remove Video
                </Button>}
            </div>
          </div>
        </div>

        {}
        {config.socialLinks?.enabled !== false && <div className="space-y-3 bg-muted/30 rounded-xl p-4 dark:bg-muted/20">
            <p className="text-sm font-semibold flex items-center gap-1.5">
              <GlobeIcon className="w-4 h-4 text-primary" /> Professional Links
            </p>
            <div className="space-y-2">
              {config.socialLinks?.platforms?.includes('linkedin') && <Input placeholder="LinkedIn URL (optional)" value={socialLinks.linkedin} onChange={e => handleSocialChange('linkedin', e.target.value)} className="text-sm" />}
              {config.socialLinks?.platforms?.includes('twitter') && <Input placeholder="Twitter/X URL (optional)" value={socialLinks.twitter} onChange={e => handleSocialChange('twitter', e.target.value)} className="text-sm" />}
              {config.socialLinks?.platforms?.includes('website') && <Input placeholder="Personal Website (optional)" value={socialLinks.website} onChange={e => handleSocialChange('website', e.target.value)} className="text-sm" />}
            </div>
          </div>}

        {}
        <div className="space-y-3 bg-muted/30 rounded-xl p-4 dark:bg-muted/20">
          <p className="text-sm font-semibold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-primary" /> Your Verification Badge
          </p>
          <div className="flex gap-3 items-center">
            {form.sace_number ? <Badge className="bg-green-100 text-green-700 border-green-200 text-sm gap-1.5 py-1.5 px-3 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800">
                <ShieldCheck className="w-4 h-4" /> SACE Verified
              </Badge> : <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-sm gap-1.5 py-1.5 px-3 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800">
                <CheckCircle className="w-4 h-4" /> Admin Verified
              </Badge>}
          </div>
        </div>

        {}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-primary" /> About Me / Bio</Label>
          <Textarea placeholder="Tell students about yourself, your teaching style, experience, and why you love tutoring..." value={form.bio} onChange={e => handleFormChange(prev => ({
          ...prev,
          bio: e.target.value
        }))} className="min-h-[100px] resize-none" />
        </div>

        {}
        <div className="space-y-3 bg-green-50 border border-green-200 rounded-xl p-4 dark:bg-green-950/20 dark:border-green-800">
          <p className="text-sm font-semibold flex items-center gap-1.5 text-green-800 dark:text-green-400">
            <ShieldCheck className="w-4 h-4" /> SACE Registration
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs">SACE Registration Number</Label>
            <Input placeholder="e.g. 20012345678 (10-12 digits - leave blank if student tutor)" value={form.sace_number} onChange={e => handleFormChange(prev => ({
            ...prev,
            sace_number: e.target.value
          }))} className={`font-mono ${validationErrors.sace_number ? 'border-red-500' : ''}`} />
            {validationErrors.sace_number && <p className="text-xs text-red-500">{validationErrors.sace_number}</p>}
          </div>
        </div>

        {}
        <div className="space-y-3">
          <p className="text-sm font-semibold flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-primary" /> Academic Background
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">University / Institution</Label>
              <Input placeholder="e.g. University of KwaZulu-Natal" value={form.institution} onChange={e => handleFormChange(prev => ({
              ...prev,
              institution: e.target.value
            }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Field of Study</Label>
              <Input placeholder="e.g. BSc Computer Science" value={form.study_field} onChange={e => handleFormChange(prev => ({
              ...prev,
              study_field: e.target.value
            }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Year of Study</Label>
              <Select value={form.study_year} onValueChange={v => handleFormChange(prev => ({
              ...prev,
              study_year: v
            }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select current year" />
                </SelectTrigger>
                <SelectContent>
                  {STUDY_YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {}
        <div className="space-y-3">
          <p className="text-sm font-semibold flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-primary" /> Pricing & Session Rates
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">One-on-One Rate (ZAR / Hour)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-semibold">R</span>
                <Input type="number" placeholder="e.g. 150" value={form.session_price_per_hour} onChange={e => handleFormChange(prev => ({
                ...prev,
                session_price_per_hour: e.target.value
              }))} className={`pl-7 ${validationErrors.session_price_per_hour ? 'border-red-500' : ''}`} />
              </div>
              {validationErrors.session_price_per_hour ? <p className="text-[11px] text-red-500">{validationErrors.session_price_per_hour}</p> : <p className="text-[10px] text-muted-foreground">
                  Recommended: R120 - R250 per hour.
                </p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Group Session Rate (ZAR / Hour / Student - Optional)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-semibold">R</span>
                <Input type="number" placeholder="e.g. 80" value={form.group_session_price} onChange={e => handleFormChange(prev => ({
                ...prev,
                group_session_price: e.target.value
              }))} className="pl-7" />
              </div>
            </div>
          </div>
        </div>

        {}
        <div className="grid sm:grid-cols-2 gap-6">
          {}
          <div className="space-y-2">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" /> Subjects You Teach
            </Label>
            <div className="flex flex-wrap gap-1.5 p-3 border rounded-xl min-h-[80px] bg-muted/10">
              {SUBJECTS.map(subject => {
              const selected = form.subjects.includes(subject);
              return <Badge key={subject} variant={selected ? 'default' : 'outline'} className="cursor-pointer transition-all active:scale-95" onClick={() => toggleItem('subjects', subject)}>
                    {subject}
                  </Badge>;
            })}
            </div>
          </div>

          {}
          <div className="space-y-2">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-primary" /> Grades You Target
            </Label>
            <div className="flex flex-wrap gap-1.5 p-3 border rounded-xl min-h-[80px] bg-muted/10">
              {GRADES.map(grade => {
              const selected = form.grades.includes(grade);
              return <Badge key={grade} variant={selected ? 'default' : 'outline'} className="cursor-pointer transition-all active:scale-95" onClick={() => toggleItem('grades', grade)}>
                    {grade}
                  </Badge>;
            })}
            </div>
          </div>
        </div>

        {}
        <div className="space-y-2">
          <Label className="text-xs font-semibold flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-primary" /> Languages You Teach In
          </Label>
          <div className="flex flex-wrap gap-1.5 p-3 border rounded-xl bg-muted/10">
            {TEACHING_LANGUAGES.map(lang => {
            const selected = form.teaching_languages.includes(lang);
            return <Badge key={lang} variant={selected ? 'default' : 'outline'} className="cursor-pointer transition-all active:scale-95" onClick={() => toggleLanguage(lang)}>
                  {lang}
                </Badge>;
          })}
          </div>
        </div>

        {}
        <div className="space-y-2">
          <Label className="text-xs font-semibold flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5 text-primary" /> Qualifications & Credentials
          </Label>
          <div className="flex gap-2">
            <Input placeholder="e.g. 95% in Grade 12 Mathematics, TEFL Certified" value={newQual} onChange={e => setNewQual(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag('qualifications', newQual, setNewQual))} className="text-xs" />
            <Button type="button" size="sm" onClick={() => addTag('qualifications', newQual, setNewQual)}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {form.qualifications.map(qual => <Badge key={qual} variant="secondary" className="gap-1 py-1 pr-1.5">
                {qual}
                <button type="button" onClick={() => removeTag('qualifications', qual)} className="hover:bg-muted p-0.5 rounded-full">
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              </Badge>)}
          </div>
        </div>

        {}
        <div className="space-y-2">
          <Label className="text-xs font-semibold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" /> Special Topics / Specializations
          </Label>
          <div className="flex gap-2">
            <Input placeholder="e.g. Calculus, Exam Prep, Special Needs" value={newSpec} onChange={e => setNewSpec(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag('specializations', newSpec, setNewSpec))} className="text-xs" />
            <Button type="button" size="sm" onClick={() => addTag('specializations', newSpec, setNewSpec)}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {form.specializations.map(spec => <Badge key={spec} variant="secondary" className="gap-1 py-1 pr-1.5">
                {spec}
                <button type="button" onClick={() => removeTag('specializations', spec)} className="hover:bg-muted p-0.5 rounded-full">
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              </Badge>)}
          </div>
        </div>

        {}
        <div className="pt-6 border-t border-border mt-8">
          <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 space-y-4">
            <div>
              <p className="text-sm font-semibold text-destructive flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Danger Zone
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Once you delete your account, all your tutor profiles, lessons, and chats will be permanently removed.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="w-fit" disabled={deleting}>
                  {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                  Delete Tutor Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action is permanent and complies with POPIA deletion rights. All personal profiles, chat transcripts, and schedules will be deleted forever.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDeleteAccount}>
                    Delete Account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {}
        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button type="button" variant="ghost" onClick={clearDraft} disabled={!isDirty}>
            Discard Changes
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </Button>
        </div>
      </CardContent>

      {}
      <Dialog open={previewMode} onOpenChange={setPreviewMode}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-playfair">Public Profile Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="flex gap-4 items-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 overflow-hidden border">
                {avatarUrl ? <img src={avatarUrl} alt="Preview Avatar" className="w-full h-full object-cover" /> : <UserIcon className="w-7 h-7 m-auto text-muted-foreground" />}
              </div>
              <div>
                <p className="text-lg font-bold flex items-center gap-1.5">
                  {user?.full_name || 'Your Name'}
                  {form.sace_number ? <Badge className="bg-green-100 text-green-700 pointer-events-none text-[10px] py-0.5">SACE</Badge> : <Badge className="bg-blue-100 text-blue-700 pointer-events-none text-[10px] py-0.5">Verified</Badge>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {form.study_field} at {form.institution}
                </p>
                <div className="flex gap-2.5 mt-2 text-muted-foreground">
                  {socialLinks.linkedin && <Linkedin className="w-4 h-4" />}
                  {socialLinks.twitter && <Twitter className="w-4 h-4" />}
                  {socialLinks.website && <GlobeIcon className="w-4 h-4" />}
                </div>
              </div>
            </div>

            {form.bio ? <p className="text-sm text-card-foreground bg-muted/20 p-3 rounded-lg border italic">
                "{form.bio}"
              </p> : <p className="text-sm text-muted-foreground italic">No bio description set yet.</p>}

            <div className="grid sm:grid-cols-2 gap-4 text-xs border-t pt-4">
              <div>
                <p className="font-semibold mb-1">Subjects & Grades</p>
                <div className="flex flex-wrap gap-1">
                  {form.subjects.map(s => <Badge key={s} variant="secondary">{s}</Badge>)}
                  {form.grades.map(g => <Badge key={g} variant="outline">{g}</Badge>)}
                </div>
              </div>
              <div>
                <p className="font-semibold mb-1">Teaching Languages</p>
                <div className="flex flex-wrap gap-1">
                  {form.teaching_languages.map(l => <Badge key={l} variant="outline">{l}</Badge>)}
                </div>
              </div>
            </div>

            <div className="border-t pt-4 flex justify-between items-center">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Rate per Hour</p>
                <p className="text-xl font-bold text-primary">R {form.session_price_per_hour || '0'}/hr</p>
              </div>
              <Button size="sm" onClick={() => setPreviewMode(false)}>
                Back to Editing
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>;
}
