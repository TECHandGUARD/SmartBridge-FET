/**
 * ====================================================================
 * SUBJECT REGISTRY ARCHITECTURE
 * REFERENCE STANDARD: SOUTH AFRICAN DEPARTMENT OF BASIC EDUCATION (DBE)
 * TYPE IMPLEMENTATION: PRODUCTION SUBJECT METADATA CONTRACTS
 * 
 * NOTE: This file contains STATIC FALLBACK data only.
 * In production, subjects should be loaded from the database
 * to allow admin updates without code deployment.
 * ====================================================================
 */

// ============================================================
// Configuration (Soft-coded for admin control)
// ============================================================



// ============================================================
// Types (JSDoc)
// ============================================================

/**
 * @typedef {Object} Subject
 * @property {string} name - Display name of the subject
 * @property {string} code - Unique subject code
 * @property {string} category - Subject category (Mathematics, Sciences, Commerce, Humanities, Languages, Life Skills)
 * @property {string} icon - Emoji icon for the subject
 * @property {string} description - Brief description of the subject
 * @property {string[]} grades - Available grades for this subject
 * @property {string} color - Tailwind color classes for UI
 * @property {string} [bgColor] - Background color
 * @property {string} [textColor] - Text color
 * @property {string} [borderColor] - Border color
 */

// ============================================================
// ✅ FIXED: Subject Registry
// ============================================================

