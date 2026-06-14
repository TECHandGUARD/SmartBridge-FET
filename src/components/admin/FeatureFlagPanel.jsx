import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Lock, Unlock, Plus, X, ChevronDown, ChevronUp, ToggleLeft } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_FEATURES = [
  { feature_key: 'quiz', label: 'Practice Quizzes', description: 'AI-generated quizzes for students', is_enabled: true },
  { feature_key: 'study_rooms', label: 'Group Study Rooms', description: 'Collaborative study room boards', is_enabled: true },
  { feature_key: 'tutors', label: 'Tutor Booking', description: 'Students can browse and book tutors', is_enabled: true },
  { feature_key: 'forum', label: 'Community Forum', description: 'Public discussion forum', is_enabled: true },
  { feature_key: 'resources_library', label: 'Resources Library', description: 'Download study materials and CAPS docs', is_enabled: true },
  { feature_key: 'video_lessons', label: 'Video Lessons', description: 'Video lesson library', is_enabled: true },
  { feature_key: 'opportunities', label: 'Student Opportunities', description: 'University applications, bursaries, NBT', is_enabled: true },
  { feature_key: 'ai_assistant', label: 'AI Assistant', description: 'AI study and opportunities assistant chat', is_enabled: true },
  { feature_key: 'bursaries', label: 'Bursary Finder', description: 'Bursary search and recommendations', is_enabled: true },
  { feature_key: 'tutor_dashboard', label: 'Tutor Dashboard', description: 'Full tutor management dashboard', is_enabled: true },
  { feature_key: 'parent_dashboard', label: 'Parent Dashboard', description: 'Parent child-monitoring dashboard', is_enabled: true },
  { feature_key: 'counselor_dashboard', label: 'Counselor Dashboard', description: 'School counselor portal', is_enabled: true },
  { feature_key: 'premium_upgrade', label: 'Premium Upgrade', description: 'Allow users to upgrade to premium', is_enabled: true },
];

