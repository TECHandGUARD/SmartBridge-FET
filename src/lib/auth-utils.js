export function mergeProfile(authUser, profile) {
  return { ...authUser, ...profile, id: authUser.id, email: authUser.email,
    role: profile.is_super_admin === true ? 'admin' : profile.role || 'user',
    is_super_admin: profile.is_super_admin === true,
    onboarding_complete: profile.onboarding_complete === true };
}
const EDITABLE = ['full_name', 'display_name', 'phone', 'profile_picture_url', 'bio', 'preferred_language', 'communication_preferences'];
export function editableProfile(updates) {
  if (Object.keys(updates).some(key => !EDITABLE.includes(key))) throw new Error('This profile field requires an authorised account operation.');
  return Object.fromEntries(Object.entries(updates).filter(([key]) => EDITABLE.includes(key)));
}
export async function withTimeout(operation, ms = 15000) {
  let timer;
  try { return await Promise.race([operation, new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('The request timed out. Check your connection and retry.')), ms);
  })]); } finally { clearTimeout(timer); }
}
