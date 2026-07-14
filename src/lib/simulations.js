/**
 * ====================================================================
 * VIRTUAL LABORATORY COMPLIANCE LAYER
 * REFERENCE FRAMEWORK: UNIVERSITY OF COLORADO BOULDER (PhET)
 * TYPE IMPLEMENTATION: PRODUCTION STRUCTURAL INTERFACE CONTRACTS
 * 
 * NOTE: This file contains STATIC FALLBACK data only.
 * In production, simulations should be loaded from the database
 * to allow admin updates without code deployment.
 * ====================================================================
 */

// ============================================================
// Configuration (Soft-coded for admin control)
// ============================================================

const appName = import.meta.env.VITE_APP_NAME || 'SmartBridge FET';

// ============================================================
// Types
// ============================================================

/**
 * @typedef {Object} Simulation
 * @property {string} id - Unique identifier for the simulation
 * @property {string} title - Display title
 * @property {string} subject - Subject category (Physics, Chemistry, Biology)
 * @property {number} grade_level - Grade level (10, 11, 12)
 * @property {string} thumbnail_url - URL to thumbnail image
 * @property {string} simulation_url - URL to the simulation (PhET, etc.)
 * @property {string} [worksheet_url] - Optional URL to worksheet
 * @property {string} description - Description of the simulation
 * @property {string} caps_topic - CAPS-aligned topic
 */

/**
 * @typedef {Object} SimulationFilterOptions
 * @property {string} subject - Subject filter
 * @property {number|string} grade - Grade filter
 */

// ============================================================
// ✅ FIXED: Static Fallback Data
// ============================================================

