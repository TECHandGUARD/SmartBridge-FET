// Small, source-mapped pilot. Original SmartBridge activities; external sims are linked, not copied.
export const CAPS_PHYSICAL_SCIENCES_URL = 'https://www.education.gov.za/Portals/0/CD/National%20Curriculum%20Statements%20and%20Vocational/CAPS%20FET%20%20PHYSICAL%20SCIENCE%20WEB.pdf';
export const PHET_LICENSE_URL = 'https://phet.colorado.edu/en/licensing';
export const LAB_LIMITATION = 'These activities support learning and preparation. They do not replace prescribed physical practical work or formal school-based assessments. Follow your teacher’s instructions and current school assessment plan.';
export const STEM_ACTIVITIES = Object.freeze([
  {
    id: 'grade-10-transverse-waves', grade: 10, subject: 'Physical Sciences', title: 'Explore transverse waves',
    topic: 'Waves, sound and light: transverse waves', capsPage: 27, minutes: 20,
    simulation: 'Wave on a String', url: 'https://phet.colorado.edu/en/simulations/wave-on-a-string',
    goal: 'Identify amplitude and wavelength, then connect frequency, period and wave speed.',
    context: 'A class can share one screen: one learner operates the wave, another sketches it, and a third explains the changes.',
    steps: ['Choose Oscillate and No End. Keep tension constant. Turn on the ruler and pause to sketch a wave. Label its crest, trough, amplitude and wavelength.', 'Change amplitude only. Predict first, then describe what changed and what stayed the same.', 'Keep amplitude and tension constant. Increase frequency and compare the distance between neighbouring crests. Record your observations.'],
    record: 'Record at least three trials: frequency setting | amplitude setting | wavelength observation. Keep tension constant. If measuring, write the units shown by the simulation.',
    questions: ['A wave has frequency 2 Hz and wavelength 1.5 m. Find its speed and period.', 'At constant wave speed, what happens to wavelength when frequency doubles?'],
    answers: ['v = f × wavelength = 3 m/s; period = 1/f = 0.5 s.', 'Wavelength halves because v = f × wavelength.'],
    paper: 'Draw two waves with the same wavelength and different amplitudes. Then draw two waves with the same amplitude and different wavelengths. Use the supplied 2 Hz and 1.5 m values for the calculation; do not label these as measured results.',
  },
  {
    id: 'grade-11-ohms-law', grade: 11, subject: 'Physical Sciences', title: 'Investigate Ohm’s law',
    topic: 'Electricity and magnetism: electric circuits', capsPage: 88, minutes: 25,
    simulation: 'Ohm’s Law', url: 'https://phet.colorado.edu/en/simulations/ohms-law',
    goal: 'Investigate the relationship between potential difference, current and resistance in an ideal ohmic conductor.',
    context: 'Use a simple model to discuss battery-powered lighting. Real lamps and batteries may behave differently from the ideal model.',
    steps: ['Set resistance to 500 ohms. Choose three different voltages within the available range and record the current for each.', 'Convert current from mA to A where needed. Calculate V/I for each trial and draw a graph of current against voltage.', 'Hold voltage constant and increase resistance. Predict the current change, then compare your prediction with the model.'],
    record: 'Table headings: voltage (V) | current (mA) | current (A) | V/I (ohms). State which variable you changed and which you kept constant.',
    questions: ['An ideal resistor has 6 V across it and a current of 0.012 A. Calculate its resistance.', 'Why must temperature remain constant when testing Ohm’s law on a real conductor?'],
    answers: ['R = V/I = 6/0.012 = 500 ohms.', 'Changing temperature can change resistance, so the test would no longer isolate the voltage-current relationship.'],
    paper: 'Use this supplied ideal data instead of a simulation: 2 V → 4 mA, 4 V → 8 mA, 6 V → 12 mA. Convert units, calculate resistance and sketch the graph. Label these as supplied model values, not experimental measurements.',
  },
  {
    id: 'grade-12-acid-strength', grade: 12, subject: 'Physical Sciences', title: 'Acid strength and concentration',
    topic: 'Chemical change: acids and bases', capsPage: 127, minutes: 25,
    simulation: 'Acid-Base Solutions', url: 'https://phet.colorado.edu/en/simulations/acid-base-solutions',
    goal: 'Distinguish the strength of an acid from its concentration using particle models and pH.',
    context: 'Explore substances virtually. Do not taste, mix or handle household cleaners or acids as part of this activity.',
    steps: ['Open My Solution. Select an acid and set a concentration. Compare a weak and a strong acid at the same concentration. Use the particle view and pH meter.', 'Keep acid strength constant and change concentration. Record the concentration and pH for three settings.', 'Explain which comparison tested strength and which tested concentration. Use evidence from your observations.'],
    record: 'Table headings: strength setting | concentration (mol/L) | pH | particle observations. Change one variable at a time.',
    questions: ['Is a concentrated acid always a strong acid? Explain.', 'What generally happens to the pH of an acidic solution when it is diluted with water?'],
    answers: ['No. Concentration describes solute amount per volume; strength concerns the extent of ionisation in water.', 'Its pH increases towards neutral as the hydronium ion concentration decreases.'],
    paper: 'Explain why strong/dilute and weak/concentrated describe different properties. Sketch a particle model for each and answer the questions. This is a conceptual task, not a titration or a formal practical.',
  },
]);

export function filterStemActivities(grade, query = '', activities = STEM_ACTIVITIES) {
  const needle = query.trim().toLowerCase();
  return activities.filter(activity => (grade === 'all' || activity.grade === Number(grade)) &&
    `${activity.title} ${activity.topic} ${activity.subject}`.toLowerCase().includes(needle));
}

export function isPilotSimulationUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname === 'phet.colorado.edu' && !parsed.username && !parsed.password &&
      !parsed.port && STEM_ACTIVITIES.some(activity => activity.url === url);
  } catch { return false; }
}

export function buildLabWorksheet(activity, notes = '', classroom = false) {
  return [
    'SmartBridge FET • Virtual STEM Lab', `Grade ${activity.grade} • ${activity.subject}`, activity.title,
    `CAPS topic: ${activity.topic} (printed CAPS p. ${activity.capsPage})`, `Aim: ${activity.goal}`,
    classroom ? 'Classroom mode: predict together, rotate operator/recorder/reporter roles and discuss evidence. One screen is enough.' : 'Independent activity: predict, investigate, record and explain.',
    'INVESTIGATE', ...activity.steps.map((step, index) => `${index + 1}. ${step}`), 'RECORD', activity.record,
    'QUESTIONS', ...activity.questions.map((question, index) => `${index + 1}. ${question}\nAnswer: __________________________`),
    'WITHOUT THE SIMULATION', activity.paper, 'MY NOTES', notes || '__________________________',
    'Sources', `DBE CAPS: ${CAPS_PHYSICAL_SCIENCES_URL}`, `PhET Interactive Simulations, University of Colorado Boulder: ${activity.url}`,
    `PhET licensing: ${PHET_LICENSE_URL}`, 'Activity questions written by SmartBridge FET; no DBE or PhET endorsement implied.', LAB_LIMITATION,
  ].join('\n\n');
}
