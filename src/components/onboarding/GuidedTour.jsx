import { useEffect, useMemo, useState } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const ROLE = {
  student: 'student',
  user: 'student',
  tutor: 'tutor',
  sace_tutor: 'tutor',
  student_tutor: 'tutor',
  parent: 'parent',
  admin: 'admin'
};

const STEPS = {
  student: [
    { element: '[data-tour="dashboard-heading"]', popover: { title: 'Your learning dashboard', description: 'Your personal study space for Grades 10–12. Start here to see your learning tools and activities.' } },
    { element: '[data-tour="dashboard-navigation"]', popover: { title: 'Your learning tools', description: 'Use these shortcuts to explore study resources, progress and learning activities.' } },
    { element: 'a[href="/tutors"]', popover: { title: 'Find tutor support', description: 'Browse tutors and explore support for the subjects you are studying.' } }
  ],
  tutor: [
    { element: '[data-tour="dashboard-heading"]', popover: { title: 'Your tutor workspace', description: 'Your dashboard brings your tutoring activity, profile and professional tools together.' } },
    { element: '[data-tour="dashboard-navigation"]', popover: { title: 'Your tutor shortcuts', description: 'Choose a section below to manage your tutoring work.' } },
    { element: '[data-tour="tutor-action-reviews"]', popover: { title: 'Your profile and reviews', description: 'Open My Profile & Reviews to review your tutor profile and keep your public information up to date.' } },
    { element: '[data-tour="tutor-action-availability"]', popover: { title: 'Set your availability', description: 'Manage the times learners can request and your tutoring calendar.' } },
    { element: '[data-tour="tutor-action-bookings"]', popover: { title: 'Manage booking requests', description: 'Open Booking Requests to review and manage learner requests.' } },
    { element: '[data-tour="tutor-action-messages"]', popover: { title: 'Stay in touch', description: 'Open Messages to communicate with learners.' } },
    { element: '[data-tour="tutor-action-sessions"]', popover: { title: 'Live sessions', description: 'Open Live Sessions to access your session tools.' } },
    { element: '[data-tour="tutor-action-lesson-studio"]', popover: { title: 'Prepare lessons', description: 'Use Lesson Studio to access your lesson-planning tools.' } }
  ],
  parent: [
    { element: '[data-tour="dashboard-heading"]', popover: { title: 'Your parent dashboard', description: 'Your space to stay connected with your child’s learning journey.' } },
    { element: '[data-tour="dashboard-navigation"]', popover: { title: 'Parent tools', description: 'Use the available dashboard sections to manage your child link and follow learning activity.' } }
  ],
  admin: [
    { element: '[data-tour="dashboard-heading"]', popover: { title: 'SmartBridge control panel', description: 'Your administration workspace for monitoring and managing the platform.' } },
    { element: '[data-tour="dashboard-stats"]', popover: { title: 'Platform overview', description: 'Review the high-level figures displayed on your admin dashboard.' } },
    { element: '[data-tour="dashboard-navigation"]', popover: { title: 'Administration tools', description: 'Use the dashboard sections to access the administration areas available to your account.' } }
  ]
};

const STORAGE_PREFIX = 'smartbridge-guided-tour-complete';

export default function GuidedTour({ role, pathname, userId }) {
  const [running, setRunning] = useState(false);
  const key = ROLE[role];
  const dashboard = /^\/(student-dashboard|tutor-dashboard|parent-dashboard|admin)$/.test(pathname);
  const storageKey = useMemo(
    () => userId && key ? `${STORAGE_PREFIX}:${userId}:${key}` : null,
    [userId, key]
  );
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    setRunning(false);
    if (!storageKey) {
      setCompleted(false);
      return;
    }
    try {
      setCompleted(window.localStorage.getItem(storageKey) === 'true');
    } catch {
      setCompleted(false);
    }
  }, [pathname, storageKey]);

  if (!dashboard || !key || !userId) return null;

  const start = () => {
    if (running) return;
    const steps = (STEPS[key] || []).filter(step => {
      try {
        return Boolean(document.querySelector(step.element));
      } catch {
        return false;
      }
    });
    if (!steps.length) return;

    let didFinish = false;
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
      onPopoverRender: (popover, options) => {
        if (options.state.activeIndex === steps.length - 1) {
          popover.nextButton.addEventListener('click', () => {
            didFinish = true;
          }, { once: true });
        }
      },
      onDestroyed: () => {
        setRunning(false);
        if (didFinish && storageKey) {
          try {
            window.localStorage.setItem(storageKey, 'true');
            setCompleted(true);
          } catch {
            // Tours remain usable if browser storage is unavailable.
          }
        }
      }
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
      aria-label={running ? 'SmartBridge guided tour is running' : completed ? 'Replay the SmartBridge guided tour' : 'Start the SmartBridge guided tour'}
      className="fixed bottom-24 right-3 z-[70] inline-flex min-h-11 max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-full border border-primary/20 bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:right-4 sm:px-4 lg:bottom-6 lg:right-6"
    >
      <span aria-hidden="true">✦</span>
      <span>{running ? 'Tour running' : completed ? 'Replay tour' : 'Take a tour'}</span>
    </button>
  );
}
