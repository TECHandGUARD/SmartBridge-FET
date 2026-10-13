// Recipients follow database-managed administrators, never a browser email allowlist.
export async function getAdminNotificationEmails(client) {
  const { data, error } = await client.from('users').select('email').eq('is_super_admin', true).eq('is_active', true);
  if (error) throw error;
  const emails = [...new Set((data || []).map(user => user.email).filter(Boolean))];
  if (!emails.length) throw new Error('No active administrator notification recipients are available.');
  return emails;
}
