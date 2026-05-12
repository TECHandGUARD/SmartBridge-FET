import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import JSZip from 'npm:jszip@3.10.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subject, grade, document_type } = await req.json();

    // Build filter
    const filter = {};
    if (subject && subject !== 'all') filter.subject = subject;
    if (grade && grade !== 'all') filter.grade = grade;
    if (document_type && document_type !== 'all') filter.document_type = document_type;

    const docs = Object.keys(filter).length > 0
      ? await base44.asServiceRole.entities.CAPSDocument.filter(filter)
      : await base44.asServiceRole.entities.CAPSDocument.list();

    if (!docs || docs.length === 0) {
      return Response.json({ error: 'No documents found for the selected filters.' }, { status: 404 });
    }

    const zip = new JSZip();

    // Fetch each PDF and add to zip
    await Promise.all(docs.map(async (doc) => {
      try {
        const res = await fetch(doc.file_url);
        if (!res.ok) return;
        const buffer = await res.arrayBuffer();
        const safeName = doc.title.replace(/[^a-z0-9]/gi, '_').substring(0, 60);
        zip.file(`${safeName}.pdf`, buffer);

        // Increment download count
        await base44.asServiceRole.entities.CAPSDocument.update(doc.id, {
          download_count: (doc.download_count || 0) + 1
        }).catch(() => {});
      } catch (_e) {
        // skip failed files
      }
    }));

    const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });

    return new Response(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="CAPS_Documents.zip"`,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});