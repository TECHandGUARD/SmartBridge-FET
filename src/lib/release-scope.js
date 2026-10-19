// User-interface release scope only. Database/API authorization remains independent.
export const RELEASE_FEATURES = Object.freeze({
  learningProgress: true,
  simulations: true,
  flashcards: false,
  advancedDiscussion: false,
  advancedChat: false,
  tutorAnalytics: false,
  tutorBanking: false,
  extraTutorVerification: false,
  universityComparison: false,
  bookingReschedule: false,
  attendance: false,
  counselorPortal: true,
  externalAi: true,
  externalEmail: false,
  lessonPlanning: true,
  quizAuthoring: true,
  accountDeletion: false,
});
export const isReleaseFeatureEnabled = key => RELEASE_FEATURES[key] === true;
export function isDashboardSectionEnabled(role, key) {
  const deferred = {
    student: [],
    tutor: ['students', 'earnings'],
    parent: [],
  };
  return !!deferred[role] && !deferred[role].includes(key);
}
