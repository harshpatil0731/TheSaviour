import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title = 'API Connection Error',
  message,
  onRetry,
}) => {
  return (
    <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-200 my-4 backdrop-blur-sm">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-rose-300">{title}</h4>
          <p className="text-xs text-rose-200/90 mt-1">{message}</p>
          <div className="mt-2 text-[11px] text-rose-400">
            Make sure the FastAPI backend is running (<code className="bg-rose-950 px-1 py-0.5 rounded text-rose-300">uvicorn app.main:app --port 8000</code>).
          </div>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-200 bg-rose-900/60 hover:bg-rose-800/80 border border-rose-700/60 rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        )}
      </div>
    </div>
  );
};
