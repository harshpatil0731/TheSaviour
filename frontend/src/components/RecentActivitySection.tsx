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
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'danger':
        return <XCircle className="w-4 h-4 text-rose-400" />;
      case 'info':
      default:
        return <Info className="w-4 h-4 text-cyan-400" />;
    }
  };

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case 'success':
        return 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300';
      case 'warning':
        return 'bg-amber-950/40 border-amber-800/40 text-amber-300';
      case 'danger':
        return 'bg-rose-950/40 border-rose-800/40 text-rose-300';
      case 'info':
      default:
        return 'bg-cyan-950/40 border-cyan-800/40 text-cyan-300';
    }
  };

  return (
    <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between pb-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-950/60 border border-emerald-800/60 rounded-xl text-emerald-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-wide">
              Live Audit & Event Log
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Append-only state machine transitions with human-readable rationale
            </p>
          </div>
        </div>
        <span className="text-xs font-mono bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md border border-slate-700">
          In-Memory Log
        </span>
      </div>

      <div className="divide-y divide-slate-800/60 mt-4">
        {activities.map((act) => (
          <div key={act.id} className="py-4 first:pt-2 last:pb-2 group">
            <div className="flex items-start gap-3">
              <div className={`p-1.5 rounded-lg border mt-0.5 shrink-0 ${getSeverityBg(act.severity)}`}>
                {getSeverityIcon(act.severity)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-200">
                      {act.title}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                      {act.event_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{act.timestamp.slice(11, 19)} UTC</span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {act.description}
                </p>

                {act.entity_id && (
                  <div className="mt-2 flex items-center gap-2 text-[11px] font-mono text-slate-400">
                    <span className="text-slate-400">Entity:</span>
                    <span className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-slate-300">
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
