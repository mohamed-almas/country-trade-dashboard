import { useState } from 'react';
import { PageShell, Card, SectionTitle } from '../components/PageShell';
import { ExternalLink, Sparkles, BookOpen, HelpCircle, Newspaper, Send } from 'lucide-react';

const NEWS_ITEMS = [
  {
    title: 'Global Trade Rebounds in 2024 Amid Supply Chain Normalization',
    date: 'March 2025',
    summary: 'After disruptions from geopolitical tensions in 2023, global merchandise trade grew by an estimated 3.5% in 2024, driven by electronics and automotive sector recovery in Asia.',
    tag: 'Global',
  },
  {
    title: 'China–EU Trade Relations Under Scrutiny as Tariff Debates Continue',
    date: 'February 2025',
    summary: 'The European Union is considering additional tariffs on Chinese electric vehicles, while negotiations on semiconductor exports remain stalled. Total EU–China bilateral trade reached $800B in 2024.',
    tag: 'Europe · Asia',
  },
  {
    title: 'India Emerges as Major Instruments Exporter in Global South',
    date: 'January 2025',
    summary: 'India\'s precision instruments exports grew 14% CAGR 2020–2024, with the US, Germany, and UAE as primary destinations. Government incentives under the PLI scheme are cited as key drivers.',
    tag: 'India',
  },
  {
    title: 'Semiconductor Shortage Eases: East Asia Trade Flows Shift',
    date: 'December 2024',
    summary: 'After years of shortage, semiconductor supply has normalized. Taiwan, South Korea, and Japan collectively saw 18% growth in chip exports. New fabs in US and EU are expected to alter trade dynamics by 2026.',
    tag: 'Electronics',
  },
  {
    title: 'African Continental Free Trade Area Boosts Intra-African Commerce',
    date: 'November 2024',
    summary: 'AfCFTA implementation has increased intra-African trade by an estimated 7% in 2024. Nigeria, South Africa, and Kenya lead as regional hubs for manufactured goods and chemicals.',
    tag: 'Africa',
  },
  {
    title: 'Middle East Diversification: Saudi Arabia and UAE Expand Non-Oil Exports',
    date: 'October 2024',
    summary: 'Driven by Vision 2030 and UAE\'s industrial strategy, the Gulf region\'s non-oil exports grew 9% in 2024. Chemicals, machinery, and re-exports through UAE ports dominate.',
    tag: 'Middle East',
  },
];

const GLOSSARY = [
  { term: 'BACI', def: 'Base pour l\'Analyse du Commerce International — A database from CEPII (France) that reconciles trade statistics from importing and exporting country reports.' },
  { term: 'HS Codes', def: 'Harmonized System codes — A standardized numerical method of classifying traded products used by customs authorities worldwide.' },
  { term: 'Volume', def: 'Measured in metric tons (mT). Represents the physical quantity of goods traded.' },
  { term: 'Value', def: 'Measured in USD thousands (USD k). Represents the monetary value of goods traded at the border.' },
  { term: '$/ton', def: 'Value per unit weight — computed as (Value × 1000) / (Volume × 1000). A high $/ton implies high-value, technology-intensive goods.' },
  { term: 'YoY', def: 'Year-over-Year growth rate: ((Current Year − Prior Year) / Prior Year) × 100.' },
  { term: 'CAGR', def: 'Compound Annual Growth Rate: ((End Value / Start Value)^(1/n) − 1) × 100, where n is the number of years.' },
];

