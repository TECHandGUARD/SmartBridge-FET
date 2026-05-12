export default function DefinitionTable({ items, columns }) {
  return (
    <div className="mb-6 border border-border rounded-lg overflow-hidden">
      <div className="grid gap-0 bg-card">
        {items.map((item, idx) => (
          <div
            key={idx}
            className={`grid gap-4 p-4 ${columns === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} border-b border-border last:border-b-0 ${
              idx % 2 === 0 ? 'bg-card' : 'bg-muted/30'
            }`}
          >
            {Object.values(item).map((value, i) => (
              <div key={i} className="text-sm">
                {typeof value === 'object' ? value : <span className="text-foreground">{value}</span>}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}