export const STATIC_SIMULATIONS_FALLBACK = [
  // ============================================================
  // PHYSICS
  // ============================================================
  {
    id: 'phet-forces-motion',
    title: 'Forces & Motion: Basics',
    subject: 'Physics',
    grade_level: 10,
    thumbnail_url: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=400&h=250&fit=crop',
    simulation_url: 'https://phet.colorado.edu/sims/html/forces-and-motion-basics/latest/forces-and-motion-basics_en.html',
    worksheet_url: 'https://phet.colorado.edu/en/contributions/view/3460',
    description: 'Explore the forces at work when pushing a filing cabinet. Create an applied force and see how it affects motion.',
    caps_topic: "Newton's Laws of Motion",
    source: 'PhET Interactive Simulations',
  },
  {
    id: 'phet-energy-skate',
    title: 'Energy Skate Park',
    subject: 'Physics',
    grade_level: 10,
    thumbnail_url: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=400&h=250&fit=crop',
    simulation_url: 'https://phet.colorado.edu/sims/html/energy-skate-park-basics/latest/energy-skate-park-basics_en.html',
    worksheet_url: 'https://phet.colorado.edu/en/contributions/view/3707',
    description: 'Learn about conservation of energy using a skate park. View the energy in the bar chart.',
    caps_topic: 'Conservation of Energy',
    source: 'PhET Interactive Simulations',
  },
  {
    id: 'phet-waves',
    title: 'Wave on a String',
    subject: 'Physics',
    grade_level: 11,
    thumbnail_url: 'https://images.unsplash.com/photo-1509228627152-72ae9ae6848d?w=400&h=250&fit=crop',
    simulation_url: 'https://phet.colorado.edu/sims/html/wave-on-a-string/latest/wave-on-a-string_en.html',
    worksheet_url: 'https://phet.colorado.edu/en/contributions/view/3709',
    description: 'Explore wave propagation, reflection, and interference on a string.',
    caps_topic: 'Waves, Sound and Light',
    source: 'PhET Interactive Simulations',
  },
  {
    id: 'phet-circuit',
    title: 'Circuit Construction Kit',
    subject: 'Physics',
    grade_level: 11,
    thumbnail_url: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400&h=250&fit=crop',
    simulation_url: 'https://phet.colorado.edu/sims/html/circuit-construction-kit-dc/latest/circuit-construction-kit-dc_en.html',
    worksheet_url: 'https://phet.colorado.edu/en/contributions/view/3908',
    description: 'Build circuits with resistors, light bulbs, batteries, and switches.',
    caps_topic: 'Electric Circuits',
    source: 'PhET Interactive Simulations',
  },
  {
    id: 'phet-photoelectric',
    title: 'Photoelectric Effect',
    subject: 'Physics',
    grade_level: 12,
    thumbnail_url: 'https://images.unsplash.com/photo-1534224039826-c7a0eda0e6b3?w=400&h=250&fit=crop',
    simulation_url: 'https://phet.colorado.edu/sims/html/photoelectric-effect/latest/photoelectric-effect_en.html',
    worksheet_url: 'https://phet.colorado.edu/en/contributions/view/3916',
    description: 'See how light knocks electrons off a metal surface and explore the quantum nature of light.',
    caps_topic: 'Photoelectric Effect',
    source: 'PhET Interactive Simulations',
  },

  // ============================================================
  // CHEMISTRY
  // ============================================================
  {
    id: 'phet-molecules-shapes',
    title: 'Molecule Shapes',
    subject: 'Chemistry',
    grade_level: 11,
    thumbnail_url: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=400&h=250&fit=crop',
    simulation_url: 'https://phet.colorado.edu/sims/html/molecule-shapes/latest/molecule-shapes_en.html',
    worksheet_url: 'https://phet.colorado.edu/en/contributions/view/3711',
    description: 'Explore molecular geometry by building molecules in 3D.',
    caps_topic: 'Chemical Bonding',
    source: 'PhET Interactive Simulations',
  },
  {
    id: 'phet-states-matter',
    title: 'States of Matter',
    subject: 'Chemistry',
    grade_level: 10,
    thumbnail_url: 'https://images.unsplash.com/photo-1562077981-4d7eafd44932?w=400&h=250&fit=crop',
    simulation_url: 'https://phet.colorado.edu/sims/html/states-of-matter/latest/states-of-matter_en.html',
    worksheet_url: 'https://phet.colorado.edu/en/contributions/view/3713',
    description: 'Examine the properties of three states of matter and phase transitions.',
    caps_topic: 'Kinetic Molecular Theory',
    source: 'PhET Interactive Simulations',
  },
  {
    id: 'phet-reactions-rates',
    title: 'Reactions & Rates',
    subject: 'Chemistry',
    grade_level: 12,
    thumbnail_url: 'https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?w=400&h=250&fit=crop',
    simulation_url: 'https://phet.colorado.edu/sims/html/reactions-and-rates/latest/reactions-and-rates_en.html',
    worksheet_url: 'https://phet.colorado.edu/en/contributions/view/3726',
    description: 'Explore how reactions occur and how factors affect rates of reactions.',
    caps_topic: 'Chemical Equilibrium',
    source: 'PhET Interactive Simulations',
  },
  {
    id: 'phet-ph-scale',
    title: 'pH Scale',
    subject: 'Chemistry',
    grade_level: 11,
    thumbnail_url: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=400&h=250&fit=crop',
    simulation_url: 'https://phet.colorado.edu/sims/html/ph-scale/latest/ph-scale_en.html',
    worksheet_url: 'https://phet.colorado.edu/en/contributions/view/3721',
    description: 'Test the pH of common solutions and learn about acidic and basic properties.',
    caps_topic: 'Acids and Bases',
    source: 'PhET Interactive Simulations',
  },

  // ============================================================
  // BIOLOGY
  // ============================================================
  {
    id: 'phet-natural-selection',
    title: 'Natural Selection',
    subject: 'Biology',
    grade_level: 12,
    thumbnail_url: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&h=250&fit=crop',
    simulation_url: 'https://phet.colorado.edu/sims/html/natural-selection/latest/natural-selection_en.html',
    worksheet_url: 'https://phet.colorado.edu/en/contributions/view/3896',
    description: 'Explore natural selection by controlling the environment and describing the bunnies\' evolution.',
    caps_topic: 'Evolution',
    source: 'PhET Interactive Simulations',
  },
  {
    id: 'phet-membrane-channels',
    title: 'Membrane Channels',
    subject: 'Biology',
    grade_level: 11,
    thumbnail_url: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=400&h=250&fit=crop',
    simulation_url: 'https://phet.colorado.edu/sims/html/neuron/latest/neuron_en.html',
    worksheet_url: 'https://phet.colorado.edu/en/contributions/view/3897',
    description: 'Explore how ions pass through membrane channels and generate action potentials.',
    caps_topic: 'Nervous System',
    source: 'PhET Interactive Simulations',
  },
  {
    id: 'phet-gene-expression',
    title: 'Gene Expression Essentials',
    subject: 'Biology',
    grade_level: 12,
    thumbnail_url: 'https://images.unsplash.com/photo-1530026186672-2cd00ffc50fe?w=400&h=250&fit=crop',
    simulation_url: 'https://phet.colorado.edu/sims/html/gene-expression-essentials/latest/gene-expression-essentials_en.html',
    worksheet_url: 'https://phet.colorado.edu/en/contributions/view/3899',
    description: 'Explore how genes are expressed through transcription and translation.',
    caps_topic: 'DNA & RNA',
    source: 'PhET Interactive Simulations',
  },
];

