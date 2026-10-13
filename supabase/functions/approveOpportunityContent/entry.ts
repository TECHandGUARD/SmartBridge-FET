import { serverConnection } from '../../shared/config.ts';
import { withHttp, authorize, failure } from '../../shared/http.ts';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

// Retains live publication mappings; fixes guide flags, rejection fields and retry duplication.
serve(withHttp(async req => {
  try {
    const connection = serverConnection();
    const supabase = createClient(connection.url, connection.key, {auth:{persistSession:false, autoRefreshToken:false}});
    const user = await authorize(req, supabase, 'admin');
    const { type, id, action, admin_notes } = await req.json();
    if (!id || !['approve', 'reject'].includes(action)) failure(400, 'Provide id and an approve/reject action');
    const mappings = {
      deadline: {pending:'pending_application_deadlines', live:'application_deadlines', fields:(item:any)=>({event_name:item.event_name, university:item.university || '', date:item.date, description:item.description || '', link:item.link || '', category:item.category || 'Other'})},
      guide: {pending:'pending_opportunity_guides', live:'opportunity_guides', fields:(item:any)=>({title:item.title, description:item.description || '', file_url:item.external_link || item.file_url || '', category:item.category || 'General', metadata:{...item.metadata, source:item.source || ''}})},
      prospectus: {pending:'pending_university_prospectuses', live:'university_prospectuses', fields:(item:any)=>({university_name:item.university_name, year:item.year, file_url:item.external_link || item.file_url || '', application_link:item.application_link || '', description:item.description || ''})},
    };
    if (!Object.hasOwn(mappings, type)) failure(400, 'Invalid content type');
    const mapping = mappings[type];
    const {data:item, error:fetchError} = await supabase.from(mapping.pending).select('*').eq('id',id).maybeSingle();
    if (fetchError) throw fetchError;
    if (!item) failure(404, 'Item not found');
    if (item.status === 'approved' && action === 'approve') return Response.json({success:true, action:'approved', skipped:true});
    if (item.status !== 'pending') failure(409, 'Only pending content can be reviewed');
    const reviewed = {admin_notes:admin_notes || '', reviewed_at:new Date().toISOString(), reviewed_by:user.id};
    if (action === 'reject') {
      const {error} = await supabase.from(mapping.pending).update({...reviewed, status:'rejected', rejected_at:reviewed.reviewed_at, rejected_reason:admin_notes || ''}).eq('id',id).eq('status','pending');
      if (error) throw error;
      return Response.json({success:true, action:'rejected'});
    }
    const approval = {is_active:true, approved_at:reviewed.reviewed_at, approved_by:user.id, ...(type === 'guide' ? {is_pending:false} : {is_approved:true})};
    const fields = mapping.fields(item);
    if (type === 'prospectus') {
      const {data:existing, error:existingError} = await supabase.from(mapping.live).select('id').eq('university_name',item.university_name).eq('year',item.year).maybeSingle();
      if (existingError) throw existingError;
      const {error} = await supabase.from(mapping.live).upsert({id:existing?.id || item.id, ...fields, ...approval}, {onConflict:'id'});
      if (error) throw error;
    } else {
      // Same pending UUID produces the same live row if publishing succeeded but status saving failed.
      const {error} = await supabase.from(mapping.live).upsert({id:item.id, ...fields, ...approval}, {onConflict:'id'});
      if (error) throw error;
    }
    const {error} = await supabase.from(mapping.pending).update({...reviewed, status:'approved', approved_at:reviewed.reviewed_at, approved_by:user.id}).eq('id',id).eq('status','pending');
    if (error) throw error;
    return Response.json({success:true, action:'approved'});
  } catch(error) { return Response.json({error:error.message}, {status:error.status || 500}); }
}, 'approve-opportunity-content'));
