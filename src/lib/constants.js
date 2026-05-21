export const UPLOAD_FOLDERS = {
  NEWS: 'NEWS',
  ADMINS: 'ADMINS',
  USERS: 'USERS',
  PRE_MARKET: 'PRE_MARKET',
  RESEARCH_BASIC: 'RESEARCH_BASIC',
  RESEARCH_EXTENDED: 'RESEARCH_EXTENDED',
};

export const AUTHENTICATED_UPLOAD_FOLDERS = new Set(['RESEARCH_EXTENDED']);

export const MAX_IMAGE_SIZE_MB = 8;
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export const MAX_PDF_SIZE_MB = 20;
export const ACCEPTED_PDF_TYPES = ['application/pdf'];

export const SUBSCRIPTION_PLANS = [
  { value: 'research_pro_monthly', label: 'Research Pro — Monthly' },
  { value: 'research_pro_yearly', label: 'Research Pro — Yearly' },
];

export const SUBSCRIPTION_STATUSES = ['active', 'expired', 'cancelled'];
