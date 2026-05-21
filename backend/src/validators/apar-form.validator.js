import { z } from 'zod';
import { hasRequiredGraduation } from '../utils/qualification.util.js';

const nonEmptyString = (fieldName) => z.string().trim().min(1, `${fieldName} is required`);
const optionalString = z.string().trim().optional();
const optionalNumber = z.number().optional();
const optionalDate = z.date().optional().or(z.string().optional());

// Personal Data Validation
const personalSchema = z.object({
  name: nonEmptyString('Name'),
  designation: nonEmptyString('Designation'),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  email: z.union([z.string().email('Invalid email format'), z.literal('')]).optional(),
  phone: optionalString,
  department_id: nonEmptyString('Department'),
  qualification_undergraduate: optionalString,
  qualification_postgraduate: optionalString,
  qualification_phd: optionalString,
  qualification: optionalString,
  joining_date: z.string().min(1, 'Joining date is required'),
  report_start_date: optionalString,
  report_end_date: optionalString,
  sc_st_status: nonEmptyString('Caste category'),
  absence_period: z.string().min(1, 'Absence period is required'),
  grade: z.string().min(1, 'Grade is required')
}).superRefine((data, ctx) => {
  if (!hasRequiredGraduation(data)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Graduation qualification is required',
      path: ['qualification_undergraduate'],
    });
  }
});

// Teaching Validation
const teachingSchema = z.object({
  description_of_duties: optionalString,
  courses_taught: z.array(z.object({
    name_of_course: optionalString,
    total_lectures_scheduled: optionalString,
    total_lectures_engaged: optionalString,
    tutorials_scheduled: optionalString,
    tutorials_engaged: optionalString,
    labs_scheduled: optionalString,
    labs_engaged: optionalString,
    reasons_not_engaged: optionalString,
    degree_type: z.enum(['UG', 'PG']).optional()
  })).optional(),
  time_table: z.object({
    provided: z.object({
      odd_semester: optionalString,
      even_semester: optionalString
    }).optional(),
    actual: z.object({
      odd_semester: optionalString,
      even_semester: optionalString
    }).optional()
  }).optional(),
  workload_week: z.object({
    odd_semester: z.object({
      lectures: optionalString,
      tutorials: optionalString,
      practicals: optionalString,
      seminars: optionalString
    }).optional(),
    even_semester: z.object({
      lectures: optionalString,
      tutorials: optionalString,
      practicals: optionalString,
      seminars: optionalString
    }).optional()
  }).optional(),
  teaching_methods: optionalString,
  ict_tools: optionalString,
  student_centric_methods: optionalString,
  tutorials_tests: z.object({
    ug_odd: z.object({
      number_of_tests: optionalString,
      assignment_checked: optionalString
    }).optional(),
    ug_even: z.object({
      number_of_tests: optionalString,
      assignment_checked: optionalString
    }).optional(),
    pg_odd: z.object({
      number_of_tests: optionalString,
      assignment_checked: optionalString
    }).optional(),
    pg_even: z.object({
      number_of_tests: optionalString,
      assignment_checked: optionalString
    }).optional()
  }).optional(),
  academic_planning: optionalString
});

