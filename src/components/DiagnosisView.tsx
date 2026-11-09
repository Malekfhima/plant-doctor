import React, { useState } from 'react';
import { 
  ArrowLeft, CheckCircle2, AlertTriangle, AlertCircle, Sparkles, 
  Sun, Droplets, Thermometer, ShieldCheck, BookmarkPlus, 
  Share2, RotateCcw, Clock, Microscope, ChevronRight, Check
} from 'lucide-react';
import { BotanicalDiagnosis, TreatmentStep } from '../types/botanical';
import { PhotographicSplit } from './PhotographicSplit';
import { TelemetryGauge } from './TelemetryGauge';

interface DiagnosisViewProps {
  diagnosis: BotanicalDiagnosis;
  onBackToScanner: () => void;
  onSaveToHerbarium?: (diagnosis: BotanicalDiagnosis) => void;
  onOpenConsultation?: (specimen: BotanicalDiagnosis) => void;
}

export const DiagnosisView: React.FC<DiagnosisViewProps> = ({
  diagnosis,
  onBackToScanner,
  onSaveToHerbarium,
  onOpenConsultation,
}) => {
  const [steps, setSteps] = useState<TreatmentStep[]>(diagnosis.treatmentProtocol);
  const [saved, setSaved] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const toggleStep = (stepNumber: number) => {
    setSteps((prev) =>
      prev.map((s) => (s.step === stepNumber ? { ...s, completed: !s.completed } : s))
    );
  };

  const completedCount = steps.filter((s) => s.completed).length;
  const progressPct = Math.round((completedCount / steps.length) * 100);

  const handleSave = () => {
    if (onSaveToHerbarium) {
      onSaveToHerbarium({ ...diagnosis, treatmentProtocol: steps });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  const handleShare = () => {
    const text = `Botanical Precision Diagnosis: ${diagnosis.commonName} (${diagnosis.latinTaxonomy}) - ${diagnosis.condition} [${diagnosis.severity.toUpperCase()}]. Confidence: ${diagnosis.confidence}%`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Severity Chip Styling
  const renderSeverityChip = () => {
    switch (diagnosis.severity) {
      case 'low':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-telemetry font-semibold bg-[#10b981]/12 text-[#047857] border border-[#10b981]/20">
            <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
            Low Severity · Healthy / Resolved
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-telemetry font-semibold bg-[#f59e0b]/14 text-[#b45309] border border-[#f59e0b]/25">
            <span className="w-2 h-2 rounded-full bg-[#f59e0b]"></span>
            Medium Severity · Action Needed
          </span>
        );
      case 'critical':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-telemetry font-semibold bg-[#f43f5e]/14 text-[#be123c] border border-[#f43f5e]/25">
            <span className="w-2 h-2 rounded-full bg-[#f43f5e]"></span>
            Critical Severity · Active Pathogen
          </span>
        );
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBackToScanner}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-telemetry font-semibold text-[#134e43] bg-white border border-[#134e43]/15 rounded-lg hover:bg-[#ecefe6] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Field Scanner</span>
        </button>

        <div className="flex items-center gap-2">
          {onOpenConsultation && (
            <button
              onClick={() => onOpenConsultation(diagnosis)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-telemetry font-medium text-[#134e43] bg-[#ecefe6] hover:bg-[#edefe9] rounded-lg transition-colors border border-[#134e43]/10"
            >
              <Microscope className="w-3.5 h-3.5" />
              <span>Ask Botanical Doctor</span>
            </button>
          )}

          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-telemetry font-medium text-[#404946] bg-white border border-[#134e43]/15 rounded-lg hover:bg-[#f2f4ee] transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{copied ? 'Copied Link' : 'Export'}</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saved}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-telemetry font-semibold text-white bg-[#134e43] hover:bg-[#00362d] rounded-lg transition-colors shadow-xs"
          >
            {saved ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Saved to Herbarium</span>
              </>
            ) : (
              <>
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>Save to Collection</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Specimen Diagnostic Header Card */}
      <div className="bg-white border border-[#134e43]/10 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-[#134e43]/10 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-telemetry text-[#707976]">
              <span>Taxonomic Family: {diagnosis.family}</span>
              <span>·</span>
              <span>Optical Confidence: {diagnosis.confidence}%</span>
              <span>·</span>
              <span>Scanned {new Date(diagnosis.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            {/* Epilogue headline for common plant name */}
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#00362d] tracking-tight">
              {diagnosis.commonName}
            </h1>
            {/* Space Grotesk label for Latin genus */}
            <p className="font-telemetry text-sm italic text-[#134e43] font-medium">
              {diagnosis.latinTaxonomy}
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
            {renderSeverityChip()}
            <span className="font-telemetry text-xs text-[#707976]">
              Condition: <strong className="text-[#00362d]">{diagnosis.condition}</strong>
            </span>
          </div>
        </div>

        {/* Clinical Summary & Pathogen Classification */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          <div className="md:col-span-3 space-y-2">
            <h4 className="font-telemetry text-xs tracking-wider uppercase text-[#404946] font-semibold">
              Clinical Pathological Assessment
            </h4>
            <p className="font-sans text-sm text-[#191c19] leading-relaxed">
              {diagnosis.summary}
            </p>
          </div>

          <div className="bg-[#f8faf4] border border-[#134e43]/10 rounded-xl p-3 text-center">
            <span className="block font-telemetry text-[11px] uppercase text-[#707976]">
              Pathology Type
            </span>
            <span className="font-display text-base font-bold text-[#134e43] mt-0.5 block">
              {diagnosis.pathologyType}
            </span>
            <span className="inline-block mt-1 text-[11px] font-telemetry text-[#047857] font-medium">
              Verified Foliar Signature
            </span>
          </div>
        </div>
      </div>

      {/* Dual Column Layout: Left Comparative Split, Right Symptoms & Treatment */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Photographic Split & Telemetry (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Photographic Split Component */}
          <PhotographicSplit
            afflictedUrl={diagnosis.afflictedImageUrl}
            healthyUrl={diagnosis.healthyImageUrl}
            afflictedLabel={`Afflicted ${diagnosis.commonName}`}
            healthyLabel={`Healthy Reference (${diagnosis.latinTaxonomy})`}
            conditionName={diagnosis.condition}
          />

          {/* Telemetry and Vital Environmental Readouts */}
          <div className="bg-white border border-[#134e43]/10 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-telemetry tracking-wide uppercase text-[#404946] font-medium block">
                  Sensor Telemetry
                </span>
                <h3 className="font-display text-lg font-semibold text-[#00362d]">
                  Environmental Vitality Thresholds
                </h3>
              </div>
              <span className="text-xs font-telemetry text-[#707976]">
                Real-Time Biosphere Calibration
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <TelemetryGauge
                label="Solar Photon Flux"
                metric={diagnosis.telemetry.sunlight}
                icon={<Sun className="w-4 h-4" />}
              />
              <TelemetryGauge
                label="Substrate Moisture"
                metric={diagnosis.telemetry.moisture}
                icon={<Droplets className="w-4 h-4" />}
              />
              <TelemetryGauge
                label="Ambient Temperature"
                metric={diagnosis.telemetry.temperature}
                icon={<Thermometer className="w-4 h-4" />}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Pathology Symptoms & 3-Step Treatment Protocol (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Observable Botanical Symptoms Card */}
          <div className="bg-white border border-[#134e43]/10 rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="font-display text-base font-semibold text-[#00362d] flex items-center gap-2">
              <Microscope className="w-4 h-4 text-[#134e43]" />
              <span>Observable Histological Symptoms</span>
            </h3>

            <ul className="space-y-2">
              {diagnosis.symptoms.map((symptom, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-xs text-[#191c19] bg-[#f8faf4] p-2.5 rounded-lg border border-[#134e43]/8"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f43f5e] mt-1.5 shrink-0" />
                  <span className="font-sans leading-relaxed">{symptom}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 3-Step Curated Clinical Treatment Protocol */}
          <div className="bg-white border border-[#134e43]/10 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-telemetry tracking-wide uppercase text-[#404946] font-medium block">
                  Actionable Therapy
                </span>
                <h3 className="font-display text-lg font-semibold text-[#00362d]">
                  Clinical Treatment Protocol
                </h3>
              </div>
              <span className="text-xs font-telemetry font-bold text-[#134e43] bg-[#10b981]/15 px-2.5 py-1 rounded-full">
                {completedCount}/{steps.length} Steps
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-[#edefe9] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#10b981] transition-all duration-500 rounded-full"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            {/* Treatment Steps List */}
            <div className="space-y-3">
              {steps.map((st) => (
                <div
                  key={st.step}
                  onClick={() => toggleStep(st.step)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    st.completed
                      ? 'bg-[#10b981]/8 border-[#10b981]/30 text-[#00362d]'
                      : 'bg-[#f8faf4] border-[#134e43]/10 hover:border-[#134e43]/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-telemetry font-bold shrink-0 transition-colors ${
                          st.completed
                            ? 'bg-[#10b981] text-white'
                            : 'bg-[#edefe9] text-[#134e43]'
                        }`}
                      >
                        {st.completed ? <Check className="w-3.5 h-3.5" /> : st.step}
                      </div>
                      <h4
                        className={`font-display text-sm font-semibold ${
                          st.completed ? 'line-through opacity-75' : 'text-[#00362d]'
                        }`}
                      >
                        {st.title}
                      </h4>
                    </div>
                    <span className="font-telemetry text-[11px] text-[#707976] shrink-0 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {st.timeframe}
                    </span>
                  </div>

                  <p
                    className={`mt-2 ml-8 text-xs leading-relaxed ${
                      st.completed ? 'text-[#404946] line-through opacity-75' : 'text-[#191c19]'
                    }`}
                  >
                    {st.action}
                  </p>
                </div>
              ))}
            </div>

            {/* Preventative Maintenance Callout */}
            <div className="p-3.5 bg-[#f2f4ee] rounded-xl border border-[#134e43]/10 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[#134e43] shrink-0 mt-0.5" />
              <div>
                <h5 className="font-display text-xs font-bold text-[#00362d]">
                  Long-Term Horticultural Prophylaxis
                </h5>
                <p className="font-sans text-xs text-[#404946] mt-0.5 leading-relaxed">
                  {diagnosis.prevention}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
