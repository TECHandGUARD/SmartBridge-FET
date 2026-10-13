export function getWeekStartDateString(date = new Date()) {
  const monday = new Date(date);
  const day = monday.getDay();
  monday.setDate(monday.getDate() + (day === 0 ? -6 : 1 - day));
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
}
export function computeProgressValue(goal, quizzes, sessions, bookings) {
  const start = new Date(`${goal.week_start}T00:00:00`);
  const end = new Date(start); end.setDate(end.getDate() + 7);
  const inWeek = value => { const time = new Date(value).getTime(); return time >= start.getTime() && time < end.getTime(); };
  const matchesSubject = item => !goal.subject || item.subject === goal.subject;
  switch (goal.goal_type) {
    case 'quizzes_completed': return quizzes.filter(item => inWeek(item.completed_at) && matchesSubject(item)).length;
    case 'study_sessions': return sessions.filter(item => inWeek(`${item.date}T12:00:00`) && matchesSubject(item)).length;
    case 'subjects_studied': return new Set(sessions.filter(item => inWeek(`${item.date}T12:00:00`) && matchesSubject(item)).map(item => item.subject)).size;
    case 'tutoring_sessions': return bookings.filter(item => inWeek(`${item.date}T12:00:00`) && matchesSubject(item) && item.status === 'completed').length;
    default: return 0;
  }
}
