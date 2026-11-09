import React, { useState } from 'react';
import { Navbar, ActiveTab } from './components/Navbar';
import { ScannerView } from './components/ScannerView';
import { DiagnosisView } from './components/DiagnosisView';
import { HerbariumView } from './components/HerbariumView';
import { EncyclopediaView } from './components/EncyclopediaView';
import { ConsultationView } from './components/ConsultationView';
import { SAMPLE_DIAGNOSES, INITIAL_HERBARIUM } from './data/samplePlants';
import { BotanicalDiagnosis, HerbariumPlant, PathologyEntry } from './types/botanical';
import { CheckCircle2, AlertCircle, Sparkles, X } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('scanner');
  const [currentDiagnosis, setCurrentDiagnosis] = useState<BotanicalDiagnosis>(SAMPLE_DIAGNOSES[0]);
  const [plants, setPlants] = useState<HerbariumPlant[]>(INITIAL_HERBARIUM);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // When a diagnosis finishes scanning
  const handleDiagnosisComplete = (diagnosis: BotanicalDiagnosis) => {
    setCurrentDiagnosis(diagnosis);
    setActiveTab('diagnosis');
    showToast(`Diagnostic scan complete: ${diagnosis.condition} (${diagnosis.confidence}% Match)`);
  };

  // Save diagnosed plant to Herbarium
  const handleSaveToHerbarium = (diagnosis: BotanicalDiagnosis) => {
    const existingIndex = plants.findIndex((p) => p.commonName === diagnosis.commonName);

    if (existingIndex >= 0) {
      // Update existing specimen
      setPlants((prev) =>
        prev.map((p, idx) =>
          idx === existingIndex
            ? {
                ...p,
                healthStatus: diagnosis.severity,
                lastDiagnosis: diagnosis,
                vitalityScore: diagnosis.severity === 'low' ? 95 : diagnosis.severity === 'medium' ? 76 : 64,
                careLog: [
                  {
                    id: `log-${Date.now()}`,
                    date: new Date().toISOString().split('T')[0],
                    type: 'diagnose',
                    note: `Updated pathology diagnosis: ${diagnosis.condition}.`,
                  },
                  ...p.careLog,
                ],
              }
            : p
        )
      );
      showToast(`Updated existing specimen record for ${diagnosis.commonName}`);
    } else {
      // Create new herbarium accession
      const newPlant: HerbariumPlant = {
        id: `plant-${Date.now()}`,
        commonName: diagnosis.commonName,
        latinTaxonomy: diagnosis.latinTaxonomy,
        family: diagnosis.family,
        category: 'Aroids',
        location: 'Quarantine Ward',
        healthStatus: diagnosis.severity,
        vitalityScore: diagnosis.severity === 'low' ? 95 : 65,
        lastWatered: new Date().toISOString(),
        waterIntervalDays: 7,
        imageUrl: diagnosis.afflictedImageUrl,
        lastDiagnosis: diagnosis,
        careLog: [
          {
            id: `log-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            type: 'diagnose',
            note: `Initial clinical diagnosis: ${diagnosis.condition}. Accessioned to Herbarium.`,
          },
        ],
      };
      setPlants((prev) => [newPlant, ...prev]);
      showToast(`Added ${diagnosis.commonName} to Herbarium Journal`);
    }
  };

  // Water plant quick action
  const handleWaterPlant = (plantId: string) => {
    setPlants((prev) =>
      prev.map((plant) => {
        if (plant.id === plantId) {
          return {
            ...plant,
            lastWatered: new Date().toISOString(),
            careLog: [
              {
                id: `log-${Date.now()}`,
                date: new Date().toISOString().split('T')[0],
                type: 'water',
                note: 'Hydration logged. Substrate thoroughly moistened.',
              },
              ...plant.careLog,
            ],
          };
        }
        return plant;
      })
    );
    showToast('Irrigation event logged. Hydration timer reset.');
  };

  // Add plant to herbarium
  const handleAddPlant = (newPlant: HerbariumPlant) => {
    setPlants((prev) => [newPlant, ...prev]);
    showToast(`Accessioned ${newPlant.commonName} to Herbarium.`);
  };

  // Direct transfer from Encyclopedia to Scanner
  const handleSelectPathologyForScan = (pathology: PathologyEntry) => {
    const matchedDiagnosis = SAMPLE_DIAGNOSES.find((d) => d.condition.includes(pathology.name)) || {
      ...SAMPLE_DIAGNOSES[0],
      id: `diag-${pathology.id}`,
      condition: `${pathology.name} (${pathology.latinName})`,
      pathologyType: pathology.type,
      severity: pathology.severity,
      afflictedImageUrl: pathology.afflictedImageUrl,
      healthyImageUrl: pathology.healthyImageUrl,
      symptoms: pathology.visualIndicators,
    };
    setCurrentDiagnosis(matchedDiagnosis);
    setActiveTab('diagnosis');
    showToast(`Loaded reference case: ${pathology.name}`);
  };

  return (
    <div className="min-h-screen bg-[#f8faf4] text-[#191c19] flex flex-col font-sans selection:bg-[#10b981]/20 selection:text-[#00362d]">
      {/* Strict Top Bar Contract Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onNewScan={() => setActiveTab('scanner')}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-12">
        {activeTab === 'scanner' && (
          <ScannerView onDiagnosisComplete={handleDiagnosisComplete} />
        )}

        {activeTab === 'diagnosis' && (
          <DiagnosisView
            diagnosis={currentDiagnosis}
            onBackToScanner={() => setActiveTab('scanner')}
            onSaveToHerbarium={handleSaveToHerbarium}
            onOpenConsultation={(specimen) => {
              setCurrentDiagnosis(specimen);
              setActiveTab('consultation');
            }}
          />
        )}

        {activeTab === 'herbarium' && (
          <HerbariumView
            plants={plants}
            onSelectPlantDiagnosis={(diag) => {
              setCurrentDiagnosis(diag);
              setActiveTab('diagnosis');
            }}
            onScanNewSpecimen={() => setActiveTab('scanner')}
            onWaterPlant={handleWaterPlant}
            onAddPlant={handleAddPlant}
          />
        )}

        {activeTab === 'encyclopedia' && (
          <EncyclopediaView
            onSelectPathologyForScan={handleSelectPathologyForScan}
          />
        )}

        {activeTab === 'consultation' && (
          <ConsultationView currentSpecimenContext={currentDiagnosis} />
        )}
      </main>

      {/* Floating System Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-8 z-50 flex items-center gap-2.5 bg-[#00362d] text-white px-4 py-3 rounded-xl shadow-xl border border-[#10b981]/30 max-w-md animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Sparkles className="w-4 h-4 text-[#6cf8bb] shrink-0" />
          <span className="text-xs font-telemetry leading-snug flex-1">
            {toastMessage}
          </span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-white/60 hover:text-white ml-1 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Minimal Footer */}
      <footer className="hidden md:block border-t border-[#134e43]/10 bg-[#f2f4ee] py-6 text-xs text-[#707976]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-display font-semibold text-[#00362d]">Botanical Precision</span>
            <span>·</span>
            <span>Intelligent Botanical Diagnosis & Plant Vitality Platform</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-telemetry">
            <span>Epilogue Display</span>
            <span>·</span>
            <span>Plus Jakarta Sans</span>
            <span>·</span>
            <span>Space Grotesk Telemetry</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
