import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { serverConnection } from '../../shared/config.ts';
import { authorize, withHttp, failure } from '../../shared/http.ts';
import { readJson, text, consumeQuota, profileFor, isAdmin, json, apiError } from '../../shared/api.ts';
import { generate, lessonSchema } from '../../shared/ai.ts';
serve(withHttp(async (request) => {
    try {
        const { url, key } = serverConnection();
        const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
        const user = await authorize(request, client);
        const profile = await profileFor(client, user.id);
        if (!isAdmin(profile) && !(['tutor', 'sace_tutor', 'student_tutor'].includes(profile.role) && profile.is_verified === true))
            failure(403, 'Verified tutor access required');
        const body = await readJson(request);
        const subject = text(body.subject, 'subject', 100), topic = text(body.topic, 'topic', 500), grade = text(body.grade, 'grade', 20);
        if (!['Grade 10', 'Grade 11', 'Grade 12'].includes(grade))
            failure(400, 'Choose Grade 10, Grade 11 or Grade 12');
        if (body.curriculum && body.curriculum !== 'CAPS')
            failure(400, 'Only CAPS is supported');
        await consumeQuota(client, user.id, 'ai');
        return json(await generate(`Draft a CAPS ${grade} ${subject} tutoring lesson on ${topic}. Include achievable objectives, suggested resources, homework and teaching notes. The tutor must review this draft.`, lessonSchema));
    }
    catch (error) {
        return apiError(error);
    }
}, 'generate-lesson-plan'));
