import React from 'react';
import { TelemetryMetric } from '../types/botanical';

interface TelemetryGaugeProps {
  label: string;
  metric: TelemetryMetric;
  icon?: React.ReactNode;
}

export const TelemetryGauge: React.FC<TelemetryGaugeProps> = ({ label, metric, icon }) => {
  const { current, optimalMin, optimalMax, unit, status } = metric;

  // Calculate percentage along standard display range
  // Range: 0 to 1.5 * optimalMax
  const maxDisplay = optimalMax * 1.4;
  const clampedVal = Math.min(Math.max(current, 0), maxDisplay);
  const currentPct = (clampedVal / maxDisplay) * 100;
  const optimalMinPct = (optimalMin / maxDisplay) * 100;
  const optimalMaxPct = (optimalMax / maxDisplay) * 100;

  // Status badge styling
  const getStatusBadge = () => {
    switch (status) {
      case 'optimal':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-telemetry font-medium text-[#047857] bg-[#10b981]/10 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></span>
            Optimal Range
          </span>
        );
      case 'critical':
      case 'excessive':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-telemetry font-medium text-[#be123c] bg-[#f43f5e]/10 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f43f5e]"></span>
            {status === 'critical' ? 'Critical Excess' : 'High Alert'}
          </span>
        );
      case 'low':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-telemetry font-medium text-[#b45309] bg-[#f59e0b]/15 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]"></span>
            Sub-optimal Low
          </span>
        );
    }
  };

  return (
    <div className="bg-[#f8faf4] border border-[#134e43]/10 rounded-lg p-3.5 space-y-2.5">
      {/* Header with Title and Current Value */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && <span className="text-[#134e43]">{icon}</span>}
          <span className="font-telemetry text-xs tracking-wider uppercase text-[#404946] font-medium">
            {label}
          </span>
        </div>
        {getStatusBadge()}
      </div>

      {/* Main Metric Value */}
      <div className="flex items-baseline gap-1.5">
        <span className="font-telemetry text-2xl font-bold tracking-tight text-[#00362d] tabular-nums">
          {current.toLocaleString()}
        </span>
        <span className="font-telemetry text-xs font-medium text-[#707976]">
          {unit}
        </span>
        <span className="ml-auto text-xs font-telemetry text-[#707976]">
          Target: {optimalMin}-{optimalMax} {unit}
        </span>
      </div>

      {/* Segmented linear bar with rounded ends (4px height) displaying safe vs danger thresholds */}
      <div className="relative w-full h-2 bg-[#e1e3dd] rounded-full overflow-hidden">
        {/* Safe target zone background highlight */}
        <div
          className="absolute top-0 bottom-0 bg-[#10b981]/25 border-x border-[#10b981]/40"
          style={{
            left: `${optimalMinPct}%`,
            width: `${Math.max(optimalMaxPct - optimalMinPct, 5)}%`,
          }}
          title={`Safe zone: ${optimalMin}-${optimalMax} ${unit}`}
        />
        {/* Active current value bar */}
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            status === 'optimal'
              ? 'bg-[#10b981]'
              : status === 'critical' || status === 'excessive'
              ? 'bg-[#f43f5e]'
              : 'bg-[#f59e0b]'
          }`}
          style={{ width: `${Math.min(Math.max(currentPct, 3), 100)}%` }}
        />
      </div>

      {/* Low / Optimal / High tick marks */}
      <div className="flex justify-between text-[10px] font-telemetry text-[#707976]">
        <span>0</span>
        <span className="text-[#047857] font-medium">Safe Threshold</span>
        <span>{Math.round(maxDisplay)} {unit}</span>
      </div>
    </div>
  );
};
