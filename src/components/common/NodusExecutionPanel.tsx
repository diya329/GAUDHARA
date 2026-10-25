import React, { useState } from 'react';
import { 
  Server, 
  ExternalLink, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Code, 
  ChevronDown, 
  ChevronUp, 
  Cpu, 
  Info
} from 'lucide-react';
import type { NodusComputeResult } from '../../types';

interface NodusExecutionPanelProps {
  compute: NodusComputeResult;
  compact?: boolean;
}

export const NodusExecutionPanel: React.FC<NodusExecutionPanelProps> = ({ compute, compact = false }) => {
  const [showJson, setShowJson] = useState(false);

  const isRemoteNodus = compute.provider === 'nodus_compute';
  const isSuccess = compute.status === 'completed';
  const isFailed = compute.status === 'failed';

  return (
    <div className="border border-[#E2E8F0] rounded-lg bg-white overflow-hidden text-sm">
      {/* Header bar */}
      <div className="bg-[#F8FAF9] px-4 py-3 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-md ${isRemoteNodus ? 'bg-[#1B4332] text-white' : 'bg-[#E2E8F0] text-[#475569]'}`}>
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#0F172A]">
                {isRemoteNodus ? 'Nodus Cloud Compute' : 'GauDhara Edge Diagnostic Engine'}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                isSuccess ? 'bg-[#DCFCE7] text-[#166534]' :
                isFailed ? 'bg-[#FEE2E2] text-[#991B1B]' :
                'bg-[#FEF3C7] text-[#92400E]'
              }`}>
                {isSuccess && <CheckCircle2 className="w-3 h-3 mr-1" />}
                {isFailed && <AlertCircle className="w-3 h-3 mr-1" />}
                {compute.status.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-[#64748B]">
              {isRemoteNodus 
                ? 'Dispatched to Nodus GPU/CPU workload worker cluster'
                : 'Autonomous physiological verification engine (IDF Bull. 338 clinical protocol)'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {compute.job_url && (
            <a
              href={compute.job_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[#1B4332] hover:text-[#0F291E] font-medium"
            >
              <span>Nodus Console</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          <button
            onClick={() => setShowJson(!showJson)}
            className="inline-flex items-center gap-1 text-xs text-[#64748B] hover:text-[#0F172A] px-2 py-1 rounded border border-[#E2E8F0] bg-white"
          >
            <Code className="w-3 h-3" />
            <span>{showJson ? 'Hide Payload' : 'View Payload'}</span>
            {showJson ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Execution metadata telemetry */}
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 rounded bg-[#F8FAF9] border border-[#F1F5F9]">
            <span className="text-[#64748B] block mb-0.5">Execution / Job ID</span>
            <span className="font-mono text-[#0F172A] break-all font-medium">
              {compute.execution_id || 'N/A'}
            </span>
          </div>

          <div className="p-2.5 rounded bg-[#F8FAF9] border border-[#F1F5F9]">
            <span className="text-[#64748B] block mb-0.5">Execution Latency</span>
            <span className="font-mono text-[#0F172A] font-medium flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#64748B]" />
              {compute.latency_ms} ms
            </span>
          </div>

          <div className="p-2.5 rounded bg-[#F8FAF9] border border-[#F1F5F9]">
            <span className="text-[#64748B] block mb-0.5">Submitted Timestamp</span>
            <span className="font-mono text-[#0F172A] text-[11px]">
              {compute.submitted_at || 'Just now'}
            </span>
          </div>

          <div className="p-2.5 rounded bg-[#F8FAF9] border border-[#F1F5F9]">
            <span className="text-[#64748B] block mb-0.5">Computation Engine</span>
            <span className="text-[#0F172A] font-medium truncate block">
              {compute.computation_method || 'Multi-Parametric Physiological v2.4'}
            </span>
          </div>
        </div>

        {/* Error message banner if failure */}
        {compute.error_details && (
          <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-md text-xs text-[#991B1B]">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Compute Execution Error</strong>
                <p className="font-mono mt-0.5">{compute.error_details}</p>
              </div>
            </div>
          </div>
        )}

        {/* Anomaly Factors Breakdown */}
        {compute.anomaly_factors && compute.anomaly_factors.length > 0 && (
          <div>
            <h5 className="text-xs font-semibold uppercase tracking-wider text-[#475569] mb-2">
              Identified Mammary Anomaly Markers ({compute.anomaly_factors.length})
            </h5>
            <div className="space-y-1.5">
              {compute.anomaly_factors.map((anomaly, idx) => (
                <div 
                  key={idx} 
                  className="p-2.5 rounded border border-[#E2E8F0] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[#0F172A]">{anomaly.factor}</span>
                      <span className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded ${
                        anomaly.severity === 'high' ? 'bg-[#FEE2E2] text-[#991B1B]' :
                        anomaly.severity === 'moderate' ? 'bg-[#FEF3C7] text-[#92400E]' :
                        'bg-[#F1F5F9] text-[#475569]'
                      }`}>
                        {anomaly.severity}
                      </span>
                    </div>
                    <p className="text-xs text-[#64748B]">{anomaly.description}</p>
                  </div>
                  <div className="text-right text-xs shrink-0 font-mono">
                    <span className="font-semibold text-[#0F172A]">{anomaly.value}</span>
                    <span className="text-[#94A3B8] text-[11px] block">(ref: {anomaly.threshold})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Veterinary Action Protocol */}
        {compute.veterinary_recommendations && compute.veterinary_recommendations.length > 0 && !compact && (
          <div className="bg-[#F8FAF9] border border-[#E2E8F0] rounded-md p-3">
            <h5 className="text-xs font-semibold text-[#1B4332] mb-1.5 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              <span>Veterinary Action Recommendations</span>
            </h5>
            <ul className="list-disc list-inside text-xs text-[#334155] space-y-1">
              {compute.veterinary_recommendations.map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Raw payload viewer */}
        {showJson && (
          <div className="pt-2 border-t border-[#E2E8F0]">
            <span className="text-xs font-mono text-[#64748B] block mb-1">Raw Return Payload</span>
            <pre className="p-3 bg-[#0F172A] text-[#E2E8F0] font-mono text-xs rounded overflow-x-auto max-h-56">
              {JSON.stringify(compute, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