// Research Validation
const researchSchema = z.object({
  journals: z.array(z.object({
    paper_id: optionalString,
    title: optionalString,
    name_of_journal: optionalString,
    author_names: optionalString,
    issn: optionalString,
    volume: optionalString,
    issue: optionalString,
    page_numbers: optionalString,
    year_of_publication: optionalString,
    doi: optionalString,
    indexing: optionalString,
    impact_factor: optionalString,
    citation_count: optionalString,
    is_ugc_care_listed: optionalString,
    link: optionalString,
    link_to_paper: optionalString,
    department_id: optionalString
  })).optional(),
  conferences: z.array(z.object({
    paper_id: optionalString,
    title: optionalString,
    title_of_paper: optionalString,
    name_of_conference: optionalString,
    conference_level: optionalString,
    organizer: optionalString,
    venue: optionalString,
    publisher: optionalString,
    isbn: optionalString,
    year_of_publication: optionalString,
    doi: optionalString,
    indexing: optionalString,
    award_received: optionalString,
    paper_status: optionalString,
    link: optionalString,
    link_to_paper: optionalString,
    department_id: optionalString
  })).optional(),
  books: z.array(z.object({
    publication_id: optionalString,
    title_of_book: optionalString,
    title_of_chapter: optionalString,
    publication_type: optionalString,
    role: optionalString,
    year: optionalString,
    isbn_number: optionalString,
    name_of_publisher: optionalString,
    publisher_type: optionalString,
    same_institute_affiliation: optionalString,
    link_to_publication: optionalString,
    link: optionalString,
    doi: optionalString,
    department_id: optionalString
  })).optional(),
  projects: z.array(z.object({
    project_id: optionalString,
    title_research: optionalString,
    title: optionalString,
    type_of_project: optionalString,
    funding_agency_name: optionalString,
    funding_type: optionalString,
    sanction_number: optionalString,
    year_of_sanction: optionalString,
    amount: optionalString,
    start_date: optionalString,
    end_date: optionalString,
    status: optionalString,
    outcome: optionalString,
    remarks: optionalString,
    academic_year: optionalString,
    department_id: optionalString
  })).optional(),
  consultancy: z.array(z.object({
    consultancy_id: optionalString,
    name_of_project: optionalString,
    title: optionalString,
    agency_name: optionalString,
    type_of_agency: optionalString,
    consultancy_type: optionalString,
    grant_amount: optionalString,
    revenue_generated: optionalString,
    start_date: optionalString,
    end_date: optionalString,
    year_of_consultancy: optionalString,
    remarks: optionalString,
    link: optionalString,
    department_id: optionalString
  })).optional(),
  patents: z.array(z.object({
    patent_id: optionalString,
    patent_title: optionalString,
    author_names: optionalString,
    application_number: optionalString,
    patent_number: optionalString,
    status: optionalString,
    country: optionalString,
    date_of_filing: optionalString,
    date_of_award: optionalString,
    patent_awarding_agency: optionalString,
    link_to_patent: optionalString,
    link: optionalString,
    department_id: optionalString
  })).optional(),
  awards: z.array(z.object({
    award_id: optionalString,
    name_of_award: optionalString,
    type_of_award: optionalString,
    category_of_award: optionalString,
    name_of_organisation: optionalString,
    awarding_agency: optionalString,
    date_of_award: optionalString,
    monetary_value: optionalString,
    year: optionalString,
    link: optionalString,
    evidence_link: optionalString,
    academic_year: optionalString,
    department_id: optionalString
  })).optional(),
  e_content: z.array(z.object({
    econtent_id: optionalString,
    name_of_module: optionalString,
    type_of_content: optionalString,
    platform: optionalString,
    platform_type: optionalString,
    date_of_launching: optionalString,
    target_audience: optionalString,
    duration_hours: optionalString,
    learning_outcome: optionalString,
    link: optionalString,
    course_id: optionalString,
    academic_year: optionalString,
    department_id: optionalString,
    faculty_id: optionalString
  })).optional(),
  faculty_visits: z.array(z.object({
    visit_id: optionalString,
    organisation_name: optionalString,
    title: optionalString,
    visit_type: optionalString,
    purpose: optionalString,
    location: optionalString,
    start_date: optionalString,
    end_date: optionalString,
    link: optionalString,
    academic_year: optionalString,
    department_id: optionalString,
    faculty_id: optionalString
  })).optional(),
  collaborations: z.array(z.object({
    activity_id: optionalString,
    title_of_activity: optionalString,
    title: optionalString,
    name_of_collaborative_agency: optionalString,
    type_of_activity: optionalString,
    nature_of_activity: optionalString,
    number_of_participants: optionalString,
    source_of_financial_support: optionalString,
    funding_amount: optionalString,
    year: optionalString,
    duration: optionalString,
    level: optionalString,
    start_date: optionalString,
    end_date: optionalString,
    link: optionalString,
    academic_year: optionalString,
    department_id: optionalString
  })).optional(),
  phd_supervision: z.array(z.object({
    defence_id: optionalString,
    student_id: optionalString,
    student_name: optionalString,
    enrollment_no: optionalString,
    thesis_title: optionalString,
    thesis_type: optionalString,
    supervisor_name: optionalString,
    supervisor_id: optionalString,
    date_of_defence: optionalString,
    date_of_result_notification: optionalString,
    result_outcome: optionalString,
    academic_year: optionalString,
    remarks: optionalString,
    link: optionalString,
    department_id: optionalString
  })).optional(),
  mous: z.array(z.object({
    mou_id: optionalString,
    organisation_name: optionalString,
    title: optionalString,
    type_of_mou: optionalString,
    year_of_signing: optionalString,
    purpose: optionalString,
    activities_under_mou: optionalString,
    start_date: optionalString,
    end_date: optionalString,
    level: optionalString,
    link: optionalString,
    academic_year: optionalString,
    department_id: optionalString
  })).optional(),
  workshops: z.array(z.object({
    program_id: optionalString,
    program_title: optionalString,
    type_of_program: optionalString,
    level: optionalString,
    mode: optionalString,
    duration_days: optionalString,
    organising_body: optionalString,
    funding_agency: optionalString,
    venue: optionalString,
    certificate_link: optionalString,
    start_date: optionalString,
    end_date: optionalString,
    outcome: optionalString,
    remarks: optionalString,
    link: optionalString,
    academic_year: optionalString,
    department_id: optionalString
  })).optional(),
  summer_institutes: optionalString,
  ug_pg_guidance: optionalString,
  phd_guidance_text: optionalString,
  research_guidance: optionalString,
  industry_interaction: optionalString,
  memberships_text: optionalString,
  other_activities: optionalString
});

// Corporate Life Validation
const corporateSchema = z.object({
  curriculum_development: optionalString,
  course_development_details: optionalString,
  lab_development: optionalString,
  cultural_activities: optionalString,
  sports_community: optionalString,
  admin_assignment: optionalString,
  any_other: optionalString,
  certify: z.union([z.string().trim(), z.boolean()]).optional()
});

// Assessment Validation (scores must be between 1-10)
const assessmentScoreSchema = z.object({
  q1: z.string().optional().refine((val) => !val || (parseInt(val) >= 1 && parseInt(val) <= 10), { message: 'Score must be between 1 and 10' }),
  q2: z.string().optional().refine((val) => !val || (parseInt(val) >= 1 && parseInt(val) <= 10), { message: 'Score must be between 1 and 10' }),
  q3: z.string().optional().refine((val) => !val || (parseInt(val) >= 1 && parseInt(val) <= 10), { message: 'Score must be between 1 and 10' }),
  q4: z.string().optional().refine((val) => !val || (parseInt(val) >= 1 && parseInt(val) <= 10), { message: 'Score must be between 1 and 10' }),
  overall_grading: z.string().optional().refine((val) => !val || (parseInt(val) >= 1 && parseInt(val) <= 10), { message: 'Score must be between 1 and 10' })
});

const assessmentSectionBSchema = z.object({
  q1: z.string().optional().refine((val) => !val || (parseInt(val) >= 1 && parseInt(val) <= 10), { message: 'Score must be between 1 and 10' }),
  q2: z.string().optional().refine((val) => !val || (parseInt(val) >= 1 && parseInt(val) <= 10), { message: 'Score must be between 1 and 10' }),
  q3: z.string().optional().refine((val) => !val || (parseInt(val) >= 1 && parseInt(val) <= 10), { message: 'Score must be between 1 and 10' }),
  q4: z.string().optional().refine((val) => !val || (parseInt(val) >= 1 && parseInt(val) <= 10), { message: 'Score must be between 1 and 10' }),
  q5: z.string().optional().refine((val) => !val || (parseInt(val) >= 1 && parseInt(val) <= 10), { message: 'Score must be between 1 and 10' }),
  q6: z.string().optional().refine((val) => !val || (parseInt(val) >= 1 && parseInt(val) <= 10), { message: 'Score must be between 1 and 10' }),
  q7a: z.string().optional().refine((val) => !val || (parseInt(val) >= 1 && parseInt(val) <= 10), { message: 'Score must be between 1 and 10' }),
  q7b: z.string().optional().refine((val) => !val || (parseInt(val) >= 1 && parseInt(val) <= 10), { message: 'Score must be between 1 and 10' }),
  q8: z.string().optional().refine((val) => !val || (parseInt(val) >= 1 && parseInt(val) <= 10), { message: 'Score must be between 1 and 10' }),
  q9: z.string().optional().refine((val) => !val || (parseInt(val) >= 1 && parseInt(val) <= 10), { message: 'Score must be between 1 and 10' }),
  q10: z.string().optional().refine((val) => !val || (parseInt(val) >= 1 && parseInt(val) <= 10), { message: 'Score must be between 1 and 10' }),
  q11: z.union([z.enum(['Outstanding', 'Very Good', 'Good', 'Average', 'Below Average']), z.literal('')]).optional(),
  overall_grading: z.string().optional().refine((val) => !val || (parseInt(val) >= 1 && parseInt(val) <= 10), { message: 'Score must be between 1 and 10' })
});

