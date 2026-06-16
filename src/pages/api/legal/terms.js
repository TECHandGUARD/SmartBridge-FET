// pages/api/legal/terms.js

import { supabase } from '@/lib/supabaseClient';

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Get student terms from database
    const { data: studentDoc, error: studentError } = await supabase
      .from('legal_documents')
      .select('markdown_content')
      .eq('doc_key', 'terms_student')
      .single();

    if (studentError) {
      console.error('Student terms error:', studentError);
      return res.status(500).json({ error: 'Failed to load terms' });
    }

    // 2. Check if user is logged in
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(200).json({ content: studentDoc?.markdown_content || '' });
    }

    // 3. Verify JWT token
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return res.status(200).json({ content: studentDoc?.markdown_content || '' });
    }

    // 4. Check if user is a tutor
    const userRole = user.app_metadata?.role || user.user_metadata?.role;
    const isTutor = ['tutor', 'sace_tutor', 'student_tutor', 'admin'].includes(userRole);

    if (isTutor) {
      // Get tutor addendum
      const { data: tutorDoc, error: tutorError } = await supabase
        .from('legal_documents')
        .select('markdown_content')
        .eq('doc_key', 'terms_tutor')
        .single();

      if (!tutorError && tutorDoc) {
        // Combine both documents
        const combined = `${studentDoc?.markdown_content || ''}\n\n---\n\n${tutorDoc.markdown_content}`;
        return res.status(200).json({ content: combined });
      }
    }

    // 5. Default: student terms only
    return res.status(200).json({ content: studentDoc?.markdown_content || '' });

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}