export function ReferencesPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState('');
  const [error, setError] = useState('');

  async function getInsights() {
    if (!query.trim()) return;
    setLoading(true);
    setResponse('');
    setError('');

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': '',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system:
            'You are a senior international trade analyst. The user is viewing a trade dashboard built on BACI data (2020-2024). Answer their question with specific trade intelligence, citing trends, recent developments, and actionable insights. Be concise but data-rich.',
          messages: [{ role: 'user', content: query }],
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        setError(`API error: ${res.status} — ${text.slice(0, 200)}`);
        return;
      }

      const data = await res.json();
      const text = data.content
        ?.filter((b: any) => b.type === 'text')
        ?.map((b: any) => b.text)
        ?.join('\n') || '';
      setResponse(text);
    } catch (e: any) {
      setError(`Network error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell>
      <SectionTitle title="References & AI Insights" subtitle="Data sources, AI analysis, methodology, and glossary" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <Card className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen size={16} style={{ color: 'var(--accent)' }} />
              <h3 className="text-sm font-outfit font-semibold" style={{ color: 'var(--text-primary)' }}>Data Sources</h3>
            </div>
            <div className="space-y-4">
              <div className="border-l-2 pl-4" style={{ borderColor: 'var(--accent)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-dm-sans font-semibold" style={{ color: 'var(--text-primary)' }}>
                    BACI — Base pour l'Analyse du Commerce International
                  </h4>
                  <ExternalLink size={12} style={{ color: 'var(--text-muted)' }} />
                </div>
                <p className="text-xs font-dm-sans leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Developed by CEPII (Centre d'Études Prospectives et d'Informations Internationales), BACI provides harmonized
                  bilateral trade data for 200+ countries covering 5,000+ products classified by HS codes.
                  The database reconciles discrepancies between import and export statistics using a statistical methodology
                  that weights country reliability.
                </p>
                <div className="mt-2 flex gap-2">
                  <span className="text-xs px-2 py-0.5 font-dm-sans" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                    Coverage: 2020–2024
                  </span>
                  <span className="text-xs px-2 py-0.5 font-dm-sans" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                    Unit: USD thousands / metric tons
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={16} style={{ color: 'var(--accent)' }} />
              <h3 className="text-sm font-outfit font-semibold" style={{ color: 'var(--text-primary)' }}>AI-Powered Market Insights</h3>
              <span
                className="ml-auto text-xs px-2 py-0.5 font-dm-sans flex items-center gap-1"
                style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
              >
                <Sparkles size={10} /> Powered by Claude
              </span>
            </div>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask a trade intelligence question… e.g. 'What are the latest trends in India's instrument exports?' or 'How is the China–EU trade relationship evolving?'"
              rows={4}
              className="w-full text-sm font-dm-sans px-3 py-2 border resize-none mb-3"
              style={{
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-primary)',
                borderColor: 'var(--border)',
              }}
              onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) getInsights(); }}
            />
            <button
              onClick={getInsights}
              disabled={loading || !query.trim()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-dm-sans transition-colors"
              style={{
                backgroundColor: loading || !query.trim() ? 'var(--bg-elevated)' : 'var(--accent)',
                color: loading || !query.trim() ? 'var(--text-muted)' : 'var(--accent-text)',
              }}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--text-muted)', borderTopColor: 'transparent' }} />
                  Analyzing…
                </>
              ) : (
                <>
                  <Send size={14} /> Get Insights
                </>
              )}
            </button>

            {error && (
              <div className="mt-4 p-3 text-xs font-dm-sans border-l-2" style={{ borderColor: '#EF4444', color: '#EF4444', backgroundColor: 'var(--negative-bg)' }}>
                {error}
                <p className="mt-1 opacity-70">Note: This feature requires a valid Anthropic API key.</p>
              </div>
            )}

            {response && (
              <div className="mt-4 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={14} style={{ color: 'var(--accent)' }} />
                  <span className="text-xs font-dm-sans font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    Claude's Analysis
                  </span>
                </div>
                <div
                  className="text-sm font-dm-sans leading-relaxed whitespace-pre-wrap"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {response}
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle size={16} style={{ color: 'var(--accent)' }} />
              <h3 className="text-sm font-outfit font-semibold" style={{ color: 'var(--text-primary)' }}>Methodology</h3>
            </div>
            <div className="space-y-3">
              {[
                { label: 'YoY Growth', formula: '((Yn − Yn₋₁) / Yn₋₁) × 100' },
                { label: 'CAGR', formula: '((Vend / Vstart)^(1/n) − 1) × 100' },
                { label: 'Linear Regression', formula: 'y = mx + b (OLS fit on 5-year data)' },
                { label: 'Exp. Smoothing', formula: 'L = α·y + (1−α)·L₋₁, α = 0.4' },
                { label: 'Moving Average', formula: 'Avg(last 3 years) + trend projection' },
                { label: '$/ton', formula: '(Value × 1000) / (Volume × 1000)' },
              ].map(({ label, formula }) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <span className="text-xs font-dm-sans font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</span>
                  <code className="text-xs font-dm-mono px-2 py-1" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                    {formula}
                  </code>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-outfit font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Glossary</h3>
            <div className="space-y-3">
              {GLOSSARY.map(({ term, def }) => (
                <div key={term}>
                  <span className="text-xs font-dm-sans font-bold" style={{ color: 'var(--accent)' }}>{term}</span>
                  <p className="text-xs font-dm-sans mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{def}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Newspaper size={16} style={{ color: 'var(--accent)' }} />
          <h3 className="text-sm font-outfit font-semibold" style={{ color: 'var(--text-primary)' }}>Trade News Feed</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {NEWS_ITEMS.map((item) => (
            <div
              key={item.title}
              className="border p-4 flex flex-col gap-2 hover:border-[var(--accent)] transition-colors cursor-pointer"
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-xs px-2 py-0.5 font-dm-sans"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                >
                  {item.tag}
                </span>
                <span className="text-xs font-dm-mono" style={{ color: 'var(--text-muted)' }}>{item.date}</span>
              </div>
              <h4 className="text-sm font-dm-sans font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
                {item.title}
              </h4>
              <p className="text-xs font-dm-sans leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {item.summary}
              </p>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