export default function FeatureFlagPanel() {
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [expandedKey, setExpandedKey] = useState(null);
  const [newEmailInputs, setNewEmailInputs] = useState({});

  useEffect(() => {
    loadFlags();
  }, []);

  const loadFlags = async () => {
    setLoading(true);
    try {
      const { data: existing, error } = await supabase
        .from('feature_toggles')
        .select('*');
      
      if (error) throw error;
      
      // Merge defaults with existing records
      const merged = DEFAULT_FEATURES.map(def => {
        const found = existing?.find(e => e.feature_key === def.feature_key);
        if (found) {
          return { ...def, ...found };
        }
        return def;
      });
      
      // Also include any custom flags not in defaults
      existing?.forEach(e => {
        if (!merged.find(m => m.feature_key === e.feature_key)) {
          merged.push(e);
        }
      });
      
      setFlags(merged);
    } catch (err) {
      console.error('Failed to load feature flags:', err);
      toast.error(`Failed to load: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const saveFlag = async (flag) => {
    setSaving(flag.feature_key);
    try {
      let result;
      
      if (flag.id) {
        // Update existing
        const { data, error } = await supabase
          .from('feature_toggles')
          .update({
            is_enabled: flag.is_enabled,
            locked_message: flag.locked_message,
            disabled_for_emails: flag.disabled_for_emails || [],
            enabled_for_emails: flag.enabled_for_emails || [],
          })
          .eq('id', flag.id)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      } else {
        // Create new
        const { data, error } = await supabase
          .from('feature_toggles')
          .insert({
            feature_key: flag.feature_key,
            label: flag.label,
            description: flag.description,
            is_enabled: flag.is_enabled,
            locked_message: flag.locked_message || '',
            disabled_for_emails: flag.disabled_for_emails || [],
            enabled_for_emails: flag.enabled_for_emails || [],
          })
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      }
      
      setFlags(prev => prev.map(f => f.feature_key === flag.feature_key ? { ...flag, id: result.id } : f));
      toast.success(`${flag.label} ${flag.is_enabled ? 'enabled' : 'disabled'}`);
    } catch (err) {
      console.error('Failed to save feature flag:', err);
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setSaving(null);
    }
  };

  const toggleFlag = (featureKey) => {
    const flag = flags.find(f => f.feature_key === featureKey);
    const updated = { ...flag, is_enabled: !flag.is_enabled };
    setFlags(prev => prev.map(f => f.feature_key === featureKey ? updated : f));
    saveFlag(updated);
  };

  const updateMessage = (featureKey, msg) => {
    setFlags(prev => prev.map(f => f.feature_key === featureKey ? { ...f, locked_message: msg } : f));
  };

  const addEmail = (featureKey, field) => {
    const inputKey = `${featureKey}_${field}`;
    const email = (newEmailInputs[inputKey] || '').trim().toLowerCase();
    if (!email) return;
    if (!email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    setFlags(prev => prev.map(f => {
      if (f.feature_key !== featureKey) return f;
      const list = f[field] || [];
      if (list.includes(email)) return f;
      return { ...f, [field]: [...list, email] };
    }));
    setNewEmailInputs(prev => ({ ...prev, [inputKey]: '' }));
  };

  const removeEmail = (featureKey, field, email) => {
    setFlags(prev => prev.map(f => {
      if (f.feature_key !== featureKey) return f;
      return { ...f, [field]: (f[field] || []).filter(e => e !== email) };
    }));
  };

  const saveOverrides = async (featureKey) => {
    const flag = flags.find(f => f.feature_key === featureKey);
    await saveFlag(flag);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  const enabledCount = flags.filter(f => f.is_enabled !== false).length;
  const disabledCount = flags.length - enabledCount;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex gap-3 flex-wrap">
        <Badge className="bg-green-100 text-green-700 px-3 py-1 text-sm gap-1.5">
          <Unlock className="w-3.5 h-3.5" /> {enabledCount} Active
        </Badge>
        <Badge className="bg-red-100 text-red-700 px-3 py-1 text-sm gap-1.5">
          <Lock className="w-3.5 h-3.5" /> {disabledCount} Locked
        </Badge>
      </div>

      <div className="space-y-2">
        {flags.map(flag => (
          <Card key={flag.feature_key} className={`border transition-colors ${flag.is_enabled === false ? 'border-destructive/30 bg-destructive/5' : 'border-border'}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{flag.label}</p>
                    {flag.is_enabled === false
                      ? <Badge className="bg-red-100 text-red-600 text-xs gap-1"><Lock className="w-3 h-3" /> Locked</Badge>
                      : <Badge className="bg-green-100 text-green-700 text-xs gap-1"><Unlock className="w-3 h-3" /> Active</Badge>
                    }
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{flag.description}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {saving === flag.feature_key && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                  <Switch
                    checked={flag.is_enabled !== false}
                    onCheckedChange={() => toggleFlag(flag.feature_key)}
                    disabled={saving === flag.feature_key}
                  />
                  <button
                    onClick={() => setExpandedKey(expandedKey === flag.feature_key ? null : flag.feature_key)}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1"
                  >
                    {expandedKey === flag.feature_key ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Expanded overrides panel */}
              {expandedKey === flag.feature_key && (
                <div className="mt-4 pt-4 border-t border-border space-y-4">
                  {/* Locked message */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Message shown to users when locked</Label>
                    <div className="flex gap-2">
                      <Input
                        value={flag.locked_message || ''}
                        onChange={e => updateMessage(flag.feature_key, e.target.value)}
                        placeholder="e.g. This feature is temporarily unavailable for maintenance."
                        className="text-xs"
                      />
                      <Button size="sm" variant="outline" onClick={() => saveFlag(flag)} disabled={saving === flag.feature_key}>
                        Save
                      </Button>
                    </div>
                  </div>

                  {/* Per-user overrides */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* Disabled for specific users */}
                    <div className="space-y-2">
                      <Label className="text-xs text-destructive font-semibold">Block specific users (even if globally on)</Label>
                      <div className="flex gap-1.5">
                        <Input
                          value={newEmailInputs[`${flag.feature_key}_disabled_for_emails`] || ''}
                          onChange={e => setNewEmailInputs(prev => ({ ...prev, [`${flag.feature_key}_disabled_for_emails`]: e.target.value }))}
                          placeholder="user@email.com"
                          className="text-xs h-8"
                          onKeyDown={e => e.key === 'Enter' && addEmail(flag.feature_key, 'disabled_for_emails')}
                        />
                        <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => addEmail(flag.feature_key, 'disabled_for_emails')}>
                          <Plus className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(flag.disabled_for_emails || []).map(email => (
                          <Badge key={email} variant="outline" className="text-xs gap-1 border-destructive/40 text-destructive">
                            {email}
                            <button onClick={() => removeEmail(flag.feature_key, 'disabled_for_emails', email)}>
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Enabled for specific users */}
                    <div className="space-y-2">
                      <Label className="text-xs text-green-700 font-semibold">Allow specific users (even if globally off)</Label>
                      <div className="flex gap-1.5">
                        <Input
                          value={newEmailInputs[`${flag.feature_key}_enabled_for_emails`] || ''}
                          onChange={e => setNewEmailInputs(prev => ({ ...prev, [`${flag.feature_key}_enabled_for_emails`]: e.target.value }))}
                          placeholder="user@email.com"
                          className="text-xs h-8"
                          onKeyDown={e => e.key === 'Enter' && addEmail(flag.feature_key, 'enabled_for_emails')}
                        />
                        <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => addEmail(flag.feature_key, 'enabled_for_emails')}>
                          <Plus className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(flag.enabled_for_emails || []).map(email => (
                          <Badge key={email} variant="outline" className="text-xs gap-1 border-green-400 text-green-700">
                            {email}
                            <button onClick={() => removeEmail(flag.feature_key, 'enabled_for_emails', email)}>
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Save overrides */}
                  {((flag.disabled_for_emails?.length > 0) || (flag.enabled_for_emails?.length > 0)) && (
                    <Button size="sm" className="bg-primary gap-1.5" onClick={() => saveOverrides(flag.feature_key)} disabled={saving === flag.feature_key}>
                      {saving === flag.feature_key ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                      Save User Overrides
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}