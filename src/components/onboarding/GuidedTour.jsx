import { useEffect, useState } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const ROLE = {
  student: 'student', user: 'student', tutor: 'tutor',
  sace_tutor: 'tutor', student_tutor: 'tutor', parent: 'parent', admin: 'admin'
};

const STEPS = {
  student: [
    { element: '[data-tour="dashboard-heading"]', popover: { title: 'Your learning dashboard', description: 'Your personal study space for Grades 10–12. Start here to see your learning tools and activities.' } },
    { element: '[data-tour="dashboard-navigation"]', popover: { title: 'Your learning tools', description: 'Use these shortcuts to explore study resources, progress and learning activities.' } },
    { element: 'a[href="/tutors"]', popover: { title: 'Find tutor support', description: 'Browse tutors and explore support for the subjects you are studying.' } }
  ],
  tutor: [
    { element: '[data-tour="dashboard-heading"]', popover: { title: 'Your tutor workspace', description: 'Your dashboard brings your tutoring activity, profile and professional tools together.' } },
    { element: '[data-tour="dashboard-navigation"]', popover: { title: 'Your tutor shortcuts', description: 'Choose a section below to manage your tutoring work. The next steps point out the most useful places to start.' } },
    { element: '[data-tour="tutor-action-reviews"]', popover: { title: 'Complete your profile', description: 'Open My Profile & Reviews to review your tutor profile details and keep your public information up to date.' } },
    { element: '[data-tour="tutor-action-availability"]', popover: { title: 'Set your availability', description: 'Manage the times learners can request, your meeting links and your booking calendar.' } },
    { element: '[data-tour="tutor-action-bookings"]', popover: { title: 'Manage booking requests', description: 'Review incoming booking requests and manage their status from this section.' } },
    { element: '[data-tour="tutor-action-messages"]', popover: { title: 'Stay in touch', description: 'Open Messages to communicate with learners and keep tutoring conversations together.' } },
    { element: '[data-tour="tutor-action-sessions"]', popover: { title: 'Run learning sessions', description: 'Find your upcoming sessions and access lesson-planning and teaching tools here.' } }
  ],
  parent: [
    { element: '[data-tour="dashboard-heading"]', popover: { title: 'Your parent dashboard', description: 'Your space to stay connected with your child’s learning journey.' } },
    { element: '[data-tour="dashboard-navigation"]', popover: { title: 'Parent tools', description: 'Use these sections to link your child, view progress, explore subjects and access messages.' } },
    { element: 'a[href="/tutors"]', popover: { title: 'Find tutor support', description: 'Explore tutors who can support your child with CAPS subjects.' } }
  ],
  admin: [
    { element: '[data-tour="dashboard-heading"]', popover: { title: 'SmartBridge control panel', description: 'Your administration workspace for monitoring and managing the platform.' } },
    { element: '[data-tour="dashboard-stats"]', popover: { title: 'Platform overview', description: 'Review the high-level figures displayed on your admin dashboard.' } },
    { element: '[data-tour="dashboard-navigation"]', popover: { title: 'Administration tools', description: 'Use the dashboard sections to access registrations, tutor verification, payments, content and system controls.' } }
  ]
};

export default function GuidedTour({ role, pathname }) {
  const [running, setRunning] = useState(false);
  const key = ROLE[role];
  const dashboard = /^\/(student-dashboard|tutor-dashboard|parent-dashboard|admin)$/.test(pathname);

  useEffect(() => setRunning(false), [pathname]);

  if (!dashboard || !key) return null;

  const start = () => {
    if (running) return;
    const steps = (STEPS[key] || []).filter(step => document.querySelector(step.element));
    if (!steps.length) return;

    const tour = driver({
      showProgress: true,
      animate: true,
      smoothScroll: true,
      allowClose: true,
      overlayClickBehavior: 'close',
      stagePadding: 8,
      popoverClass: 'smartbridge-tour-popover',
      nextBtnText: 'Next',
      prevBtnText: 'Back',
      doneBtnText: 'Finish',
      onDestroyed: () => setRunning(false)
    });

    setRunning(true);
    tour.setSteps(steps);
    tour.drive();
  };

  return (
    <button
      type="button"
      onClick={start}
      disabled={running}
      aria-label={running ? 'SmartBridge guided tour is running' : 'Start or replay the SmartBridge guided tour'}
      className="fixed bottom-24 right-3 z-[70] inline-flex min-h-11 max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-full border border-primary/20 bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:right-4 sm:px-4 lg:bottom-6 lg:right-6"
    >
      <span aria-hidden="true">✦</span>
      <span>{running ? 'Tour running' : 'Take a tour'}</span>
    </button>
  );
}
