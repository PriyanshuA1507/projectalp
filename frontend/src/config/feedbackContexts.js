export const FEEDBACK_REPORT_SECTIONS = [
  'Executive Summary',
  'Data Quality and Coverage',
  'Metric-Based Analysis',
  'Key Strengths',
  'Areas for Improvement',
  'Action Plan',
];

const makeContext = ({
  title,
  formName,
  analystRole,
  lens,
  focusMetrics,
  actionPriorities,
}) => ({
  title,
  formName,
  analystRole,
  lens,
  focusMetrics,
  actionPriorities,
});

export const FEEDBACK_CONTEXTS = {
  alumni: makeContext({
    title: 'Alumni Feedback',
    formName: 'ALUMNI FEEDBACK FORM',
    analystRole: 'academic quality assurance and alumni outcomes analyst',
    lens: 'program value, curriculum relevance, lifelong connection with the institution, career support, and graduate outcomes.',
    focusMetrics: [
      'Program value and relevance after graduation',
      'Curriculum alignment with current industry and higher-study needs',
      'Faculty support, mentoring, and academic environment',
      'Campus experience, facilities, and student support',
      'Career outcomes, placement support, and alumni engagement',
    ],
    actionPriorities: [
      'curriculum updates linked to alumni career evidence',
      'placement and mentoring improvements',
      'stronger alumni engagement loops',
    ],
  }),
  course: makeContext({
    title: 'Course Feedback',
    formName: 'COURSE FEEDBACK FORM',
    analystRole: 'academic curriculum and teaching-learning analyst',
    lens: 'course design, learning effectiveness, assessment quality, practical exposure, and student workload.',
    focusMetrics: [
      'Course content relevance and syllabus coverage',
      'Difficulty level, workload, and learning clarity',
      'Learning outcomes and conceptual understanding',
      'Practical exposure, examples, labs, projects, or field work',
      'Assessment design, feedback quality, and teaching support',
    ],
    actionPriorities: [
      'course content refinement',
      'assessment and feedback improvements',
      'practical learning support',
    ],
  }),
  employer: makeContext({
    title: 'Employer Feedback',
    formName: 'EMPLOYER FEEDBACK FORM',
    analystRole: 'industry-academia collaboration and employability analyst',
    lens: 'graduate readiness, workplace performance, technical skill depth, professional behavior, and curriculum-industry fit.',
    focusMetrics: [
      'Technical knowledge and problem-solving ability',
      'Communication, teamwork, ownership, and professionalism',
      'Industry readiness and ability to learn on the job',
      'Curriculum alignment with employer expectations',
      'Training needs, missing skills, and hiring confidence',
    ],
    actionPriorities: [
      'skill-gap closure',
      'industry collaboration',
      'employability and internship readiness',
    ],
  }),
  exit_survey: makeContext({
    title: 'Exit Survey',
    formName: 'EXIT SURVEY FEEDBACK FORM',
    analystRole: 'student outcomes and institutional experience analyst',
    lens: 'graduating student satisfaction, academic journey, support systems, career preparation, and improvement priorities.',
    focusMetrics: [
      'Overall satisfaction with the completed program',
      'Academic quality and learning experience',
      'Support services, mentoring, grievance handling, and inclusion',
      'Infrastructure, library, labs, IT, and campus services',
      'Career preparation, placements, higher education, and future readiness',
    ],
    actionPriorities: [
      'student support improvements',
      'career preparation',
      'institutional experience gaps before graduation',
    ],
  }),
  infrastructure: makeContext({
    title: 'Infrastructure and Facilities',
    formName: 'INFRASTRUCTURE AND FACILITY FEEDBACK FORM',
    analystRole: 'campus facilities and service quality analyst',
    lens: 'physical infrastructure, learning spaces, digital infrastructure, safety, maintenance, and accessibility.',
    focusMetrics: [
      'Classroom quality, seating, ventilation, lighting, and cleanliness',
      'Laboratory, workshop, equipment, and safety readiness',
      'Library, digital resources, internet, and IT infrastructure',
      'Hostel, transport, sports, canteen, sanitation, and campus services',
      'Maintenance responsiveness, accessibility, and safety',
    ],
    actionPriorities: [
      'maintenance and service response',
      'critical facility upgrades',
      'student and staff accessibility',
    ],
  }),
  parent: makeContext({
    title: 'Parent Feedback',
    formName: 'PARENT FEEDBACK FORM',
    analystRole: 'stakeholder engagement and student welfare analyst',
    lens: 'parent confidence, academic quality, safety, communication, student welfare, and value perception.',
    focusMetrics: [
      'Academic quality and student progress',
      'Safety, discipline, wellbeing, and campus environment',
      'Communication with parents and responsiveness of the institution',
      'Facilities, support services, and co-curricular exposure',
      'Value for money and overall parent satisfaction',
    ],
    actionPriorities: [
      'parent communication',
      'student welfare and safety',
      'visible academic progress and support',
    ],
  }),
  teacher_course: makeContext({
    title: "Teacher's Course Feedback",
    formName: "TEACHER'S FEEDBACK ON COURSE FORM",
    analystRole: 'teaching quality and course design analyst',
    lens: 'faculty perspective on curriculum structure, syllabus feasibility, resources, assessment alignment, and student preparedness.',
    focusMetrics: [
      'Course design, sequencing, and syllabus depth',
      'Syllabus coverage feasibility within available contact hours',
      'Availability of teaching resources, labs, tools, and references',
      'Assessment alignment with course outcomes',
      'Student preparedness, participation, and prerequisite gaps',
    ],
    actionPriorities: [
      'course design changes',
      'resource and lab support',
      'assessment and prerequisite alignment',
    ],
  }),
};