// ============================================================
// Filter Constants
// ============================================================

export const SUBJECTS_SIM = ['All', 'Physics', 'Chemistry', 'Biology'];
export const GRADES_SIM = ['All Grades', 'Grade 10', 'Grade 11', 'Grade 12'];

// ============================================================
// ✅ NEW: Helper Functions
// ============================================================

/**
 * Get simulations filtered by subject and grade
 * 
 * @param {string} subject - Subject filter
 * @param {string} grade - Grade filter
 * @param {Simulation[]} simulations - Array of simulations to filter
 * @returns {Simulation[]} Filtered simulations
 */
export const filterSimulations = (subject, grade, simulations = STATIC_SIMULATIONS_FALLBACK) => {
  let filtered = [...simulations];
  
  if (subject && subject !== 'All') {
    filtered = filtered.filter(s => s.subject === subject);
  }
  
  if (grade && grade !== 'All Grades') {
    const gradeNum = parseInt(grade.replace('Grade ', ''));
    if (!isNaN(gradeNum)) {
      filtered = filtered.filter(s => s.grade_level === gradeNum);
    }
  }
  
  return filtered;
};

/**
 * Get unique subjects from simulations
 * 
 * @param {Simulation[]} simulations - Array of simulations
 * @returns {string[]} Array of unique subject names
 */
export const getUniqueSubjects = (simulations = STATIC_SIMULATIONS_FALLBACK) => {
  return [...new Set(simulations.map(s => s.subject))];
};

/**
 * Get unique grades from simulations
 * 
 * @param {Simulation[]} simulations - Array of simulations
 * @returns {number[]} Array of unique grade levels
 */
export const getUniqueGrades = (simulations = STATIC_SIMULATIONS_FALLBACK) => {
  return [...new Set(simulations.map(s => s.grade_level))].sort();
};

/**
 * Get a simulation by ID
 * 
 * @param {string} id - Simulation ID
 * @param {Simulation[]} simulations - Array of simulations
 * @returns {Simulation|undefined} Matching simulation
 */
export const getSimulationById = (id, simulations = STATIC_SIMULATIONS_FALLBACK) => {
  return simulations.find(s => s.id === id);
};

/**
 * Get simulations by subject
 * 
 * @param {string} subject - Subject name
 * @param {Simulation[]} simulations - Array of simulations
 * @returns {Simulation[]} Matching simulations
 */
export const getSimulationsBySubject = (subject, simulations = STATIC_SIMULATIONS_FALLBACK) => {
  return simulations.filter(s => s.subject === subject);
};

/**
 * Get simulations by grade
 * 
 * @param {number} grade - Grade level
 * @param {Simulation[]} simulations - Array of simulations
 * @returns {Simulation[]} Matching simulations
 */
export const getSimulationsByGrade = (grade, simulations = STATIC_SIMULATIONS_FALLBACK) => {
  return simulations.filter(s => s.grade_level === grade);
};
