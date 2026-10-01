export const JOB_BOARD_BASE_PATH = '/job-board';
export const JOB_BOARD_API_BASE_PATH = '/api/job-board';

export const JOB_STATUSES = ['draft', 'open', 'closed', 'archived'];

export const JOB_WORKPLACE_TYPES = ['remote', 'hybrid', 'onsite'];

export const JOB_EMPLOYMENT_TYPES = [
  'internship',
  'co_op',
  'new_grad',
  'full_time',
  'part_time',
  'contract',
  'apprenticeship',
  'other',
];

export const CAREER_CATEGORIES = [
  'software_engineering',
  'data_science',
  'data_analytics',
  'machine_learning_ai',
  'cybersecurity',
  'information_technology',
  'engineering',
  'product_management',
  'quantitative_finance',
  'finance',
  'accounting',
  'business_analytics',
  'consulting',
  'operations',
  'management',
  'marketing',
  'sales',
  'design',
  'arts_entertainment',
  'human_resources',
  'legal_compliance',
  'public_sector',
  'education',
  'healthcare',
  'supply_chain',
  'customer_support',
  'hardware',
  'other',
];

export const CAREER_CATEGORY_GROUPS = [
  {
    label: 'Technology',
    categories: [
      'software_engineering',
      'data_science',
      'data_analytics',
      'machine_learning_ai',
      'cybersecurity',
      'information_technology',
      'engineering',
      'product_management',
      'hardware',
    ],
  },
  {
    label: 'Business & Finance',
    categories: [
      'quantitative_finance',
      'finance',
      'accounting',
      'business_analytics',
      'consulting',
      'marketing',
      'sales',
    ],
  },
  {
    label: 'Operations & Management',
    categories: [
      'operations',
      'management',
      'supply_chain',
      'customer_support',
    ],
  },
  {
    label: 'Creative & People',
    categories: [
      'design',
      'arts_entertainment',
      'human_resources',
      'legal_compliance',
    ],
  },
  {
    label: 'Public / Education / Other',
    categories: [
      'public_sector',
      'education',
      'healthcare',
      'other',
    ],
  },
];

export const APPLICATION_STATUSES = [
  'tracking',
  'applied',
  'interviewing',
  'offer',
  'rejected',
  'withdrawn',
];

export const ATS_ANALYSIS_STATUSES = ['queued', 'processing', 'completed', 'failed'];

export const SCRAPER_RUN_STATUSES = ['queued', 'running', 'completed', 'failed'];

export const NOTIFICATION_CHANNELS = ['email'];

export const DEFAULT_JOBS_PER_PAGE = 10;
export const JOBS_PER_PAGE_OPTIONS = [5, 10, 20, 50];
