export const contactTypes = ["EMAIL", "PHONE"] as const;
export type ContactType = (typeof contactTypes)[number];

export const applicationStatuses = [
  "Applied",
  "Assessment",
  "Interview",
  "HRRound",
  "Offer",
  "Rejected",
  "Withdrawn",
] as const;
export type ApplicationStatus = string;

export const applicationSources = [
  "Company Website",
  "LinkedIn",
  "Referral",
  "Recruiter",
  "Job Board",
  "College",
  "Other",
] as const;
export type ApplicationSource = (typeof applicationSources)[number];

export const applicationSourceValues = [
  "CompanyWebsite",
  "LinkedIn",
  "Referral",
  "Recruiter",
  "JobBoard",
  "College",
  "Other",
] as const;
export type ApplicationSourceValue = (typeof applicationSourceValues)[number];

export const statusLabels: Record<string, string> = {
  Applied: "Applied",
  Assessment: "Assessment",
  Interview: "Interview",
  HRRound: "HR Round",
  Offer: "Offer",
  Rejected: "Rejected",
  Withdrawn: "Withdrawn",
};

export const statusColors: Record<string, string> = {
  Applied: "bg-sky-50 text-sky-700 ring-1 ring-sky-700/10",
  Assessment: "bg-amber-50 text-amber-700 ring-1 ring-amber-700/10",
  Interview: "bg-violet-50 text-violet-700 ring-1 ring-violet-700/10",
  HRRound: "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-700/10",
  Offer: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-700/10",
  Rejected: "bg-rose-50 text-rose-700 ring-1 ring-rose-700/10",
  Withdrawn: "bg-gray-50 text-gray-700 ring-1 ring-gray-700/10",
};

export type DashboardMetrics = {
  totalApplications: number;
  inProgress: number;
  offered: number;
  rejected: number;
  withdrawn: number;
  byStatus: Array<{ status: ApplicationStatus; count: number }>;
  monthlyApplications: Array<{ month: string; count: number }>;
};

export type ApplicationFilters = {
  query?: string;
  status?: ApplicationStatus | "all";
  source?: ApplicationSourceValue | "all";
  from?: string;
  to?: string;
  sort?: "newest" | "oldest" | "company" | "status" | "appliedDateNewest" | "appliedDateOldest";
  page?: number;
};

export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };