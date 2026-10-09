const CATEGORY_RULES = [
  {
    category: 'software_engineering',
    terms: ['software', 'engineer', 'developer', 'frontend', 'backend', 'full-stack', 'full stack', 'react', 'node'],
  },
  {
    category: 'machine_learning_ai',
    terms: ['machine learning', 'ml engineer', 'ai engineer', 'computer vision', 'nlp'],
  },
  {
    category: 'data_science',
    terms: ['data scientist', 'research scientist', 'statistics', 'experiment', 'modeling'],
  },
  {
    category: 'data_analytics',
    terms: ['data', 'analyst', 'analytics', 'sql', 'dashboard', 'business intelligence'],
  },
  {
    category: 'product_management',
    terms: ['product manager', 'associate product', 'roadmap', 'requirements', 'product'],
  },
  {
    category: 'cybersecurity',
    terms: ['security', 'cybersecurity', 'threat', 'vulnerability', 'soc', 'cloud security'],
  },
  {
    category: 'design',
    terms: ['design', 'ux', 'ui', 'user experience', 'visual'],
  },
  {
    category: 'quantitative_finance',
    terms: ['quantitative', 'quant', 'trading', 'alpha research'],
  },
  {
    category: 'finance',
    terms: ['finance', 'financial', 'investment', 'banking'],
  },
  {
    category: 'consulting',
    terms: ['consulting', 'consultant', 'advisory'],
  },
  {
    category: 'operations',
    terms: ['operations', 'supply chain', 'program operations'],
  },
  {
    category: 'business_analytics',
    terms: ['business analyst', 'business analytics', 'strategy', 'business', 'go-to-market', 'gtm'],
  },
  {
    category: 'marketing',
    terms: ['marketing', 'growth', 'brand', 'content'],
  },
  {
    category: 'sales',
    terms: ['sales', 'account executive', 'business development'],
  },
  {
    category: 'human_resources',
    terms: ['human resources', 'hr', 'people operations', 'talent'],
  },
  {
    category: 'legal_compliance',
    terms: ['legal', 'compliance', 'paralegal', 'policy'],
  },
  {
    category: 'public_sector',
    terms: ['public sector', 'government', 'policy analyst'],
  },
  {
    category: 'education',
    terms: ['education', 'teaching', 'curriculum'],
  },
  {
    category: 'healthcare',
    terms: ['healthcare', 'clinical', 'medical', 'health'],
  },
  {
    category: 'supply_chain',
    terms: ['supply chain', 'logistics', 'procurement'],
  },
  {
    category: 'customer_support',
    terms: ['support', 'customer success', 'customer experience'],
  },
  {
    category: 'management',
    terms: ['management', 'manager', 'leadership development'],
  },
  {
    category: 'arts_entertainment',
    terms: ['art', 'creative', 'entertainment', 'media'],
  },
  {
    category: 'engineering',
    terms: ['mechanical engineer', 'electrical engineer', 'civil engineer', 'manufacturing engineer'],
  },
  {
    category: 'hardware',
    terms: ['hardware', 'embedded', 'firmware', 'semiconductor'],
  },
  {
    category: 'information_technology',
    terms: ['information technology', 'it support', 'systems administrator', 'network analyst'],
  },
];

export function categorizeJob(job) {
  const haystack = [
    job.title,
    job.company,
    job.department,
    job.description,
    ...(job.responsibilities || []),
    ...(job.qualifications || []),
  ].join(' ').toLowerCase();

  const match = CATEGORY_RULES.find((rule) => rule.terms.some((term) => haystack.includes(term)));
  return match?.category || 'other';
}

export function extractKeywords(job) {
  const text = [
    job.title,
    job.department,
    job.description,
    ...(job.responsibilities || []),
    ...(job.qualifications || []),
  ].join(' ').toLowerCase();

  const keywords = new Set();
  for (const rule of CATEGORY_RULES) {
    for (const term of rule.terms) {
      if (text.includes(term)) keywords.add(term);
    }
  }

  return [...keywords].sort();
}
