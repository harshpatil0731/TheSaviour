import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  subtext?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading live dispatch data...',
  subtext = 'Connecting to in-memory state engine',
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 bg-slate-900/50 border border-slate-800 rounded-2xl backdrop-blur-sm shadow-xl my-6">
      <div className="relative mb-4">
        <div className="w-12 h-12 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-emerald-400 animate-pulse" />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-slate-200">{message}</h3>
      <p className="text-sm text-slate-400 mt-1">{subtext}</p>

      {/* Shimmer placeholders */}
      <div className="w-full max-w-md mt-6 space-y-3">
        <div className="h-4 bg-slate-800/80 rounded animate-pulse w-3/4 mx-auto" />
        <div className="h-3 bg-slate-800/50 rounded animate-pulse w-1/2 mx-auto" />
      </div>
    </div>
  );
};