export const FEEDBACK_TYPE_MAP = {
  alumni: 'alumni',
  course: 'course',
  employer: 'employer',
  'exit-survey': 'exit_survey',
  infrastructure: 'infrastructure',
  parent: 'parent',
  'teacher-course': 'teacher_course',
};

const listItems = (items) => items.map((item) => `- ${item}`).join('\n');

export const buildFeedbackSystemPrompt = (context) => {
  if (!context) {
    throw new Error('Feedback context is required');
  }

  return `You are an expert ${context.analystRole}. Analyze ${context.formName} data for institutional quality improvement.

Analysis lens:
${context.lens}

Focus metrics:
${listItems(context.focusMetrics)}

Output rules:
- Use only the uploaded data summary. Do not invent counts, percentages, or comments.
- If a metric is missing or unclear, say "Not available in the uploaded data".
- Do not mention, infer, or reproduce names of students, faculty, parents, employers, institutions, departments, companies, phone numbers, email addresses, roll numbers, or IDs.
- Prefer concise evidence: cite visible counts, averages, distributions, and representative anonymous themes when available.
- Return Markdown only.
- Use exactly these six H2 sections, in this order:
${FEEDBACK_REPORT_SECTIONS.map((section, index) => `## ${index + 1}. ${section}`).join('\n')}

Section guidance:
- Executive Summary: 3-5 bullets covering the overall signal and sentiment.
- Data Quality and Coverage: row count, useful columns, missing data, and confidence level.
- Metric-Based Analysis: focused analysis against the listed metrics.
- Key Strengths: strongest positive patterns with evidence.
- Areas for Improvement: weakest patterns or recurring concerns with evidence.
- Action Plan: practical recommendations grouped as Immediate, Short Term, and Long Term.`;
};

export const buildFeedbackUserPrompt = (context, dataSummary) => `Feedback type: ${context.title}

Uploaded data summary:
${dataSummary}

Create the six-section report now. Prioritize these action areas if the data supports them:
${listItems(context.actionPriorities)}`;
