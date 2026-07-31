import { PageShell, Card, SectionTitle } from '../components/PageShell';

export function DollarPerTonPage() {
  return (
    <PageShell>
      <SectionTitle
        title="Dollar Per Ton Analysis"
        subtitle="Coming soon"
      />
      <Card>
        <div className="p-8 text-center" style={{ color: 'var(--text-secondary)' }}>
          <p className="text-lg font-dm-sans">This page is under development.</p>
          <p className="text-sm mt-2">Price per unit analysis will be available soon.</p>
        </div>
      </Card>
    </PageShell>
  );
}
