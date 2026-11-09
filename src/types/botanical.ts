export type SeverityLevel = 'low' | 'medium' | 'critical';

export interface TelemetryMetric {
  current: number;
  optimalMin: number;
  optimalMax: number;
  unit: string;
  status: 'low' | 'optimal' | 'critical' | 'excessive';
}

export interface SpecimenTelemetry {
  sunlight: TelemetryMetric;
  moisture: TelemetryMetric;
  temperature: TelemetryMetric;
}

export interface TreatmentStep {
  step: number;
  title: string;
  action: string;
  timeframe: string;
  completed?: boolean;
}

export interface BotanicalDiagnosis {
  id: string;
  commonName: string;
  latinTaxonomy: string;
  family: string;
  condition: string;
  severity: SeverityLevel;
  confidence: number;
  pathologyType: string;
  summary: string;
  symptoms: string[];
  afflictedImageUrl: string;
  healthyImageUrl: string;
  telemetry: SpecimenTelemetry;
  treatmentProtocol: TreatmentStep[];
  prevention: string;
  scannedAt: string;
  notes?: string;
}

export interface HerbariumPlant {
  id: string;
  commonName: string;
  latinTaxonomy: string;
  family: string;
  category: 'Aroids' | 'Ficus' | 'Succulents' | 'Ferns' | 'Carnivorous' | 'Exotics';
  location: string;
  healthStatus: SeverityLevel;
  vitalityScore: number;
  lastWatered: string;
  waterIntervalDays: number;
  imageUrl: string;
  lastDiagnosis?: BotanicalDiagnosis;
  careLog: {
    id: string;
    date: string;
    type: 'water' | 'fertilize' | 'prune' | 'diagnose' | 'mist';
    note: string;
  }[];
}

export interface PathologyEntry {
  id: string;
  name: string;
  latinName: string;
  type: 'Fungal Pathogen' | 'Pest Infestation' | 'Bacterial Infection' | 'Nutritional Deficiency' | 'Environmental Stress';
  severity: SeverityLevel;
  afflictedPlantFamilies: string[];
  visualIndicators: string[];
  causes: string[];
  organicTreatment: string[];
  preventativeMeasures: string[];
  afflictedImageUrl: string;
  healthyImageUrl: string;
}
