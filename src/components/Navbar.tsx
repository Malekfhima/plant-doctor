import React from 'react';
import { Camera, Activity, BookOpen, Layers, MessageSquare, Sparkles } from 'lucide-react';

export type ActiveTab = 'scanner' | 'diagnosis' | 'herbarium' | 'encyclopedia' | 'consultation';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onNewScan: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, onNewScan }) => {
  return (
    <>
      {/* Desktop & Tablet Top Navigation Bar (Strict Top Bar Contract: 3 Zones, 1 Row) */}
      <header className="sticky top-0 z-40 bg-[#f8faf4]/90 backdrop-blur-md border-b border-[#134e43]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <button
            onClick={() => setActiveTab('scanner')}
            className="text-xl font-display font-bold tracking-tight text-[#00362d] whitespace-nowrap shrink-0 hover:opacity-90 transition-opacity cursor-pointer text-left"
          >
            Botanical Precision
          </button>

          {/* Zone 2: 4–5 single-line text navigation links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-sans font-medium text-[#404946]">
            <button
              onClick={() => setActiveTab('scanner')}
              className={`whitespace-nowrap shrink-0 transition-colors py-1 cursor-pointer border-b-2 ${
                activeTab === 'scanner'
                  ? 'text-[#00362d] font-semibold border-[#10b981]'
                  : 'border-transparent hover:text-[#00362d]'
              }`}
            >
              Field Scanner
            </button>
            <button
              onClick={() => setActiveTab('diagnosis')}
              className={`whitespace-nowrap shrink-0 transition-colors py-1 cursor-pointer border-b-2 ${
                activeTab === 'diagnosis'
                  ? 'text-[#00362d] font-semibold border-[#10b981]'
                  : 'border-transparent hover:text-[#00362d]'
              }`}
            >
              Diagnosis Detail
            </button>
            <button
              onClick={() => setActiveTab('herbarium')}
              className={`whitespace-nowrap shrink-0 transition-colors py-1 cursor-pointer border-b-2 ${
                activeTab === 'herbarium'
                  ? 'text-[#00362d] font-semibold border-[#10b981]'
                  : 'border-transparent hover:text-[#00362d]'
              }`}
            >
              Herbarium Journal
            </button>
            <button
              onClick={() => setActiveTab('encyclopedia')}
              className={`whitespace-nowrap shrink-0 transition-colors py-1 cursor-pointer border-b-2 ${
                activeTab === 'encyclopedia'
                  ? 'text-[#00362d] font-semibold border-[#10b981]'
                  : 'border-transparent hover:text-[#00362d]'
              }`}
            >
              Pathology Library
            </button>
            <button
              onClick={() => setActiveTab('consultation')}
              className={`whitespace-nowrap shrink-0 transition-colors py-1 cursor-pointer border-b-2 ${
                activeTab === 'consultation'
                  ? 'text-[#00362d] font-semibold border-[#10b981]'
                  : 'border-transparent hover:text-[#00362d]'
              }`}
            >
              Botanical Doctor
            </button>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onNewScan}
              className="h-10 px-4 rounded-full bg-[#134e43] hover:bg-[#00362d] text-white text-xs font-telemetry font-semibold flex items-center gap-1.5 transition-all shadow-xs active:scale-[0.98] cursor-pointer whitespace-nowrap shrink-0"
            >
              <Camera className="w-3.5 h-3.5 text-[#6cf8bb]" />
              <span>Diagnose Leaf</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Fixed Bottom Navigation Bar (Pattern 1: Fixed Bottom Tab Bar) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#f8faf4]/95 backdrop-blur-md border-t border-[#134e43]/12 grid grid-cols-5 items-center h-16 pb-safe"
      >
        <button
          onClick={() => setActiveTab('scanner')}
          className={`flex flex-col items-center justify-center h-full transition-colors cursor-pointer ${
            activeTab === 'scanner' ? 'text-[#134e43]' : 'text-[#707976]'
          }`}
        >
          <Camera className={`w-5 h-5 ${activeTab === 'scanner' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] font-telemetry font-medium mt-1">Scanner</span>
        </button>

        <button
          onClick={() => setActiveTab('diagnosis')}
          className={`flex flex-col items-center justify-center h-full transition-colors cursor-pointer ${
            activeTab === 'diagnosis' ? 'text-[#134e43]' : 'text-[#707976]'
          }`}
        >
          <Activity className={`w-5 h-5 ${activeTab === 'diagnosis' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] font-telemetry font-medium mt-1">Diagnosis</span>
        </button>

        <button
          onClick={() => setActiveTab('herbarium')}
          className={`flex flex-col items-center justify-center h-full transition-colors cursor-pointer ${
            activeTab === 'herbarium' ? 'text-[#134e43]' : 'text-[#707976]'
          }`}
        >
          <Layers className={`w-5 h-5 ${activeTab === 'herbarium' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] font-telemetry font-medium mt-1">Herbarium</span>
        </button>

        <button
          onClick={() => setActiveTab('encyclopedia')}
          className={`flex flex-col items-center justify-center h-full transition-colors cursor-pointer ${
            activeTab === 'encyclopedia' ? 'text-[#134e43]' : 'text-[#707976]'
          }`}
        >
          <BookOpen className={`w-5 h-5 ${activeTab === 'encyclopedia' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] font-telemetry font-medium mt-1">Pathology</span>
        </button>

        <button
          onClick={() => setActiveTab('consultation')}
          className={`flex flex-col items-center justify-center h-full transition-colors cursor-pointer ${
            activeTab === 'consultation' ? 'text-[#134e43]' : 'text-[#707976]'
          }`}
        >
          <MessageSquare className={`w-5 h-5 ${activeTab === 'consultation' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] font-telemetry font-medium mt-1">Doctor</span>
        </button>
      </nav>
    </>
  );
};
