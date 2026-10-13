import { serverConnection } from '../../shared/config.ts';
import { withHttp, authorize, failure } from '../../shared/http.ts';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

// Token authorization and the database's active administrator check both apply.
// Publishing and review tracking execute together in a single locked transaction.
serve(withHttp(async req => {
  try {
    const connection = serverConnection();
    const supabase = createClient(connection.url, connection.key, {auth:{persistSession:false, autoRefreshToken:false}});
    const user = await authorize(req, supabase, 'admin');
    const { type, id, action, admin_notes } = await req.json();
    if (!['deadline', 'guide', 'prospectus'].includes(type) ||
        typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ||
        !['approve', 'reject'].includes(action) ||
        (admin_notes != null && (typeof admin_notes !== 'string' || admin_notes.length > 5000))) {
      failure(400, 'Provide a content type, UUID, decision and notes of at most 5000 characters');
    }
    const {data, error} = await supabase.rpc('review_opportunity_content', {
      actor_id: user.id, content_type: type, item_id: id,
      decision: action, review_notes: admin_notes || '',
    });
    if (error) {
      if (error.message?.includes('not found')) failure(404, 'Review item not found');
      if (error.message?.includes('Only pending') || error.message?.includes('duplicate')) failure(409, 'Content needs review before publication');
      if (error.message?.includes('administrator')) failure(403, 'Active administrator required');
      failure(503, 'Content review could not be saved. Please retry.');
    }
    if (!data?.success) failure(503, 'Content review could not be confirmed');
    return Response.json(data);
  } catch(error) { return Response.json({error:error.message}, {status:error.status || 500}); }
}, 'approve-opportunity-content'));
