import React from 'react';
import { 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  XCircle, 
  Clock 
} from 'lucide-react';
import { ActivityEvent } from '../types';

interface RecentActivitySectionProps {
  activities: ActivityEvent[];
}

export const RecentActivitySection: React.FC<RecentActivitySectionProps> = ({ activities }) => {
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-[#00B207]" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-[#FF8A00]" />;
      case 'danger':
        return <XCircle className="w-4 h-4 text-[#EA4B48]" />;
      case 'info':
      default:
        return <Info className="w-4 h-4 text-[#2B7FDE]" />;
    }
  };

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case 'success':
        return 'bg-[#EAF8E7] border-[#BDE5BA] text-[#2C742F]';
      case 'warning':
        return 'bg-[#FFF3E5] border-[#FDE3B7] text-[#D97706]';
      case 'danger':
        return 'bg-[#FDE8E8] border-[#F8B4B4] text-[#EA4B48]';
      case 'info':
      default:
        return 'bg-[#EBF4FE] border-[#C6E0FC] text-[#2B7FDE]';
    }
  };

  return (
    <section className="bg-white border border-[#E6E6E6] rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between pb-5 border-b border-[#E6E6E6]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#EAF8E7] border border-[#BDE5BA] rounded-xl text-[#00B207]">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#1A1A1A] tracking-tight">
              Live Audit & Dispatch Event Log
            </h2>
            <p className="text-xs text-[#666666] mt-0.5">
              Append-only state machine transitions with human-readable rationale
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold bg-[#EDF2EE] text-[#2C742F] px-3 py-1 rounded-full border border-[#D5E4D5]">
          Deterministic Log
        </span>
      </div>

      <div className="divide-y divide-[#F2F2F2] mt-2">
        {activities.map((act) => (
          <div key={act.id} className="py-4 first:pt-3 last:pb-1 group hover:bg-[#FAFBF9] px-2 rounded-lg transition-colors">
            <div className="flex items-start gap-3.5">
              <div className={`p-2 rounded-lg border mt-0.5 shrink-0 ${getSeverityBg(act.severity)}`}>
                {getSeverityIcon(act.severity)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#1A1A1A]">
                      {act.title}
                    </span>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#F5F5F5] text-[#666666] border border-[#E6E6E6]">
                      {act.event_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#808080]">
                    <Clock className="w-3 h-3 text-[#999999]" />
                    <span>{act.timestamp.slice(11, 19)} UTC</span>
                  </div>
                </div>

                <p className="text-xs text-[#4D4D4D] mt-1.5 leading-relaxed font-normal">
                  {act.description}
                </p>

                {act.entity_id && (
                  <div className="mt-2 flex items-center gap-2 text-[11px] font-mono">
                    <span className="text-[#808080]">Target:</span>
                    <span className="bg-[#F0F2F0] px-2 py-0.5 rounded text-[#2C742F] font-semibold">
                      {act.entity_id}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
