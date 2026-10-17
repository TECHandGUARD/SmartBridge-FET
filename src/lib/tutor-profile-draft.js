// Drafts are local convenience copies, not a source of truth for verification.
// Keep private SACE registration numbers out of browser storage.
export const TUTOR_DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function tutorDraftKey(userId) {
  if (!userId || typeof userId !== 'string') return null;
  return `tutor_profile_draft_v2_${userId}`;
}

export function createTutorDraft({ form, socialLinks, avatarUrl, videoUrl }, now = Date.now()) {
  const safeForm = { ...(form || {}) };
  delete safeForm.sace_number;
  return {
    version: 2,
    form: safeForm,
    socialLinks: socialLinks || {},
    avatarUrl: avatarUrl || '',
    videoUrl: videoUrl || '',
    updatedAt: new Date(now).toISOString(),
  };
}

export function readTutorDraft(raw, now = Date.now()) {
  if (!raw) return null;
  try {
    const draft = JSON.parse(raw);
    const savedAt = Date.parse(draft?.updatedAt);
    if (draft?.version !== 2 || !Number.isFinite(savedAt) ||
      savedAt > now + 60_000 || now - savedAt > TUTOR_DRAFT_MAX_AGE_MS ||
      !draft.form || typeof draft.form !== 'object' || Array.isArray(draft.form)) return null;
    // Never restore credential data even if a draft was manually modified.
    const safeForm = { ...draft.form };
    delete safeForm.sace_number;
    return {
      form: safeForm,
      socialLinks: draft.socialLinks && typeof draft.socialLinks === 'object' && !Array.isArray(draft.socialLinks) ? draft.socialLinks : {},
      avatarUrl: typeof draft.avatarUrl === 'string' ? draft.avatarUrl : '',
      videoUrl: typeof draft.videoUrl === 'string' ? draft.videoUrl : '',
    };
  } catch {
    return null;
  }
}
