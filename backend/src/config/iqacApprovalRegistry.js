import { set as createBooksChaptersPublished } from '../data-access/books_chapters_published.data-access.js';
import { set as createCapabilityEnhancementScheme } from '../data-access/capability_enhancement_schemes.data-access.js';
import { set as createCollaborativeActivity } from '../data-access/collaborative_activities.data-access.js';
import { set as createCollaborativeResearchExchange } from '../data-access/collaborative_research_exchange.data-access.js';
import { set as createConferenceResearchPaper } from '../data-access/conference_research_papers.data-access.js';
import { set as createEContentDeveloped } from '../data-access/e_content_developed.data-access.js';
import { set as createExtensionOutreachActivity } from '../data-access/extension_outreach_activities.data-access.js';
import { set as createFacultyDevelopmentProgram } from '../data-access/faculty_development_programs.data-access.js';
import { set as createFacultyVisit } from '../data-access/faculty_visits.data-access.js';
import { set as createFinancialSupportEvent } from '../data-access/financial_support_events.data-access.js';
import { set as createFunctionalMou } from '../data-access/functional_mous.data-access.js';
import { set as createItInfrastructureStock } from '../data-access/it_infrastructure_stock.data-access.js';
import { set as createJournalResearchPaper } from '../data-access/journal_research_papers.data-access.js';
import { set as createMentorsStressSupport } from '../data-access/mentors_stress_support.data-access.js';
import { set as createPatent } from '../data-access/patents.data-access.js';
import { set as createPhdDefence } from '../data-access/phd_defence.data-access.js';
import { set as createProfessionalAffiliation } from '../data-access/professional_affiliations.data-access.js';
import { set as createProfessionalTrainingStaff } from '../data-access/professional_training_staff.data-access.js';
import { set as createResearchFunding } from '../data-access/research_funding.data-access.js';
import { set as createResearchInnovationAward } from '../data-access/research_innovation_awards.data-access.js';
import { set as createRevenueFromConsultancy } from '../data-access/revenue_from_consultancy.data-access.js';
import { set as createRevenueFromCorporateTraining } from '../data-access/revenue_from_corporate_training.data-access.js';
import { set as createStaffTraining } from '../data-access/staff_training.data-access.js';
import { set as createStudentCentricMethod } from '../data-access/student_centric_methods.data-access.js';
import { set as createTeachersUsingIct } from '../data-access/teachers_using_ict.data-access.js';

export const iqacApprovalRegistry = {
  books_chapters_published: {
    title: 'Books & Chapters Published',
    keyAccessor: 'publication_id',
    create: createBooksChaptersPublished
  },
  capability_enhancement_schemes: {
    title: 'Capability Enhancement Schemes',
    keyAccessor: 'scheme_id',
    create: createCapabilityEnhancementScheme
  },
  collaborative_activities: {
    title: 'Collaborative Activities',
    keyAccessor: 'activity_id',
    create: createCollaborativeActivity
  },
  collaborative_research_exchanges: {
    title: 'Collaborative Research Exchange',
    keyAccessor: 'collaboration_id',
    create: createCollaborativeResearchExchange
  },
  conference_research_papers: {
    title: 'Conference Research Papers',
    keyAccessor: 'paper_id',
    create: createConferenceResearchPaper
  },
  developed_e_contents: {
    title: 'E Content Developed',
    keyAccessor: 'econtent_id',
    create: createEContentDeveloped
  },
  extension_outreach_activities: {
    title: 'Extension Outreach Activities',
    keyAccessor: 'activity_id',
    create: createExtensionOutreachActivity
  },
  faculty_development_programs: {
    title: 'Faculty Development Programs',
    keyAccessor: 'program_id',
    create: createFacultyDevelopmentProgram
  },
  faculty_visits: {
    title: 'Faculty Visits',
    keyAccessor: 'visit_id',
    create: createFacultyVisit
  },
  financial_support_events: {
    title: 'Financial Support Events',
    keyAccessor: 'support_id',
    create: createFinancialSupportEvent
  },
  functional_mous: {
    title: 'Functional MoUs',
    keyAccessor: 'mou_id',
    create: createFunctionalMou
  },
  it_infrastructure_stock_items: {
    title: 'IT Infrastructure Stock',
    keyAccessor: 'stock_id',
    create: createItInfrastructureStock
  },
  journal_research_papers: {
    title: 'Journal Research Papers',
    keyAccessor: 'paper_id',
    create: createJournalResearchPaper
  },
  mentor_stress_support_sessions: {
    title: 'Mentor Stress Support Sessions',
    keyAccessor: 'mentor_record_id',
    create: createMentorsStressSupport
  },
  patents: {
    title: 'Patents',
    keyAccessor: 'patent_id',
    create: createPatent
  },
  phd_defences: {
    title: 'PhD Defence',
    keyAccessor: 'defence_id',
    create: createPhdDefence
  },
  professional_affiliations: {
    title: 'Professional Affiliations',
    keyAccessor: 'affiliation_id',
    create: createProfessionalAffiliation
  },
  professional_staff_trainings: {
    title: 'Professional Staff Trainings',
    keyAccessor: 'training_id',
    create: createProfessionalTrainingStaff
  },
  research_funding_grants: {
    title: 'Research Funding Grants',
    keyAccessor: 'funding_id',
    create: createResearchFunding
  },
  research_innovation_awards: {
    title: 'Research Innovation Awards',
    keyAccessor: 'award_id',
    create: createResearchInnovationAward
  },
  revenue_from_consultancies: {
    title: 'Revenue From Consultancies',
    keyAccessor: 'consultancy_id',
    create: createRevenueFromConsultancy
  },
  revenue_from_corporate_trainings: {
    title: 'Revenue From Corporate Trainings',
    keyAccessor: 'training_id',
    create: createRevenueFromCorporateTraining
  },
  staff_trainings: {
    title: 'Staff Training',
    keyAccessor: 'training_record_id',
    create: createStaffTraining
  },
  student_centric_methods: {
    title: 'Student Centric Methods',
    keyAccessor: 'method_id',
    create: createStudentCentricMethod
  },
  teachers_using_ict: {
    title: 'Teachers Using ICT',
    keyAccessor: 'ict_id',
    create: createTeachersUsingIct
  }
};

export const getApprovalResource = (resourceId) => iqacApprovalRegistry[resourceId] || null;
