import React, { useState } from 'react';
import { Search, Bug, Biohazard, Sparkles, Shield, AlertTriangle, ArrowRight, ExternalLink } from 'lucide-react';
import { PATHOLOGY_DATABASE } from '../data/pathologyLibrary';
import { PathologyEntry } from '../types/botanical';

interface EncyclopediaViewProps {
  onSelectPathologyForScan?: (pathology: PathologyEntry) => void;
}

export const EncyclopediaView: React.FC<EncyclopediaViewProps> = ({ onSelectPathologyForScan }) => {
  const [search, setSearch] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedPathology, setSelectedPathology] = useState<PathologyEntry | null>(PATHOLOGY_DATABASE[0]);

  const types = ['All', 'Fungal Pathogen', 'Pest Infestation', 'Bacterial Infection', 'Nutritional Deficiency'];

  const filteredEntries = PATHOLOGY_DATABASE.filter((entry) => {
    const matchesSearch =
      entry.name.toLowerCase().includes(search.toLowerCase()) ||
      entry.latinName.toLowerCase().includes(search.toLowerCase()) ||
      entry.afflictedPlantFamilies.some((f) => f.toLowerCase().includes(search.toLowerCase()));

    const matchesType = selectedType === 'All' || entry.type === selectedType;

    return matchesSearch && matchesType;
  });

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div>
        <span className="text-xs font-telemetry tracking-wide uppercase text-[#404946] font-medium block">
          Pathogen Taxonomy & Plant Medicine
        </span>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#00362d]">
          Pathology Encyclopedia
        </h1>
        <p className="font-sans text-xs text-[#707976] mt-1 max-w-2xl">
          Comprehensive histological diagnostic compendium covering widespread indoor foliar pathogens, predatory arachnids, micro-deficiencies, and verified organic treatment protocols.
        </p>
      </div>

      {/* Search & Type Filters */}
      <div className="bg-white border border-[#134e43]/10 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#707976]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by pathogen name (e.g. Septoria, Spider Mite, Iron Chlorosis)..."
            className="w-full h-[48px] pl-11 pr-4 rounded-lg bg-[#ecefe6] border border-[#134e43]/12 text-sm font-sans text-[#191c19] placeholder-[#707976] focus:outline-none focus:border-[#10b981] transition-all"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {types.map((t) => {
            const isSelected = selectedType === t;
            return (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`h-8 px-4 rounded-full text-xs font-telemetry font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#134e43] text-white shadow-xs'
                    : 'bg-[#f4f6f0] text-[#404946] hover:bg-[#edefe9]'
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Encyclopedia Layout: Left Pathology List, Right In-Depth Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Entries List (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          {filteredEntries.map((entry) => {
            const isSelected = selectedPathology?.id === entry.id;
            return (
              <div
                key={entry.id}
                onClick={() => setSelectedPathology(entry)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white border-[#10b981] ring-1 ring-[#10b981] shadow-sm'
                    : 'bg-white/80 border-[#134e43]/10 hover:bg-white hover:border-[#134e43]/25'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-display text-base font-bold text-[#00362d]">
                      {entry.name}
                    </h3>
                    <p className="font-telemetry text-xs italic text-[#134e43]">
                      {entry.latinName}
                    </p>
                  </div>
                  <span
                    className={`inline-block text-[10px] font-telemetry font-semibold px-2 py-0.5 rounded-full ${
                      entry.severity === 'critical'
                        ? 'bg-[#f43f5e]/15 text-[#be123c]'
                        : 'bg-[#f59e0b]/15 text-[#b45309]'
                    }`}
                  >
                    {entry.severity.toUpperCase()}
                  </span>
                </div>

                <div className="mt-2 text-xs font-telemetry text-[#707976]">
                  Classification: <span className="text-[#191c19]">{entry.type}</span>
                </div>

                <p className="mt-1 text-xs text-[#404946] line-clamp-2">
                  {entry.visualIndicators[0]}
                </p>
              </div>
            );
          })}
        </div>

        {/* Right Column: In-Depth Pathology Dossier (7 Cols) */}
        {selectedPathology && (
          <div className="lg:col-span-7 bg-white border border-[#134e43]/10 rounded-2xl p-6 shadow-sm space-y-5">
            {/* Dossier Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[#134e43]/10 pb-4">
              <div>
                <span className="text-xs font-telemetry tracking-wider uppercase text-[#707976]">
                  {selectedPathology.type}
                </span>
                <h2 className="font-display text-2xl font-bold text-[#00362d]">
                  {selectedPathology.name}
                </h2>
                <p className="font-telemetry text-sm italic text-[#134e43] font-medium">
                  Taxonomy: {selectedPathology.latinName}
                </p>
              </div>

              {onSelectPathologyForScan && (
                <button
                  onClick={() => onSelectPathologyForScan(selectedPathology)}
                  className="px-4 py-2 rounded-lg bg-[#134e43] hover:bg-[#00362d] text-white text-xs font-telemetry font-semibold flex items-center gap-1.5 transition-colors self-start shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#6cf8bb]" />
                  <span>Scan in Reticle</span>
                </button>
              )}
            </div>

            {/* Microscopic and Field Reference Images */}
            <div className="grid grid-cols-2 gap-3">
              <div className="relative aspect-4/3 rounded-lg overflow-hidden bg-[#191c19] border border-[#134e43]/10">
                <img
                  src={selectedPathology.afflictedImageUrl}
                  alt="Afflicted Foliage"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-2 left-2 text-[10px] font-telemetry bg-black/70 text-[#ffb95f] px-2 py-0.5 rounded">
                  Infected Foliar Tissue
                </span>
              </div>
              <div className="relative aspect-4/3 rounded-lg overflow-hidden bg-[#191c19] border border-[#134e43]/10">
                <img
                  src={selectedPathology.healthyImageUrl}
                  alt="Healthy Control"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-2 left-2 text-[10px] font-telemetry bg-black/70 text-[#6cf8bb] px-2 py-0.5 rounded">
                  Healthy Lamina Reference
                </span>
              </div>
            </div>

            {/* Affected Host Families */}
            <div>
              <h4 className="font-telemetry text-xs uppercase text-[#404946] font-semibold mb-1">
                Common Susceptible Families
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {selectedPathology.afflictedPlantFamilies.map((fam, idx) => (
                  <span
                    key={idx}
                    className="text-xs font-telemetry bg-[#f4f6f0] border border-[#134e43]/10 text-[#00362d] px-2.5 py-1 rounded-md"
                  >
                    {fam}
                  </span>
                ))}
              </div>
            </div>

            {/* Histological Symptoms */}
            <div className="space-y-2">
              <h4 className="font-telemetry text-xs uppercase text-[#404946] font-semibold">
                Visual Diagnostic Indicators
              </h4>
              <ul className="space-y-1.5">
                {selectedPathology.visualIndicators.map((symptom, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-xs text-[#191c19] bg-[#f8faf4] p-2 rounded-lg border border-[#134e43]/8"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#f43f5e] mt-1.5 shrink-0" />
                    <span>{symptom}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Verified Organic Treatments */}
            <div className="space-y-2">
              <h4 className="font-telemetry text-xs uppercase text-[#047857] font-semibold flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                <span>Verified Organic Treatment Therapeutics</span>
              </h4>
              <div className="space-y-1.5">
                {selectedPathology.organicTreatment.map((treatment, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 text-xs text-[#191c19] bg-[#10b981]/8 p-2.5 rounded-lg border border-[#10b981]/20"
                  >
                    <span className="font-telemetry font-bold text-[#047857] shrink-0">
                      #{idx + 1}
                    </span>
                    <span className="font-sans leading-relaxed">{treatment}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
