import React, { useState, useRef, useCallback } from 'react';
import { Eye, SplitSquareVertical, Columns2, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';

interface PhotographicSplitProps {
  afflictedUrl: string;
  healthyUrl: string;
  afflictedLabel?: string;
  healthyLabel?: string;
  conditionName?: string;
}

export const PhotographicSplit: React.FC<PhotographicSplitProps> = ({
  afflictedUrl,
  healthyUrl,
  afflictedLabel = 'Afflicted Specimen',
  healthyLabel = 'Cultivar Reference (Healthy)',
  conditionName = 'Pathological Tissue'
}) => {
  const [sliderPosition, setSliderPosition] = useState<number>(50); // percentage 0-100
  const [viewMode, setViewMode] = useState<'split' | 'side-by-side'>('split');
  const [showAnnotations, setShowAnnotations] = useState<boolean>(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef<boolean>(false);

  const handlePointerDown = () => {
    isDragging.current = true;
  };

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(5, Math.min(95, (x / rect.width) * 100));
    setSliderPosition(pct);
  }, []);

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  return (
    <div className="bg-[#ffffff] border border-[#134e43]/10 rounded-xl p-4 shadow-sm">
      {/* Header controls bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <span className="text-xs font-telemetry tracking-wide uppercase text-[#404946] font-medium block">
            Comparative Histological Analysis
          </span>
          <h4 className="font-display text-base font-semibold text-[#00362d]">
            Afflicted vs. Reference Specimen
          </h4>
        </div>

        {/* View Toggle Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-[#edefe9] rounded-lg">
          <button
            onClick={() => setViewMode('split')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-telemetry font-medium rounded-md transition-all ${
              viewMode === 'split'
                ? 'bg-[#ffffff] text-[#00362d] shadow-xs'
                : 'text-[#404946] hover:text-[#00362d]'
            }`}
          >
            <SplitSquareVertical className="w-3.5 h-3.5" />
            <span>Interactive Split</span>
          </button>
          <button
            onClick={() => setViewMode('side-by-side')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-telemetry font-medium rounded-md transition-all ${
              viewMode === 'side-by-side'
                ? 'bg-[#ffffff] text-[#00362d] shadow-xs'
                : 'text-[#404946] hover:text-[#00362d]'
            }`}
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span>Dual View</span>
          </button>
          <button
            onClick={() => setShowAnnotations(!showAnnotations)}
            className={`flex items-center gap-1 px-2 py-1 text-xs font-telemetry font-medium rounded-md transition-all ${
              showAnnotations
                ? 'bg-[#134e43] text-white'
                : 'text-[#404946] hover:text-[#00362d]'
            }`}
            title="Toggle diagnostic callout pins"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Inspect Pins</span>
          </button>
        </div>
      </div>

      {/* Split Interactive Slider Container */}
      {viewMode === 'split' ? (
        <div
          ref={containerRef}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="relative aspect-square sm:aspect-4/3 w-full rounded-lg overflow-hidden select-none cursor-ew-resize border border-[#134e43]/15 touch-none bg-[#191c19]"
        >
          {/* Healthy Reference Image (Underneath) */}
          <img
            src={healthyUrl}
            alt={healthyLabel}
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />

          {/* Afflicted Specimen Image (Clipped by slider position) */}
          <div
            className="absolute inset-0 overflow-hidden pointer-events-none"
            style={{ width: `${sliderPosition}%` }}
          >
            <img
              src={afflictedUrl}
              alt={afflictedLabel}
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover max-w-none"
              style={{
                width: containerRef.current ? `${containerRef.current.clientWidth}px` : '100%',
                height: '100%',
              }}
            />
          </div>

          {/* Diagnostic Inspection Callout Pin on Afflicted Side */}
          {showAnnotations && sliderPosition > 35 && (
            <div
              className="absolute top-1/3 left-1/4 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-opacity duration-300 z-10"
            >
              <div className="flex items-center gap-1.5 bg-[#f43f5e] text-white text-[11px] font-telemetry font-semibold px-2 py-1 rounded shadow-md backdrop-blur-xs">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>Primary Fungal Lesion (Necrosis)</span>
              </div>
              <div className="w-2.5 h-2.5 bg-[#f43f5e] rotate-45 mx-auto -mt-1" />
            </div>
          )}

          {/* Diagnostic Inspection Pin on Healthy Side */}
          {showAnnotations && sliderPosition < 65 && (
            <div
              className="absolute top-1/2 right-1/4 translate-x-1/2 -translate-y-1/2 pointer-events-none transition-opacity duration-300 z-10"
            >
              <div className="flex items-center gap-1.5 bg-[#047857] text-white text-[11px] font-telemetry font-semibold px-2 py-1 rounded shadow-md backdrop-blur-xs">
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                <span>Intact Chlorophyll Lamina</span>
              </div>
              <div className="w-2.5 h-2.5 bg-[#047857] rotate-45 mx-auto -mt-1" />
            </div>
          )}

          {/* Divider Handle Bar */}
          <div
            onPointerDown={handlePointerDown}
            className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-20 flex items-center justify-center shadow-lg"
            style={{ left: `${sliderPosition}%` }}
          >
            <div className="w-7 h-7 rounded-full bg-white border-2 border-[#134e43] shadow-md flex items-center justify-center text-[#134e43] font-telemetry text-[10px] font-bold">
              ↔
            </div>
          </div>

          {/* Badges on Bottom Corners */}
          <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
            <span className="inline-flex items-center gap-1 text-[11px] font-telemetry font-semibold bg-[#191c19]/80 text-[#ffb95f] px-2.5 py-1 rounded-md backdrop-blur-md border border-white/10">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f43f5e]"></span>
              {afflictedLabel}
            </span>
          </div>
          <div className="absolute bottom-3 right-3 z-10 pointer-events-none">
            <span className="inline-flex items-center gap-1 text-[11px] font-telemetry font-semibold bg-[#191c19]/80 text-[#6cf8bb] px-2.5 py-1 rounded-md backdrop-blur-md border border-white/10">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></span>
              {healthyLabel}
            </span>
          </div>
        </div>
      ) : (
        /* Side by Side Dual View */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Afflicted Frame */}
          <div className="relative aspect-square rounded-lg overflow-hidden border border-[#f43f5e]/30 bg-[#191c19]">
            <img
              src={afflictedUrl}
              alt={afflictedLabel}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 left-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-telemetry font-semibold bg-[#f43f5e] text-white px-2 py-0.5 rounded shadow-sm">
                Afflicted Specimen
              </span>
            </div>
            <div className="absolute bottom-2 left-2 right-2 bg-[#191c19]/85 backdrop-blur-md p-2 rounded text-[11px] font-telemetry text-[#ffdad6]">
              {conditionName}
            </div>
          </div>

          {/* Healthy Frame */}
          <div className="relative aspect-square rounded-lg overflow-hidden border border-[#10b981]/30 bg-[#191c19]">
            <img
              src={healthyUrl}
              alt={healthyLabel}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 left-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-telemetry font-semibold bg-[#047857] text-white px-2 py-0.5 rounded shadow-sm">
                Healthy Control
              </span>
            </div>
            <div className="absolute bottom-2 left-2 right-2 bg-[#191c19]/85 backdrop-blur-md p-2 rounded text-[11px] font-telemetry text-[#87beb0]">
              Optimal Lamina & Cellular Turgor
            </div>
          </div>
        </div>
      )}

      {/* Sub-bar Guidance */}
      <p className="mt-2 text-center text-xs font-telemetry text-[#707976]">
        {viewMode === 'split' ? 'Drag divider left / right to compare cellular tissue degradation' : 'Side-by-side comparative specimen pathology'}
      </p>
    </div>
  );
};
