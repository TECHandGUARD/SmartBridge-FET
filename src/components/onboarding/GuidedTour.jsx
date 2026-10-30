import { useEffect, useState } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const ROLE = { student: 'student', user: 'student', tutor: 'tutor', sace_tutor: 'tutor', student_tutor: 'tutor', parent: 'parent', admin: 'admin' };
const STEPS = {
 student: [
  { element: '[data-tour="dashboard-heading"]', popover: { title: 'Your learning dashboard', description: 'Your personal study space for Grades 10–12. Your learning tools and progress are organized here.' } },
  { element: '[data-tour="dashboard-navigation"]', popover: { title: 'Explore your tools', description: 'Move between subjects, progress, AI study tools, goals and learning activities.' } },
  { element: 'a[href="/tutors"]', popover: { title: 'Find a tutor', description: 'Browse available tutors and explore support for the subjects you are studying.' } }
 ],
 tutor: [
  { element: '[data-tour="dashboard-heading"]', popover: { title: 'Your tutor workspace', description: 'Your dashboard brings your tutoring activity and professional tools together.' } },
  { element: '[data-tour="dashboard-navigation"]', popover: { title: 'Tutor dashboard sections', description: 'Use the dashboard navigation to access the different areas of your tutoring workspace.' } }
 ],
 parent: [
  { element: '[data-tour="dashboard-heading"]', popover: { title: 'Your parent dashboard', description: 'Your space to stay connected with your child’s learning journey.' } },
  { element: '[data-tour="dashboard-navigation"]', popover: { title: 'Parent tools', description: 'Manage your child link, view progress, explore subjects, find tutors and access messages.' } },
  { element: 'a[href="/tutors"]', popover: { title: 'Find tutor support', description: 'Explore tutors who can support your child with CAPS subjects.' } }
 ],
 admin: [
  { element: '[data-tour="dashboard-heading"]', popover: { title: 'SmartBridge control panel', description: 'Your administration workspace for monitoring and managing the platform.' } },
  { element: '[data-tour="dashboard-stats"]', popover: { title: 'Platform overview', description: 'Review high-level user, subscription, resource, payment and engagement figures.' } },
  { element: '[data-tour="dashboard-navigation"]', popover: { title: 'Administration tools', description: 'Access registrations, marketing, tutor verification, payments, content and system controls.' } }
 ]
};

export default function GuidedTour({ role, pathname }) {
 const [running, setRunning] = useState(false);
 const key = ROLE[role];
 const dashboard = /^\/(student-dashboard|tutor-dashboard|parent-dashboard|admin)$/.test(pathname);
 useEffect(() => setRunning(false), [pathname]);
 if (!dashboard || !key) return null;
 const start = () => {
  const steps = (STEPS[key] || []).filter(step => document.querySelector(step.element));
  if (!steps.length) return;
  const tour = driver({ showProgress: true, animate: true, smoothScroll: true, allowClose: true, overlayClickBehavior: 'close', popoverClass: 'smartbridge-tour-popover', nextBtnText: 'Next', prevBtnText: 'Back', doneBtnText: 'Finish', onDestroyed: () => setRunning(false) });
  setRunning(true); tour.setSteps(steps); tour.drive();
 };
 return <button type="button" onClick={start} aria-label="Start the SmartBridge guided tour" className="fixed bottom-24 right-4 z-[70] inline-flex min-h-11 items-center gap-2 rounded-full border border-primary/20 bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 lg:bottom-6 lg:right-6"><span aria-hidden="true">✦</span>{running ? 'Tour running' : 'Take a tour'}</button>;
}
