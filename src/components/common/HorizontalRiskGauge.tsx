import React from 'react';

interface HorizontalRiskGaugeProps {
  score: number; // 0 - 100
  quarterRatio?: number;
  showLabels?: boolean;
}

export const HorizontalRiskGauge: React.FC<HorizontalRiskGaugeProps> = ({
  score,
  quarterRatio,
  showLabels = true,
}) => {
  const boundedScore = Math.max(0, Math.min(100, score));

  return (
    <div className="w-full space-y-2">
      {showLabels && (
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-[#2C3E35]">Risk Index Breakdown</span>
          <div className="flex items-center gap-2">
            {quarterRatio !== undefined && (
              <span className="text-[#64748B] font-mono">
                Quarter Ratio: <strong className="text-[#1E293B]">{quarterRatio.toFixed(2)}x</strong>
              </span>
            )}
            <span className="font-mono font-semibold text-[#1E293B]">
              Score: {boundedScore}/100
            </span>
          </div>
        </div>
      )}

      {/* Segmented bar track */}
      <div className="relative h-3 w-full rounded-md bg-[#E2E8F0] overflow-hidden flex">
        {/* Healthy Zone: 0 - 25% */}
        <div className="w-1/4 h-full bg-[#16A34A]/80 border-r border-white/50" title="Healthy Baseline (0-24)" />
        {/* Subclinical Zone: 25 - 60% */}
        <div className="w-[35%] h-full bg-[#D97706]/80 border-r border-white/50" title="Subclinical Suspect (25-59)" />
        {/* Clinical Zone: 60 - 100% */}
        <div className="w-[40%] h-full bg-[#DC2626]/80" title="Clinical Alert (60-100)" />

        {/* Current score marker needle */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-black shadow-md transition-all duration-300"
          style={{ left: `calc(${boundedScore}% - 2px)` }}
        />
      </div>

      {showLabels && (
        <div className="flex justify-between text-[11px] text-[#64748B] pt-0.5">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
            <span>0-24 Normal</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
            <span>25-59 Subclinical</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
            <span>60+ Clinical Mastitis</span>
          </div>
        </div>
      )}
    </div>
  );
};
