// pages/api/legal/privacy.js

import { supabase } from '@/lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get core privacy policy
    const { data: coreDoc } = await supabase
      .from('legal_documents')
      .select('markdown_content')
      .eq('doc_key', 'privacy_core')
      .single();

    // Check if user is logged in
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(200).json({ content: coreDoc?.markdown_content || '' });
    }

    // Verify JWT
    const token = authHeader.split(' ')[1];
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      return res.status(200).json({ content: coreDoc?.markdown_content || '' });
    }

    // Check if tutor
    const userRole = user.app_metadata?.role || user.user_metadata?.role;
    const isTutor = ['tutor', 'sace_tutor', 'student_tutor', 'admin'].includes(userRole);

    if (isTutor) {
      const { data: tutorDoc } = await supabase
        .from('legal_documents')
        .select('markdown_content')
        .eq('doc_key', 'privacy_tutor')
        .single();

      const content = `${coreDoc?.markdown_content || ''}\n\n---\n\n${tutorDoc?.markdown_content || ''}`;
      return res.status(200).json({ content });
    }

    return res.status(200).json({ content: coreDoc?.markdown_content || '' });

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}