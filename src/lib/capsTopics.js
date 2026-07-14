/**
 * ====================================================================
 * OFFICIAL CAPS SYLLABUS REGISTRY ARCHITECTURE
 * REFERENCE STANDARD: SOUTH AFRICAN DEPARTMENT OF BASIC EDUCATION (DBE)
 * TYPE IMPLEMENTATION: STRICT PRODUCTION DICTIONARY TYPE GUARDS
 * 
 * NOTE: This file serves as the STATIC FALLBACK reference for CAPS topics.
 * In production, topics should be loaded from the database to allow
 * admin updates without code deployment.
 * ====================================================================
 */

// ============================================================
// Configuration (Soft-coded for admin control)
// ============================================================

const appName = import.meta.env.VITE_APP_NAME || 'SmartBridge FET';

// ============================================================
// CAPS Topics Registry
// ============================================================

/**
 * @typedef {Object} SubjectSyllabusProfile
 * @property {string} name - The name of the subject
 * @property {string} code - The subject code
 * @property {string[]} topics - List of topics for the subject
 */

export const CAPS_TOPICS = {
  // ============================================================
  // MATHEMATICS
  // ============================================================
  'Mathematics': [
    'Algebra & Expressions',
    'Equations & Inequalities',
    'Number Patterns',
    'Analytical Geometry',
    'Functions & Graphs',
    'Trigonometry',
    'Euclidean Geometry',
    'Measurement',
    'Statistics & Probability',
    'Calculus',
  ],
  
  // ============================================================
  // MATHEMATICAL LITERACY
  // ============================================================
  'Mathematical Literacy': [
    'Numbers & Operations',
    'Patterns & Relationships',
    'Finance & Interest',
    'Measurement',
    'Maps & Plans',
    'Data Handling',
    'Probability',
  ],
  
  // ============================================================
  // PHYSICAL SCIENCES
  // ============================================================
  'Physical Sciences': [
    'Mechanics & Motion',
    'Waves, Sound & Light',
    'Electricity & Magnetism',
    'Matter & Materials',
    'Chemical Change',
    'Chemical Systems',
    'Electrostatics',
    'Organic Chemistry',
  ],
  
  // ============================================================
  // LIFE SCIENCES
  // ============================================================
  'Life Sciences': [
    'Cell Biology',
    'Genetics & Inheritance',
    'Evolution',
    'Biodiversity',
    'Human Physiology',
    'Plant Physiology',
    'Ecology & Environment',
    'Reproduction',
  ],
  
  // ============================================================
  // ACCOUNTING
  // ============================================================
  'Accounting': [
    'Accounting Equation',
    'Journals & Ledgers',
    'Bank Reconciliation',
    'Debtors & Creditors',
    'Financial Statements',
    'Partnerships',
    'Companies & VAT',
    'Budgeting & Cash Flow',
    'Cost Accounting',
  ],
  
  // ============================================================
  // BUSINESS STUDIES
  // ============================================================
  'Business Studies': [
    'Business Environments',
    'Entrepreneurship',
    'Business Ventures',
    'Business Roles',
    'Marketing',
    'Financial Management',
    'Human Resources',
    'Operations Management',
  ],
  
  // ============================================================
  // ECONOMICS
  // ============================================================
  'Economics': [
    'Basic Economic Concepts',
    'Supply & Demand',
    'Market Structures',
    'Public Sector',
    'Macro-economic Goals',
    'Inflation & Unemployment',
    'Trade & International Economics',
    'Development Economics',
  ],
  
  // ============================================================
  // HISTORY
  // ============================================================
  'History': [
    'Colonialism & Resistance',
    'The World Wars',
    'Cold War',
    'Apartheid & Resistance',
    'Liberation Movements',
    'Post-Apartheid SA',
    'Civil Rights',
    'Contemporary History',
  ],
  
  // ============================================================
  // GEOGRAPHY
  // ============================================================
  'Geography': [
    'Geomorphology',
    'Climate & Weather',
    'Water Resources',
    'Biomes & Soils',
    'Population Geography',
    'Settlement & Urbanisation',
    'Development Geography',
    'Mapwork',
  ],
  
  // ============================================================
  // ENGLISH HL
  // ============================================================
  'English HL': [
    'Language Structures & Conventions',
    'Reading & Comprehension',
    'Literature — Poetry',
    'Literature — Novel/Drama',
    'Visual Literacy',
    'Writing & Transactional Texts',
    'Oral Communication',
  ],
  
  // ============================================================
  // ISIXHOSA HL
  // ============================================================
  'isiXhosa HL': [
    'Uqondo Lokufunda',
    'Ulwimi Nolwakhiwo',
    'Imibongo',
    'Imidlalo/Izincwadi',
    'Ukubhala',
    'Ukuthetha Nokulalela',
  ],
  
  // ============================================================
  // ISIZULU HL
  // ============================================================
  'isiZulu HL': [
    'Ukuqonda Okufundwayo (Reading & Comprehension)',
    'Izakhiwo Nolimi (Language Structures & Conventions)',
    'Izinkondlo (Literature — Poetry)',
    'Inoveli neDrama (Literature — Novel/Drama)',
    'Ukubhala Imibhalo Etranzaksheshinali (Writing & Transactional Texts)',
    'Ukukhuluma Nokulalela (Oral Communication)',
  ],
  
  // ============================================================
  // LIFE ORIENTATION
  // ============================================================
  'Life Orientation': [
    'Personal Development',
    'Citizenship & Democracy',
    'Career & Study Choices',
    'Health & Wellbeing',
    'Sport & Physical Activity',
    'Social & Environmental Responsibility',
  ],
  
  // ============================================================
  // AFRIKAANS HL
  // ============================================================
  'Afrikaans HL': [
    'Taalstrukture en -konvensies',
    'Lees & Begrip',
    'Letterkunde — Poësie',
    'Letterkunde — Roman/Drama',
    'Skryfvaardighede',
    'Mondelinge Kommunikasie',
  ],
  
  // ============================================================
  // TOURISM
  // ============================================================
  'Tourism': [
    'Tourism in SA',
    'Tourism Sectors',
    'Tourist Services',
    'Sustainable Tourism',
    'Geography of Tourism',
    'Marketing & Promotions',
    'Financial Calculations',
  ],
};

