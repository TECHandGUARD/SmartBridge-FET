import useParentLinks from '@/hooks/useParentLinks';
export default function BookingLearnerChoice({ user, value, onChange }) {
  const { links, loading, error } = useParentLinks(user);
  if (user?.role !== 'parent') return null;
  const approved = links.filter(link => link.status === 'approved');
  return <label className="block text-sm">Learner<select className="block border rounded-md w-full p-2 bg-background mt-1" value={value || ''} onChange={event => onChange(event.target.value)}><option value="">Choose an approved linked learner</option>{approved.map(link => <option key={link.id} value={link.student_id}>{link.student_email}</option>)}</select>{loading ? <span>Loading learners…</span> : error ? <span role="alert">Learners could not load. Retry from your dashboard.</span> : !approved.length ? <span>Link a learner and obtain their approval from your dashboard before booking.</span> : null}</label>;
}
