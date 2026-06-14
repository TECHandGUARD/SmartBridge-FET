import { Link } from 'react-router-dom';
import { GraduationCap, Users, BookOpen, ArrowRight } from 'lucide-react';

const roles = [
  {
    icon: GraduationCap,
    title: 'Student Dashboard',
    description: 'Track progress, access CAPS resources, download past papers, and connect with tutors.',
    path: '/student-dashboard',
    color: 'from-primary/10 to-primary/5',
    border: 'border-primary/20',
    iconBg: 'bg-primary/10 text-primary',
    features: ['Subject notes & summaries', 'Past exam papers', 'Progress tracking', 'Tutor chat'],
  },
  {
    icon: Users,
    title: 'Parent Dashboard',
    description: "Monitor your child's academic progress, access report cards, and stay connected.",
    path: '/parent-dashboard',
    color: 'from-amber-50 to-orange-50',
    border: 'border-amber-200',
    iconBg: 'bg-amber-100 text-amber-700',
    features: ['Child progress reports', 'Subject performance', 'Tutor bookings', 'Notifications'],
  },
  {
    icon: BookOpen,
    title: 'Tutor Dashboard',
    description: 'Upload resources, manage students, showcase qualifications, and grow your tutoring.',
    path: '/tutor-dashboard',
    color: 'from-blue-50 to-indigo-50',
    border: 'border-blue-200',
    iconBg: 'bg-blue-100 text-blue-700',
    features: ['Upload study materials', 'Manage students', 'SACE verification badge', 'Earnings tracker'],
  },
];

export default function RoleDashboardCards() {
  return (
    <section className="py-20 bg-muted/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">Personalized Experience</p>
          <h2 className="font-playfair text-3xl sm:text-4xl font-bold text-foreground mb-4">
            A Dashboard for Everyone
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Whether you're a student, parent, or tutor — SmartBridge FET Phase has a tailored experience just for you.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {roles.map(({ icon: Icon, title, description, path, color, border, iconBg, features }) => (
            <Link
              key={path}
              to={path}
              className={`group block bg-gradient-to-br ${color} border ${border} rounded-2xl p-6 hover:shadow-lg transition-all duration-300`}
            >
              <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center mb-4`}>
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="font-playfair text-xl font-bold text-foreground mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{description}</p>
              <ul className="space-y-1.5 mb-5">
                {features.map((f) => (
                  <li key={f} className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/50 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:gap-2.5 transition-all">
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