// ============================================================
// Helper Functions
// ============================================================

/**
 * Pedagogical Helper Method: Safely resolves curriculum topic list queries with type-safe fallbacks
 * prevents runtime page breaks if frontend fields mismatch backend database names.
 * 
 * @param {string} subjectName - The name of the subject to get topics for
 * @returns {string[]} Array of topic strings for the subject
 */
export function getTopicsForSubject(subjectName) {
  if (!subjectName) return [];
  
  if (CAPS_TOPICS.hasOwnProperty(subjectName)) {
    return CAPS_TOPICS[subjectName];
  }
  
  // Case-insensitive fallback lookup
  const standardKey = Object.keys(CAPS_TOPICS).find(
    k => k.toLowerCase() === subjectName.toLowerCase().trim()
  );
  
  return standardKey ? CAPS_TOPICS[standardKey] : [];
}

/**
 * Helper to get all subject names
 * 
 * @returns {string[]} Array of all subject names
 */
export function getAllSubjectNames() {
  return Object.keys(CAPS_TOPICS);
}

/**
 * Helper to check if a subject exists
 * 
 * @param {string} subjectName - The name of the subject to check
 * @returns {boolean} True if the subject exists
 */
export function isValidSubject(subjectName) {
  return CAPS_TOPICS.hasOwnProperty(subjectName) || 
    Object.keys(CAPS_TOPICS).some(k => k.toLowerCase() === subjectName.toLowerCase().trim());
}

/**
 * ✅ NEW: Get all topics for all subjects (for admin reference)
 * 
 * @returns {Object} Object with subject names as keys and topic arrays as values
 */
export function getAllTopics() {
  return { ...CAPS_TOPICS };
}

/**
 * ✅ NEW: Get topic count for a subject
 * 
 * @param {string} subjectName - The name of the subject
 * @returns {number} Number of topics for the subject
 */
export function getTopicCount(subjectName) {
  const topics = getTopicsForSubject(subjectName);
  return topics.length;
}

/**
 * ✅ NEW: Search for a topic across all subjects
 * 
 * @param {string} searchTerm - The term to search for
 * @returns {Array<{subject: string, topic: string}>} Array of matches
 */
export function searchTopics(searchTerm) {
  if (!searchTerm) return [];
  
  const results = [];
  const term = searchTerm.toLowerCase().trim();
  
  for (const [subject, topics] of Object.entries(CAPS_TOPICS)) {
    for (const topic of topics) {
      if (topic.toLowerCase().includes(term)) {
        results.push({ subject, topic });
      }
    }
  }
  
  return results;
}
