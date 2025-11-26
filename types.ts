export interface TargetPosition {
  id: string;
  category: string;
  name: string; // "A Position" in user chart
  responsibilities: string;
  keywords: string[];
  competitors: string[];
}

export interface CrawledJobData {
  id: string;
  targetPositionId: string; // Links back to our internal target position
  externalJobTitle: string;
  companyName: string;
  location: string; // Base
  minMonthlySalary: number;
  maxMonthlySalary: number;
  monthsPerYear: number; // e.g., 12, 13, 14
  jobResponsibilitySnippet: string;
  benefits: string[];
  source: string; // 'BOSS', 'Zhilian', etc.
  link: string; // URL to the job post
  isCompetitor: boolean;
}

export interface SalaryStats {
  min: number;
  p25: number;
  p50: number;
  p75: number;
  max: number;
  sampleSize: number;
}

export interface AggregatedResult {
  targetPositionName: string;
  monthly: SalaryStats;
  yearly: SalaryStats;
}

export enum CalculationMode {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY'
}