export const SUBJECTS = [
  // ============================================================
  // MATHEMATICS
  // ============================================================
  {
    name: 'Mathematics',
    code: 'math',
    category: 'Mathematics',
    icon: '📐',
    description: 'Pure Mathematics covering algebra, calculus, trigonometry, geometry and statistics for Grades 10-12.',
    grades: ['Grade 10', 'Grade 11', 'Grade 12'],
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
  },
  {
    name: 'Mathematical Literacy',
    code: 'matlit',
    category: 'Mathematics',
    icon: '🧮',
    description: 'Practical maths for everyday life — finance, measurement, data handling and probability.',
    grades: ['Grade 10', 'Grade 11', 'Grade 12'],
    color: 'bg-sky-50 text-sky-700 border-sky-200',
    bgColor: 'bg-sky-50',
    textColor: 'text-sky-700',
    borderColor: 'border-sky-200',
  },

  // ============================================================
  // SCIENCES
  // ============================================================
  {
    name: 'Physical Sciences',
    code: 'phsc',
    category: 'Sciences',
    icon: '⚗️',
    description: 'Physics and Chemistry integrated — mechanics, waves, chemical reactions, electrochemistry and more.',
    grades: ['Grade 10', 'Grade 11', 'Grade 12'],
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200',
  },
  {
    name: 'Life Sciences',
    code: 'lisc',
    category: 'Sciences',
    icon: '🧬',
    description: 'Biology-focused: cells, genetics, evolution, biodiversity, physiology and ecology.',
    grades: ['Grade 10', 'Grade 11', 'Grade 12'],
    color: 'bg-green-50 text-green-700 border-green-200',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
  },

  // ============================================================
  // COMMERCE
  // ============================================================
  {
    name: 'Accounting',
    code: 'acc',
    category: 'Commerce',
    icon: '📊',
    description: 'Financial accounting, statements, partnerships, companies, VAT and cost accounting.',
    grades: ['Grade 10', 'Grade 11', 'Grade 12'],
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
  },
  {
    name: 'Business Studies',
    code: 'bst',
    category: 'Commerce',
    icon: '💼',
    description: 'Business environments, entrepreneurship, management, marketing and financial planning.',
    grades: ['Grade 10', 'Grade 11', 'Grade 12'],
    color: 'bg-orange-50 text-orange-700 border-orange-200',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
  },
  {
    name: 'Economics',
    code: 'eco',
    category: 'Commerce',
    icon: '📈',
    description: 'Micro and macroeconomics, supply & demand, market structures, inflation and global economics.',
    grades: ['Grade 10', 'Grade 11', 'Grade 12'],
    color: 'bg-teal-50 text-teal-700 border-teal-200',
    bgColor: 'bg-teal-50',
    textColor: 'text-teal-700',
    borderColor: 'border-teal-200',
  },
  {
    name: 'Tourism',
    code: 'tour',
    category: 'Commerce',
    icon: '✈️',
    description: 'South African and global tourism — hospitality, travel, geography of tourism, and sustainable tourism.',
    grades: ['Grade 10', 'Grade 11', 'Grade 12'],
    color: 'bg-violet-50 text-violet-700 border-violet-200',
    bgColor: 'bg-violet-50',
    textColor: 'text-violet-700',
    borderColor: 'border-violet-200',
  },

  // ============================================================
  // HUMANITIES
  // ============================================================
  {
    name: 'History',
    code: 'hist',
    category: 'Humanities',
    icon: '🏛️',
    description: 'South African and world history — colonialism, apartheid, World Wars, civil rights and more.',
    grades: ['Grade 10', 'Grade 11', 'Grade 12'],
    color: 'bg-red-50 text-red-700 border-red-200',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
  },
  {
    name: 'Geography',
    code: 'geo',
    category: 'Humanities',
    icon: '🌍',
    description: 'Physical and human geography — climate, geomorphology, population, development and mapwork.',
    grades: ['Grade 10', 'Grade 11', 'Grade 12'],
    color: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    bgColor: 'bg-cyan-50',
    textColor: 'text-cyan-700',
    borderColor: 'border-cyan-200',
  },

  // ============================================================
  // LANGUAGES
  // ============================================================
  {
    name: 'English HL',
    code: 'enhl',
    category: 'Languages',
    icon: '📖',
    description: 'English Home Language — literature, poetry, language structures, reading and writing skills.',
    grades: ['Grade 10', 'Grade 11', 'Grade 12'],
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-700',
    borderColor: 'border-indigo-200',
  },
  {
    name: 'Afrikaans HL',
    code: 'afhl',
    category: 'Languages',
    icon: '🇿🇦',
    description: 'Afrikaans Home Language — letterkunde, taalkunde, mondelinge kommunikasie en skryfvaardighede.',
    grades: ['Grade 10', 'Grade 11', 'Grade 12'],
    color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-200',
  },
  {
    name: 'isiXhosa HL',
    code: 'xhhl',
    category: 'Languages',
    icon: '🗣️',
    description: 'isiXhosa Home Language — literature, oral traditions, grammar, reading and writing in isiXhosa.',
    grades: ['Grade 10', 'Grade 11', 'Grade 12'],
    color: 'bg-rose-50 text-rose-700 border-rose-200',
    bgColor: 'bg-rose-50',
    textColor: 'text-rose-700',
    borderColor: 'border-rose-200',
  },
  {
    name: 'isiZulu HL',
    code: 'zuhl',
    category: 'Languages',
    icon: '🗣️',
    description: 'isiZulu Home Language — izincwadi, ubuchwepheshe bolimi, isakhiwo solimi, ukufunda nokubhala ngesiZulu.',
    grades: ['Grade 10', 'Grade 11', 'Grade 12'],
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
  },

  // ============================================================
  // LIFE SKILLS
  // ============================================================
  {
    name: 'Life Orientation',
    code: 'lo',
    category: 'Life Skills',
    icon: '🌱',
    description: 'Personal development, career guidance, health, citizenship, democracy and human rights.',
    grades: ['Grade 10', 'Grade 11', 'Grade 12'],
    color: 'bg-lime-50 text-lime-700 border-lime-200',
    bgColor: 'bg-lime-50',
    textColor: 'text-lime-700',
    borderColor: 'border-lime-200',
  },
];

// ============================================================
// ✅ FIXED: Helper Functions
// ============================================================

/**
 * Get a subject by its code
 * 
 * @param {string} code - Subject code (case-insensitive)
 * @returns {Subject|undefined} Matching subject or undefined
 */
export const getSubjectByCode = (code) => {
  if (!code) return undefined;
  return SUBJECTS.find((s) => s.code.toLowerCase() === code.toLowerCase().trim());
};

/**
 * Get a subject by its name
 * 
 * @param {string} name - Subject name (case-insensitive)
 * @returns {Subject|undefined} Matching subject or undefined
 */
export const getSubjectByName = (name) => {
  if (!name) return undefined;
  return SUBJECTS.find((s) => s.name.toLowerCase() === name.toLowerCase().trim());
};

/**
 * Get all subjects in a category
 * 
 * @param {string} category - Category name
 * @returns {Subject[]} Array of subjects in the category
 */
export const getSubjectsByCategory = (category) => {
  return SUBJECTS.filter((s) => s.category === category);
};

/**
 * Get all unique categories
 * 
 * @returns {string[]} Array of category names
 */
export const getAllCategories = () => {
  return [...new Set(SUBJECTS.map((s) => s.category))];
};

/**
 * ✅ NEW: Get subject by ID (alias for code)
 * 
 * @param {string} id - Subject code
 * @returns {Subject|undefined} Matching subject or undefined
 */
export const getSubjectById = (id) => {
  return getSubjectByCode(id);
};

/**
 * ✅ NEW: Get subjects by grade
 * 
 * @param {string} grade - Grade level (e.g., 'Grade 10')
 * @returns {Subject[]} Array of subjects available for the grade
 */
export const getSubjectsByGrade = (grade) => {
  if (!grade) return SUBJECTS;
  return SUBJECTS.filter((s) => s.grades.includes(grade));
};

/**
 * ✅ NEW: Get subjects by multiple grades
 * 
 * @param {string[]} grades - Array of grade levels
 * @returns {Subject[]} Array of subjects available for any of the grades
 */
export const getSubjectsByGrades = (grades) => {
  if (!grades || grades.length === 0) return SUBJECTS;
  return SUBJECTS.filter((s) => grades.some((g) => s.grades.includes(g)));
};

/**
 * ✅ NEW: Get subject color classes
 * 
 * @param {string} code - Subject code
 * @returns {Object} Color classes for the subject
 */
export const getSubjectColors = (code) => {
  const subject = getSubjectByCode(code);
  if (!subject) {
    return {
      bg: 'bg-muted',
      text: 'text-muted-foreground',
      border: 'border-border',
    };
  }
  return {
    bg: subject.bgColor || 'bg-muted',
    text: subject.textColor || 'text-muted-foreground',
    border: subject.borderColor || 'border-border',
    full: subject.color || 'bg-muted text-muted-foreground border-border',
  };
};

/**
 * ✅ NEW: Get subject icon
 * 
 * @param {string} code - Subject code
 * @returns {string} Emoji icon for the subject
 */
export const getSubjectIcon = (code) => {
  const subject = getSubjectByCode(code);
  return subject?.icon || '📚';
};

/**
 * ✅ NEW: Get subject name by code (with fallback)
 * 
 * @param {string} code - Subject code
 * @param {string} fallback - Fallback name if not found
 * @returns {string} Subject name or fallback
 */
export const getSubjectName = (code, fallback = 'Unknown Subject') => {
  const subject = getSubjectByCode(code);
  return subject?.name || fallback;
};

/**
 * ✅ NEW: Check if a subject exists
 * 
 * @param {string} code - Subject code
 * @returns {boolean} True if subject exists
 */
export const isValidSubjectCode = (code) => {
  return !!getSubjectByCode(code);
};

/**
 * ✅ NEW: Get subject categories with counts
 * 
 * @returns {Array<{category: string, count: number}>} Categories with subject counts
 */
export const getCategoryStats = () => {
  const categories = getAllCategories();
  return categories.map((category) => ({
    category,
    count: getSubjectsByCategory(category).length,
  }));
};
