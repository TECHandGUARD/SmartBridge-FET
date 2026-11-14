export const PROGRESS_TIMEFRAMES = {
  month: { label: 'Last 30 days', days: 30 },
  quarter: { label: 'Last 90 days', days: 90 },
  year: { label: 'Last 12 months', days: 365 },
  all: { label: 'All recorded activity', days: null },
};

export function getProgressCutoff(timeframe, now = new Date()) {
  const days = PROGRESS_TIMEFRAMES[timeframe]?.days;
  if (!days) return null;
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);
  return cutoff.toISOString().slice(0, 10);
}

export function buildTutorProgressSummary({ bookings = [], progress = [], sessions = [], gradeFilter = 'all' }) {
  const learners = new Map();
  const ensureLearner = (id, fallback = {}) => {
    if (!id) return null;
    if (!learners.has(id)) learners.set(id, {
      id, name: fallback.student_name || 'Learner', email: fallback.student_email || '',
      subjects: new Set(), grades: new Set(), sessions: 0, progressRecords: [],
      lastActivity: null, atRisk: false,
    });
    const learner = learners.get(id);
    if (fallback.student_name && learner.name === 'Learner') learner.name = fallback.student_name;
    if (fallback.student_email && !learner.email) learner.email = fallback.student_email;
    return learner;
  };

  bookings.forEach((booking) => {
    const learner = ensureLearner(booking.student_id, booking);
    if (!learner) return;
    if (booking.subject) learner.subjects.add(booking.subject);
    if (booking.date && (!learner.lastActivity || booking.date > learner.lastActivity)) learner.lastActivity = booking.date;
  });
  sessions.forEach((session) => {
    const learner = ensureLearner(session.student_id, session);
    if (!learner) return;
    if (session.is_completed) learner.sessions += 1;
    if (session.subject) learner.subjects.add(session.subject);
    const date = session.completed_at || session.date;
    if (date && (!learner.lastActivity || date > learner.lastActivity)) learner.lastActivity = date;
  });
  progress.forEach((record) => {
    const learner = ensureLearner(record.student_id, record);
    if (!learner) return;
    if (record.subject) learner.subjects.add(record.subject);
    if (record.grade) learner.grades.add(record.grade);
    learner.progressRecords.push(record);
    learner.atRisk ||= record.at_risk === true;
    const date = record.last_accessed || record.updated_at || record.created_at;
    if (date && (!learner.lastActivity || date > learner.lastActivity)) learner.lastActivity = date;
  });

  const allLearners = [...learners.values()].map((learner) => {
    const scores = learner.progressRecords.map((r) => Number(r.overall_score ?? r.current_score)).filter(Number.isFinite);
    const percentages = learner.progressRecords.map((r) => Number(r.progress_percentage)).filter(Number.isFinite);
    const grades = [...learner.grades];
    return {
      ...learner,
      subjects: [...learner.subjects].sort(),
      grades,
      grade: grades.length === 1 ? grades[0] : grades.length > 1 ? 'Multiple' : 'Not recorded',
      averageScore: scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : null,
      averageProgress: percentages.length ? Math.round(percentages.reduce((sum, value) => sum + value, 0) / percentages.length) : null,
      hasProgress: learner.progressRecords.length > 0,
    };
  });

  const filtered = allLearners.filter((learner) => gradeFilter === 'all' || learner.grades.includes(gradeFilter));
  const subjectMap = new Map();
  progress.forEach((record) => {
    if (!record.subject) return;
    const score = Number(record.overall_score ?? record.current_score);
    if (!Number.isFinite(score)) return;
    const entry = subjectMap.get(record.subject) || { subject: record.subject, total: 0, count: 0, learners: new Set() };
    entry.total += score;
    entry.count += 1;
    entry.learners.add(record.student_id);
    subjectMap.set(record.subject, entry);
  });
  const subjects = [...subjectMap.values()].map((entry) => ({
    subject: entry.subject, averageScore: Math.round(entry.total / entry.count), learnerCount: entry.learners.size,
  })).sort((a, b) => b.averageScore - a.averageScore);
  const validScores = progress.map((r) => Number(r.overall_score ?? r.current_score)).filter(Number.isFinite);

  return {
    learners: filtered.sort((a, b) => (b.lastActivity || '').localeCompare(a.lastActivity || '')),
    totalLearners: allLearners.length,
    totalSessions: sessions.filter((session) => session.is_completed).length,
    progressRecords: progress.length,
    atRiskLearners: filtered.filter((learner) => learner.atRisk).length,
    averageScore: validScores.length ? Math.round(validScores.reduce((sum, value) => sum + value, 0) / validScores.length) : null,
    subjects,
  };
}

export function toCsv(rows) {
  const quote = (value) => {
    const raw = String(value ?? '');
    const safe = /^\s*[=+@-]/.test(raw) ? `'${raw}` : raw;
    return '"' + safe.replace(/"/g, '""') + '"';
  };
  const headers = ['Learner', 'Grade', 'Subjects', 'Completed sessions', 'Average score (%)', 'Progress (%)', 'At risk', 'Last activity'];
  const body = rows.map((learner) => [
    learner.name, learner.grade, learner.subjects.join('; '), learner.sessions,
    learner.averageScore ?? 'Not recorded', learner.averageProgress ?? 'Not recorded',
    learner.atRisk ? 'Yes' : 'No', learner.lastActivity || 'Not recorded',
  ]);
  return [headers, ...body].map((row) => row.map(quote).join(',')).join('\n');
}
