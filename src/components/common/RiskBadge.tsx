import React from 'react';
import type { MastitisStatus } from '../../types';

interface RiskBadgeProps {
  status: MastitisStatus;
  score?: number;
  showScore?: boolean;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ status, score, showScore = false }) => {
  switch (status) {
    case 'clinical_alert':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#991B1B]">
          <span className="w-2 h-2 rounded-full bg-[#DC2626]" aria-hidden="true" />
          <span>Clinical Mastitis</span>
          {showScore && score !== undefined && (
            <span className="font-mono text-[11px] text-[#B91C1C]">({score}/100)</span>
          )}
        </span>
      );

    case 'subclinical_suspect':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#92400E]">
          <span className="w-2 h-2 rounded-full bg-[#D97706]" aria-hidden="true" />
          <span>Subclinical Suspect</span>
          {showScore && score !== undefined && (
            <span className="font-mono text-[11px] text-[#B45309]">({score}/100)</span>
          )}
        </span>
      );

    case 'in_recovery':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1E40AF]">
          <span className="w-2 h-2 rounded-full bg-[#3B82F6]" aria-hidden="true" />
          <span>In Recovery</span>
        </span>
      );

    case 'healthy':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#166534]">
          <span className="w-2 h-2 rounded-full bg-[#16A34A]" aria-hidden="true" />
          <span>Healthy Baseline</span>
          {showScore && score !== undefined && (
            <span className="font-mono text-[11px] text-[#15803D]">({score}/100)</span>
          )}
        </span>
      );
  }
};
