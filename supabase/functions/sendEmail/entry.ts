import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { serverConnection, emailSettings, appUrl } from '../../shared/config.ts';
import { emailFetch } from '../../shared/email.ts';
import { authorize, withHttp, failure } from '../../shared/http.ts';
import { readJson, text, uuid, consumeQuota, profileFor, isAdmin, json, apiError } from '../../shared/api.ts';
async function row(query: any) { const { data, error } = await query; if (error)
    failure(503, 'Email context unavailable'); if (!data)
    failure(404, 'Email context unavailable'); return data; }
serve(withHttp(async (request) => {
    try {
        const { url, key } = serverConnection();
        const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
        const user = await authorize(request, client);
        const profile = await profileFor(client, user.id);
        const body = await readJson(request);
        let to: string, subject: string, message: string, html: string | undefined;
        if (isAdmin(profile) && !body.kind) {
            to = text(body.to, 'recipient', 254);
            subject = text(body.subject, 'subject', 200);
            if (/[\r\n]/.test(subject))
                failure(400, 'Invalid subject');
            if (body.html)
                html = text(body.html, 'html', 20000);
            message = body.text || body.body ? text(body.text || body.body, 'message', 20000) : '';
            if (!message && !html)
                failure(400, 'Message required');
        }
        else if (body.kind === 'parent-report') {
            if (profile.role !== 'parent')
                failure(403, 'Parent account required');
            const student = await row(client.from('users').select('id,email,role,is_active').eq('email', text(body.student_email, 'student_email', 254)).maybeSingle());
            if (student.role !== 'student' || student.is_active !== true)
                failure(403, 'Approved learner link required');
            await row(client.from('parent_student_links').select('id').eq('parent_id', user.id).eq('student_id', student.id).eq('status', 'approved').maybeSingle());
            const { data: progress, error } = await client.from('study_progress').select('subject,grade,study_sessions,last_access').eq('student_id', student.id);
            if (error)
                failure(503, 'Progress report unavailable');
            to = profile.email;
            subject = 'SmartBridge progress summary';
            message = `Progress summary for ${student.email}\n\n${(progress || []).map((p: any) => `${p.subject} (${p.grade}): ${p.study_sessions || 0} completed study sessions; last studied ${p.last_access || 'not recorded'}`).join('\n') || 'No activity recorded.'}\n\nView your dashboard: ${appUrl('/ParentDashboard')}`;
        }
        else if (body.kind === 'booking-status') {
            if (!['tutor', 'sace_tutor', 'student_tutor'].includes(profile.role) || profile.is_verified !== true)
                failure(403, 'Verified tutor required');
            const booking = await row(client.from('tutor_bookings').select('id,tutor_id,student_id,status,subject,date,time,cancellation_reason').eq('id', uuid(body.booking_id, 'booking_id')).eq('tutor_id', user.id).maybeSingle());
            if (!['confirmed', 'cancelled'].includes(booking.status))
                failure(409, 'Booking status is not ready for notification');
            const student = await profileFor(client, booking.student_id);
            to = student.email;
            subject = `SmartBridge session ${booking.status}`;
            message = `Your ${booking.subject} session on ${booking.date} at ${booking.time} is ${booking.status}.${booking.cancellation_reason ? `\nReason: ${booking.cancellation_reason}` : ''}\n\n${appUrl('/MyBookings')}`;
        }
        else if (body.kind === 'lesson-plan') {
            if (!['tutor', 'sace_tutor', 'student_tutor'].includes(profile.role) || profile.is_verified !== true)
                failure(403, 'Verified tutor required');
            const plan = await row(client.from('lesson_plans').select('id,tutor_id,student_id,session_title,objectives,resources_used,homework_assigned').eq('id', uuid(body.plan_id, 'plan_id')).eq('tutor_id', user.id).maybeSingle());
            await row(client.from('tutor_bookings').select('id').eq('tutor_id', user.id).eq('student_id', plan.student_id).in('status', ['confirmed', 'completed']).limit(1).maybeSingle());
            const student = await profileFor(client, plan.student_id);
            to = student.email;
            subject = 'SmartBridge lesson plan';
            message = `${plan.session_title}\n\nObjectives:\n${(plan.objectives || []).join('\n')}\n\nResources:\n${(plan.resources_used || []).join('\n')}\n\nHomework:\n${plan.homework_assigned || 'None assigned'}\n\n${appUrl('/Home')}`;
        }
        else if (body.kind === 'verification-status') {
            if (profile.role !== 'tutor_pending')
                failure(403, 'Pending tutor required');
            to = profile.email;
            subject = 'SmartBridge tutor profile status';
            message = `Your tutor profile is pending administrator review. Check its current status here: ${appUrl('/TutorPending')}`;
        }
        else
            failure(403, 'Use an authorized email action');
        await consumeQuota(client, user.id, 'email');
        const { apiKey, from } = emailSettings();
        let response: Response;
        try {
            response = await emailFetch({ method: 'POST', headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: [to], subject, ...(message ? { text: message } : {}), ...(html ? { html } : {}) }) }, client);
        }
        catch {
            failure(503, 'Email provider unavailable');
        }
        if (!response.ok)
            failure(response.status === 429 ? 429 : 502, 'Email was not accepted by the provider');
        const accepted = await response.json();
        return json({ success: true, id: accepted.id, status: 'accepted' });
    }
    catch (error) {
        return apiError(error);
    }
}, 'send-email'));