const assessmentSectionCSchema = z.object({
  q1: z.string().optional().refine((val) => !val || (parseInt(val) >= 1 && parseInt(val) <= 10), { message: 'Score must be between 1 and 10' }),
  q2: z.string().optional().refine((val) => !val || (parseInt(val) >= 1 && parseInt(val) <= 10), { message: 'Score must be between 1 and 10' }),
  q3: z.string().optional().refine((val) => !val || (parseInt(val) >= 1 && parseInt(val) <= 10), { message: 'Score must be between 1 and 10' }),
  q4: z.string().optional().refine((val) => !val || (parseInt(val) >= 1 && parseInt(val) <= 10), { message: 'Score must be between 1 and 10' }),
  q5: z.string().optional().refine((val) => !val || (parseInt(val) >= 1 && parseInt(val) <= 10), { message: 'Score must be between 1 and 10' }),
  q6: z.string().optional().refine((val) => !val || (parseInt(val) >= 1 && parseInt(val) <= 10), { message: 'Score must be between 1 and 10' }),
  overall_grading: z.string().optional().refine((val) => !val || (parseInt(val) >= 1 && parseInt(val) <= 10), { message: 'Score must be between 1 and 10' })
});

const assessmentGeneralSchema = z.object({
  q1: optionalString,
  q2: optionalString,
  q3: optionalString,
  q4: optionalString,
  q5: optionalString,
  q6: z.string().optional().refine((val) => !val || (parseInt(val) >= 1 && parseInt(val) <= 10), { message: 'Overall score must be between 1 and 10' })
});

const assessmentSchema = z.object({
  section_a: assessmentScoreSchema.optional(),
  section_b: assessmentSectionBSchema.optional(),
  section_c: assessmentSectionCSchema.optional(),
  general: assessmentGeneralSchema.optional()
});

// Remarks Validation
const remarksSchema = z.object({
  length_of_service: optionalString,
  satisfied_with_reporting: optionalString,
  agree_with_assessment: z.enum(['Yes', 'No']).optional(),
  disagreement_reason: optionalString,
  general_remarks: optionalString,
  specific_characteristics: optionalString,
  query_comment: optionalString
});

// Full APAR Form Schema
export const aparFormSchema = z.object({
  body: z.object({
    ay: z.string().min(1, 'Academic Year is required'),
    faculty_id: z.string().min(1, 'Faculty ID is required'),
    formData: z.object({
      personal: personalSchema,
      teaching: teachingSchema.optional(),
      research: researchSchema.optional(),
      corporate: corporateSchema.optional(),
      assessment: assessmentSchema.optional(),
      remarks: remarksSchema.optional()
    }).optional()
  }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough()
});

// Schema for saving draft (very lenient - only required fields)
export const aparDraftSchema = z.object({
  body: z.object({
    ay: z.string().min(1, 'Academic Year is required'),
    faculty_id: z.string().min(1, 'Faculty ID is required'),
    formData: z.object({
      personal: z.object({
        name: z.string().optional(),
        designation: z.string().optional(),
        date_of_birth: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        department_id: z.string().optional(),
        qualification: z.string().optional(),
        qualification_undergraduate: z.string().optional(),
        qualification_postgraduate: z.string().optional(),
        qualification_phd: z.string().optional(),
        joining_date: z.string().optional(),
        report_start_date: z.string().optional(),
        report_end_date: z.string().optional(),
        sc_st_status: z.string().optional(),
        absence_period: z.string().optional(),
        grade: z.string().optional()
      }).optional(),
      teaching: z.any().optional(),
      research: z.any().optional(),
      corporate: z.any().optional(),
      assessment: z.any().optional(),
      remarks: z.any().optional()
    }).optional()
  }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough()
});

// Schema for assessment submission (requires assessment section)
export const aparAssessmentSchema = z.object({
  body: z.object({
    faculty_id: z.string().min(1, 'Faculty ID is required'),
    ay: z.string().min(1, 'Academic Year is required'),
    assessment: assessmentSchema,
    status: z.string().optional(),
    query_comment: z.string().optional()
  }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough()
});
