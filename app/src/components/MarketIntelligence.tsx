import { useState } from 'react';
import { Sparkles, RefreshCw, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card } from './PageShell';

interface Citation {
  n: number;
  title: string;
  url: string;
}

interface InsightResult {
  insight: string;
  citations: Citation[];
  generated_at: string;
  cached: boolean;
  error?: string;
}

interface MarketIntelligenceProps {
  scopeKey: string;
  scopeLabel: string;
  kpis: Record<string, unknown>;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function renderInsightText(text: string, citations: Citation[]) {
  const parts = text.split(/(\[\d+\])/g);
  return parts.map((part, i) => {
    const m = part.match(/^\[(\d+)\]$/);
    if (!m) return <span key={i}>{part}</span>;
    const n = Number(m[1]);
    const cite = citations.find((c) => c.n === n);
    if (!cite) return <span key={i}>{part}</span>;
    return (
      <a
        key={i}
        href={cite.url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold no-underline"
        style={{ color: 'var(--accent)' }}
        title={cite.title}
      >
        {part}
      </a>
    );
  });
}

export function MarketIntelligence({ scopeKey, scopeLabel, kpis }: MarketIntelligenceProps) {
  const [result, setResult] = useState<InsightResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('market-intelligence', {
        body: { scopeKey, scopeLabel, kpis },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setResult(data as InsightResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate insights');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Sparkles size={16} style={{ color: 'var(--accent)' }} />
          <h3 className="font-outfit font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
            Market Intelligence
          </h3>
        </div>
        {result && !loading && (
          <button
            onClick={generate}
            className="flex items-center gap-1 text-xs font-dm-sans font-medium transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <RefreshCw size={12} />
            Regenerate
          </button>
        )}
      </div>
      <p className="text-[11px] font-dm-sans mb-4" style={{ color: 'var(--text-muted)' }}>
        {result
          ? `Generated ${timeAgo(result.generated_at)}${result.cached ? ' (cached)' : ''} · Claude + Tavily · grounded in current KPIs + recent news`
          : 'Claude + Tavily · live industry research'}
      </p>

      {!result && !loading && (
        <button
          onClick={generate}
          className="flex items-center gap-2 px-4 py-2 text-xs font-dm-sans font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)', borderRadius: 'var(--radius-sm)' }}
        >
          <Sparkles size={13} />
          Generate Insights
        </button>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-xs font-dm-sans" style={{ color: 'var(--text-secondary)' }}>
          <RefreshCw size={13} className="animate-spin" />
          Researching {scopeLabel} and drafting analysis…
        </div>
      )}

      {error && (
        <p className="text-xs font-dm-sans" style={{ color: 'var(--negative-text)' }}>
          {error}
        </p>
      )}

      {result && !loading && (
        <div>
          <p className="text-sm font-dm-sans leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-primary)' }}>
            {renderInsightText(result.insight, result.citations)}
          </p>
          {result.citations.length > 0 && (
            <div className="mt-4 pt-3 border-t flex flex-col gap-1" style={{ borderColor: 'var(--border)' }}>
              {result.citations.map((c) => (
                <a
                  key={c.n}
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[11px] font-dm-sans"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <span style={{ color: 'var(--accent)' }}>[{c.n}]</span>
                  <span className="truncate">{c.title}</span>
                  <ExternalLink size={10} />
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
