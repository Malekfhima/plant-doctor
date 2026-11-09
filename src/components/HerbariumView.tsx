import React, { useState } from 'react';
import { 
  Search, Plus, Droplets, Sparkles, AlertTriangle, 
  CheckCircle2, Clock, Calendar, MapPin, ChevronRight, 
  Leaf, Filter, X, ShieldAlert 
} from 'lucide-react';
import { HerbariumPlant, BotanicalDiagnosis } from '../types/botanical';

interface HerbariumViewProps {
  plants: HerbariumPlant[];
  onSelectPlantDiagnosis: (diagnosis: BotanicalDiagnosis) => void;
  onScanNewSpecimen: () => void;
  onWaterPlant: (plantId: string) => void;
  onAddPlant: (newPlant: HerbariumPlant) => void;
}

export const HerbariumView: React.FC<HerbariumViewProps> = ({
  plants,
  onSelectPlantDiagnosis,
  onScanNewSpecimen,
  onWaterPlant,
  onAddPlant,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedHealthFilter, setSelectedHealthFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // New Specimen Form State
  const [newCommonName, setNewCommonName] = useState('');
  const [newLatinName, setNewLatinName] = useState('');
  const [newFamily, setNewFamily] = useState('Araceae');
  const [newCategory, setNewCategory] = useState<HerbariumPlant['category']>('Aroids');
  const [newLocation, setNewLocation] = useState('Living Room');
  const [newWaterInterval, setNewWaterInterval] = useState(7);
  const [newImageUrl, setNewImageUrl] = useState('');

  const categories = ['All', 'Aroids', 'Ficus', 'Succulents', 'Exotics', 'Quarantined'];

  // Filter Plants
  const filteredPlants = plants.filter((plant) => {
    const matchesSearch =
      plant.commonName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plant.latinTaxonomy.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plant.location.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'All'
        ? true
        : selectedCategory === 'Quarantined'
        ? plant.healthStatus === 'critical'
        : plant.category === selectedCategory;

    const matchesHealth =
      selectedHealthFilter === 'all'
        ? true
        : plant.healthStatus === selectedHealthFilter;

    return matchesSearch && matchesCategory && matchesHealth;
  });

  const handleCreatePlant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommonName.trim()) return;

    const created: HerbariumPlant = {
      id: `plant-${Date.now()}`,
      commonName: newCommonName,
      latinTaxonomy: newLatinName || `${newCommonName} sp.`,
      family: newFamily,
      category: newCategory,
      location: newLocation,
      healthStatus: 'low',
      vitalityScore: 92,
      lastWatered: new Date().toISOString(),
      waterIntervalDays: Number(newWaterInterval) || 7,
      imageUrl: newImageUrl || 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&w=800&q=80',
      careLog: [
        {
          id: `log-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          type: 'diagnose',
          note: 'Specimen accessioned into Herbarium catalog.',
        },
      ],
    };

    onAddPlant(created);
    setIsAddModalOpen(false);
    // Reset Form
    setNewCommonName('');
    setNewLatinName('');
    setNewImageUrl('');
  };

  // Compute days until next water
  const getWaterSchedule = (plant: HerbariumPlant) => {
    const lastDate = new Date(plant.lastWatered).getTime();
    const now = Date.now();
    const daysSince = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
    const daysRemaining = plant.waterIntervalDays - daysSince;

    if (daysRemaining < 0) {
      return { text: `Overdue by ${Math.abs(daysRemaining)}d`, isUrgent: true };
    } else if (daysRemaining === 0) {
      return { text: 'Water today', isUrgent: true };
    } else {
      return { text: `Water in ${daysRemaining}d`, isUrgent: false };
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-telemetry tracking-wide uppercase text-[#404946] font-medium block">
            Botanical Inventory & Vitality Journal
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#00362d]">
            Specimen Herbarium
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onScanNewSpecimen}
            className="h-[48px] px-4 rounded-lg bg-[#134e43] hover:bg-[#00362d] text-white font-telemetry font-semibold text-xs flex items-center gap-2 transition-colors shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-[#6cf8bb]" />
            <span>Field Reticle Scan</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="h-[48px] px-4 rounded-lg border border-[#134e43]/20 bg-white hover:bg-[#f2f4ee] text-[#134e43] font-telemetry font-semibold text-xs flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Specimen</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-[#134e43]/10 rounded-2xl p-4 shadow-sm space-y-4">
        {/* Search input: 48px height, 8px radius, light cream fill (#ecefe6) */}
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#707976]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search specimen by common name, Latin taxonomy, or greenhouse location..."
            className="w-full h-[48px] pl-11 pr-4 rounded-lg bg-[#ecefe6] border border-[#134e43]/12 text-sm font-sans text-[#191c19] placeholder-[#707976] focus:outline-none focus:border-[#10b981] focus:ring-2 focus:ring-[#10b981]/20 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#707976] hover:text-[#191c19]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Selection Pills: Horizontal scrollable row, unselected in soft limestone, selected in filled forest green with white text */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-telemetry uppercase text-[#707976] mr-1 shrink-0">
            Category:
          </span>
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`h-8 px-4 rounded-full text-xs font-telemetry font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#134e43] text-white shadow-xs'
                    : 'bg-[#f4f6f0] text-[#404946] hover:bg-[#edefe9]'
                }`}
              >
                {cat}
              </button>
            );
          })}

          <div className="h-4 w-px bg-[#134e43]/15 mx-2 shrink-0" />

          {/* Severity Quick Filters */}
          <button
            onClick={() => setSelectedHealthFilter(selectedHealthFilter === 'critical' ? 'all' : 'critical')}
            className={`h-8 px-3 rounded-full text-xs font-telemetry font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors ${
              selectedHealthFilter === 'critical'
                ? 'bg-[#f43f5e] text-white'
                : 'bg-[#f43f5e]/10 text-[#be123c] hover:bg-[#f43f5e]/20'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Pathology Alert</span>
          </button>
        </div>
      </div>

      {/* Specimen Cards Grid */}
      {filteredPlants.length === 0 ? (
        <div className="bg-white border border-[#134e43]/10 rounded-2xl p-12 text-center space-y-3">
          <Leaf className="w-10 h-10 text-[#707976] mx-auto opacity-40" />
          <h3 className="font-display text-lg font-semibold text-[#00362d]">
            No matching specimens found
          </h3>
          <p className="font-sans text-xs text-[#707976] max-w-sm mx-auto">
            Try adjusting your search criteria or scan a new botanical sample into your Herbarium.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPlants.map((plant) => {
            const waterSchedule = getWaterSchedule(plant);
            return (
              <div
                key={plant.id}
                className="bg-white border border-[#134e43]/10 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Image Frame with Severity Chip Overlay */}
                  <div className="relative aspect-16/10 w-full overflow-hidden bg-[#191c19]">
                    <img
                      src={plant.imageUrl}
                      alt={plant.commonName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    />

                    {/* Right-aligned severity indicator badge */}
                    <div className="absolute top-2.5 right-2.5">
                      {plant.healthStatus === 'low' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-telemetry font-semibold bg-[#10b981]/90 text-white backdrop-blur-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                          Optimal
                        </span>
                      )}
                      {plant.healthStatus === 'medium' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-telemetry font-semibold bg-[#f59e0b]/90 text-black backdrop-blur-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-black"></span>
                          Needs Attention
                        </span>
                      )}
                      {plant.healthStatus === 'critical' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-telemetry font-semibold bg-[#f43f5e]/90 text-white backdrop-blur-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                          Critical Pathogen
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-2.5 left-2.5">
                      <span className="text-[10px] font-telemetry font-medium bg-black/60 text-white px-2 py-0.5 rounded-md backdrop-blur-xs flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#6cf8bb]" />
                        {plant.location}
                      </span>
                    </div>
                  </div>

                  {/* Card Body: Structure: 12px internal padding, 8px radius */}
                  <div className="p-4 space-y-3">
                    {/* Header: Epilogue headline for common plant name, Space Grotesk for Latin */}
                    <div>
                      <h3 className="font-display text-lg font-bold text-[#00362d] tracking-tight">
                        {plant.commonName}
                      </h3>
                      <p className="font-telemetry text-xs italic text-[#134e43] font-medium">
                        {plant.latinTaxonomy}
                      </p>
                    </div>

                    {/* Vitality Metric Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-telemetry">
                        <span className="text-[#404946]">Vitality Index</span>
                        <span className="font-bold text-[#00362d] tabular-nums">
                          {plant.vitalityScore}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-[#e1e3dd] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            plant.vitalityScore > 85
                              ? 'bg-[#10b981]'
                              : plant.vitalityScore > 70
                              ? 'bg-[#f59e0b]'
                              : 'bg-[#f43f5e]'
                          }`}
                          style={{ width: `${plant.vitalityScore}%` }}
                        />
                      </div>
                    </div>

                    {/* Irrigation countdown */}
                    <div className="flex items-center justify-between text-xs font-telemetry bg-[#f8faf4] p-2.5 rounded-lg border border-[#134e43]/8">
                      <div className="flex items-center gap-1.5 text-[#404946]">
                        <Droplets className="w-3.5 h-3.5 text-[#10b981]" />
                        <span>Hydration:</span>
                      </div>
                      <span
                        className={`font-semibold ${
                          waterSchedule.isUrgent ? 'text-[#be123c]' : 'text-[#047857]'
                        }`}
                      >
                        {waterSchedule.text}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="px-4 pb-4 pt-1 flex items-center gap-2 border-t border-[#134e43]/8">
                  <button
                    onClick={() => onWaterPlant(plant.id)}
                    className="flex-1 h-9 rounded-lg border border-[#134e43]/20 hover:border-[#134e43] text-[#134e43] font-telemetry text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors bg-[#ecefe6]/40 hover:bg-[#ecefe6]"
                    title="Log that plant was watered today"
                  >
                    <Droplets className="w-3.5 h-3.5" />
                    <span>Watered</span>
                  </button>

                  {plant.lastDiagnosis ? (
                    <button
                      onClick={() => onSelectPlantDiagnosis(plant.lastDiagnosis!)}
                      className="flex-1 h-9 rounded-lg bg-[#134e43] hover:bg-[#00362d] text-white font-telemetry text-xs font-semibold flex items-center justify-center gap-1 transition-colors shadow-2xs"
                    >
                      <span>Inspection</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={onScanNewSpecimen}
                      className="flex-1 h-9 rounded-lg bg-[#134e43] hover:bg-[#00362d] text-white font-telemetry text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                    >
                      <span>Scan Leaf</span>
                      <Sparkles className="w-3.5 h-3.5 text-[#6cf8bb]" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Specimen Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#134e43]/20 space-y-4">
            <div className="flex items-center justify-between border-b border-[#134e43]/10 pb-3">
              <h3 className="font-display text-lg font-bold text-[#00362d]">
                Accession New Specimen
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#707976] hover:text-[#191c19]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePlant} className="space-y-3.5">
              <div>
                <label className="block text-xs font-telemetry uppercase text-[#404946] mb-1">
                  Common Name *
                </label>
                <input
                  type="text"
                  required
                  value={newCommonName}
                  onChange={(e) => setNewCommonName(e.target.value)}
                  placeholder="e.g. Alocasia Polly"
                  className="w-full h-10 px-3 rounded-lg bg-[#ecefe6] border border-[#134e43]/12 text-sm focus:outline-none focus:border-[#10b981]"
                />
              </div>

              <div>
                <label className="block text-xs font-telemetry uppercase text-[#404946] mb-1">
                  Binomial Latin Taxonomy
                </label>
                <input
                  type="text"
                  value={newLatinName}
                  onChange={(e) => setNewLatinName(e.target.value)}
                  placeholder="e.g. Alocasia x amazonica"
                  className="w-full h-10 px-3 rounded-lg bg-[#ecefe6] border border-[#134e43]/12 text-sm focus:outline-none focus:border-[#10b981]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-telemetry uppercase text-[#404946] mb-1">
                    Botanical Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full h-10 px-2 rounded-lg bg-[#ecefe6] border border-[#134e43]/12 text-xs focus:outline-none focus:border-[#10b981]"
                  >
                    <option value="Aroids">Aroids</option>
                    <option value="Ficus">Ficus</option>
                    <option value="Succulents">Succulents</option>
                    <option value="Exotics">Exotics</option>
                    <option value="Ferns">Ferns</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-telemetry uppercase text-[#404946] mb-1">
                    Water Cadence (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={newWaterInterval}
                    onChange={(e) => setNewWaterInterval(parseInt(e.target.value, 10))}
                    className="w-full h-10 px-3 rounded-lg bg-[#ecefe6] border border-[#134e43]/12 text-sm focus:outline-none focus:border-[#10b981]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-telemetry uppercase text-[#404946] mb-1">
                  Greenhouse / Room Location
                </label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="e.g. South Balcony Shelf"
                  className="w-full h-10 px-3 rounded-lg bg-[#ecefe6] border border-[#134e43]/12 text-sm focus:outline-none focus:border-[#10b981]"
                />
              </div>

              <div>
                <label className="block text-xs font-telemetry uppercase text-[#404946] mb-1">
                  Specimen Photo URL (Optional)
                </label>
                <input
                  type="url"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full h-10 px-3 rounded-lg bg-[#ecefe6] border border-[#134e43]/12 text-sm focus:outline-none focus:border-[#10b981]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-telemetry text-[#404946] hover:bg-[#edefe9]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#134e43] text-white text-xs font-telemetry font-semibold hover:bg-[#00362d]"
                >
                  Save Specimen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
