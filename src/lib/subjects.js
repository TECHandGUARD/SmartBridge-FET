export const SUBJECTS = [
  {
    name: 'Mathematics',
    code: 'math',
    category: 'Mathematics',
    icon: '📐',
    description: 'Pure Mathematics covering algebra, calculus, trigonometry, geometry and statistics for Grades 10-12.',
    grades: ['Grade 10', 'Grade 11', 'Grade 12'],
    color: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    name: 'Physical Sciences',
    code: 'phsc',
    category: 'Sciences',
    icon: '⚗️',
    description: 'Physics and Chemistry integrated — mechanics, waves, chemical reactions, electrochemistry and more.',
    grades: ['Grade 10', 'Grade 11', 'Grade 12'],
    color: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  {
    name: 'Life Sciences',
    code: 'lisc',
    category: 'Sciences',
    icon: '🧬',
    description: 'Biology-focused: cells, genetics, evolution, biodiversity, physiology and ecology.',
    grades: ['Grade 10', 'Grade 11', 'Grade 12'],
    color: 'bg-green-50 text-green-700 border-green-200',
  },
  {
    name: 'Accounting',
    code: 'acc',
    category: 'Commerce',
    icon: '📊',
    description: 'Financial accounting, statements, partnerships, companies, VAT and cost accounting.',
    grades: ['Grade 10', 'Grade 11', 'Grade 12'],
    color: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    name: 'Business Studies',
    code: 'bst',
    category: 'Commerce',
    icon: '💼',
    description: 'Business environments, entrepreneurship, management, marketing and financial planning.',
    grades: ['Grade 10', 'Grade 11', 'Grade 12'],
    color: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  {
    name: 'Economics',
    code: 'eco',
    category: 'Commerce',
    icon: '📈',
    description: 'Micro and macroeconomics, supply & demand, market structures, inflation and global economics.',
    grades: ['Grade 10', 'Grade 11', 'Grade 12'],
    color: 'bg-teal-50 text-teal-700 border-teal-200',
  },
  {
    name: 'History',
    code: 'hist',
    category: 'Humanities',
    icon: '🏛️',
    description: 'South African and world history — colonialism, apartheid, World Wars, civil rights and more.',
    grades: ['Grade 10', 'Grade 11', 'Grade 12'],
    color: 'bg-red-50 text-red-700 border-red-200',
  },
  {
    name: 'Geography',
    code: 'geo',
    category: 'Humanities',
    icon: '🌍',
    description: 'Physical and human geography — climate, geomorphology, population, development and mapwork.',
    grades: ['Grade 10', 'Grade 11', 'Grade 12'],
    color: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  },
  {
    name: 'English HL',
    code: 'enhl',
    category: 'Languages',
    icon: '📖',
    description: 'English Home Language — literature, poetry, language structures, reading and writing skills.',
    grades: ['Grade 10', 'Grade 11', 'Grade 12'],
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  {
    name: 'isiXhosa HL',
    code: 'xhhl',
    category: 'Languages',
    icon: '🗣️',
    description: 'isiXhosa Home Language — literature, oral traditions, grammar, reading and writing in isiXhosa.',
    grades: ['Grade 10', 'Grade 11', 'Grade 12'],
    color: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  {
    name: 'isiZulu HL',
    code: 'zuhl',
    category: 'Languages',
    icon: '🗣️',
    description: 'isiZulu Home Language — izincwadi, ubuchwepheshe bolimi, isakhiwo solimi, ukufunda nokubhala ngesiZulu.',
    grades: ['Grade 10', 'Grade 11', 'Grade 12'],
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    name: 'Life Orientation',
    code: 'lo',
    category: 'Life Skills',
    icon: '🌱',
    description: 'Personal development, career guidance, health, citizenship, democracy and human rights.',
    grades: ['Grade 10', 'Grade 11', 'Grade 12'],
    color: 'bg-lime-50 text-lime-700 border-lime-200',
  },
  {
    name: 'Afrikaans HL',
    code: 'afhl',
    category: 'Languages',
    icon: '🇿🇦',
    description: 'Afrikaans Home Language — letterkunde, taalkunde, mondelinge kommunikasie en skryfvaardighede.',
    grades: ['Grade 10', 'Grade 11', 'Grade 12'],
    color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  },
  {
    name: 'Mathematical Literacy',
    code: 'matlit',
    category: 'Mathematics',
    icon: '🧮',
    description: 'Practical maths for everyday life — finance, measurement, data handling and probability.',
    grades: ['Grade 10', 'Grade 11', 'Grade 12'],
    color: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  {
    name: 'Tourism',
    code: 'tour',
    category: 'Commerce',
    icon: '✈️',
    description: 'South African and global tourism — hospitality, travel, geography of tourism, and sustainable tourism.',
    grades: ['Grade 10', 'Grade 11', 'Grade 12'],
    color: 'bg-violet-50 text-violet-700 border-violet-200',
  },
];

export const getSubjectByCode = (code) => {
  if (!code) return undefined;
  return SUBJECTS.find((s) => s.code.toLowerCase() === code.toLowerCase().trim());
};

export const getSubjectByName = (name) => {
  if (!name) return undefined;
  return SUBJECTS.find((s) => s.name.toLowerCase() === name.toLowerCase().trim());
};

export const getSubjectsByCategory = (category) => {
  return SUBJECTS.filter((s) => s.category === category);
};

export const getAllCategories = () => {
  return [...new Set(SUBJECTS.map((s) => s.category))];
};
