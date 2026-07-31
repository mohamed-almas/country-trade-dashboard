import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = 'Data unavailable — check connection', onRetry }: ErrorStateProps) {
  return (
    <div
      className="border p-8 flex flex-col items-center justify-center gap-4"
      style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--accent)' }}
    >
      <AlertCircle size={32} style={{ color: 'var(--accent)' }} />
      <div className="text-sm font-dm-sans text-center" style={{ color: 'var(--text-primary)' }}>
        {message}
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 text-sm transition-colors font-dm-sans"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}
        >
          <RefreshCw size={14} />
          Retry
        </button>
      )}
    </div>
  );
}
