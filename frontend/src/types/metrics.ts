export interface MetricsFilters {
  startDate?: string;
  endDate?: string;
  granularity?: 'daily' | 'weekly' | 'monthly';
  modelName?: string;
}

export interface MetricsSummary {
  totalInferences: number;
  totalImages: number;
  totalDefects: number;
  avgConfidence: number;
  avgInferenceTimeMs: number;
  defectRate: number;
}

export interface TimeSeriesPoint {
  date: string;
  count: number;
}

export interface ConfidencePoint {
  date: string;
  avgConfidence: number;
}

export interface RatePoint {
  date: string;
  rate: number;
}

export interface TimeSeriesData {
  inferencesOverTime: TimeSeriesPoint[];
  defectsOverTime: TimeSeriesPoint[];
  avgConfidenceOverTime: ConfidencePoint[];
  defectRateOverTime: RatePoint[];
}

export interface DefectDistributionItem {
  type: string;
  count: number;
  percentage: number;
}

export interface ModelUsageItem {
  modelName: string;
  totalInferences: number;
  percentage: number;
  avgInferenceTimeMs: number;
  avgDetectionsPerInference: number;
}

export interface ConfidenceByDefectItem {
  type: string;
  avgConfidence: number;
  minConfidence: number;
  maxConfidence: number;
}

export interface ReportMetrics {
  totalReports: number;
  byType: Array<{ type: string; count: number }>;
}

export interface MetricsResponse {
  summary: MetricsSummary;
  timeSeries: TimeSeriesData;
  defectDistribution: DefectDistributionItem[];
  modelUsage: ModelUsageItem[];
  confidenceByDefectType: ConfidenceByDefectItem[];
  reports: ReportMetrics;
}
