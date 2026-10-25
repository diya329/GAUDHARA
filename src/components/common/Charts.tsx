import React from 'react';

// Pure SVG Herd Risk Distribution Bar
interface RiskDistributionProps {
  healthy: number;
  subclinical: number;
  clinical: number;
  total: number;
}

export const HerdRiskDistributionChart: React.FC<RiskDistributionProps> = ({
  healthy,
  subclinical,
  clinical,
  total,
}) => {
  if (total === 0) {
    return <div className="text-xs text-[#64748B] italic">No herd data available.</div>;
  }

  const healthyPct = Math.round((healthy / total) * 100);
  const subclinicalPct = Math.round((subclinical / total) * 100);
  const clinicalPct = Math.round((clinical / total) * 100);

  return (
    <div className="space-y-3">
      {/* Stacked bar */}
      <div className="h-4 w-full rounded-md bg-[#E2E8F0] overflow-hidden flex">
        <div 
          className="bg-[#16A34A] h-full transition-all duration-300" 
          style={{ width: `${healthyPct}%` }}
          title={`Healthy: ${healthy} (${healthyPct}%)`}
        />
        <div 
          className="bg-[#D97706] h-full transition-all duration-300" 
          style={{ width: `${subclinicalPct}%` }}
          title={`Subclinical: ${subclinical} (${subclinicalPct}%)`}
        />
        <div 
          className="bg-[#DC2626] h-full transition-all duration-300" 
          style={{ width: `${clinicalPct}%` }}
          title={`Clinical: ${clinical} (${clinicalPct}%)`}
        />
      </div>

      {/* Legend with exact numbers */}
      <div className="grid grid-cols-3 gap-2 text-xs pt-1">
        <div className="border border-[#E2E8F0] rounded p-2 bg-[#F8FAF9]">
          <div className="flex items-center gap-1.5 text-[#166534] font-medium">
            <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
            <span>Healthy</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between font-mono">
            <span className="text-sm font-bold text-[#0F172A]">{healthy}</span>
            <span className="text-[11px] text-[#64748B]">{healthyPct}%</span>
          </div>
        </div>

        <div className="border border-[#E2E8F0] rounded p-2 bg-[#F8FAF9]">
          <div className="flex items-center gap-1.5 text-[#92400E] font-medium">
            <span className="w-2 h-2 rounded-full bg-[#D97706]" />
            <span>Subclinical</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between font-mono">
            <span className="text-sm font-bold text-[#0F172A]">{subclinical}</span>
            <span className="text-[11px] text-[#64748B]">{subclinicalPct}%</span>
          </div>
        </div>

        <div className="border border-[#E2E8F0] rounded p-2 bg-[#F8FAF9]">
          <div className="flex items-center gap-1.5 text-[#991B1B] font-medium">
            <span className="w-2 h-2 rounded-full bg-[#DC2626]" />
            <span>Clinical</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between font-mono">
            <span className="text-sm font-bold text-[#0F172A]">{clinical}</span>
            <span className="text-[11px] text-[#64748B]">{clinicalPct}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Pure SVG Quarter Comparison Chart
interface QuarterComparisonChartProps {
  conductivities: { FL: number; FR: number; RL: number; RR: number };
}

export const QuarterComparisonChart: React.FC<QuarterComparisonChartProps> = ({ conductivities }) => {
  const maxVal = 8.0; // scale up to 8.0 mS/cm
  const normalMax = 5.6;

  const quarters: { key: keyof typeof conductivities; label: string; full: string }[] = [
    { key: 'FL', label: 'FL', full: 'Front-Left' },
    { key: 'FR', label: 'FR', full: 'Front-Right' },
    { key: 'RL', label: 'RL', full: 'Rear-Left' },
    { key: 'RR', label: 'RR', full: 'Rear-Right' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-[#64748B]">
        <span>Quarter Conductivity (mS/cm)</span>
        <span className="font-mono">Normal Threshold: &lt;5.6 mS/cm</span>
      </div>

      <div className="grid grid-cols-4 gap-2 pt-2">
        {quarters.map(({ key, label, full }) => {
          const val = conductivities[key] || 0;
          const heightPct = Math.min(100, Math.round((val / maxVal) * 100));
          const isWarning = val >= 5.8;

          return (
            <div key={key} className="flex flex-col items-center">
              <div className="relative w-full h-28 bg-[#F1F5F9] rounded flex flex-col justify-end p-1 border border-[#E2E8F0]">
                {/* Reference line for 5.6 mS/cm */}
                <div 
                  className="absolute left-0 right-0 border-t border-dashed border-[#DC2626]/40 z-10"
                  style={{ bottom: `${(normalMax / maxVal) * 100}%` }}
                  title="5.6 mS/cm subclinical limit"
                />

                {/* Filled bar */}
                <div
                  className={`w-full rounded-sm transition-all duration-300 ${
                    isWarning ? 'bg-[#DC2626]' : 'bg-[#16A34A]'
                  }`}
                  style={{ height: `${heightPct}%` }}
                />
              </div>
              <span className="font-bold text-xs text-[#0F172A] mt-1.5">{label}</span>
              <span className="font-mono text-xs font-semibold text-[#334155]">
                {val.toFixed(2)}
              </span>
              <span className="text-[10px] text-[#64748B]">{full}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
