export default function WorkspaceHeader({ title, description, actions = null, children = null }) {
  return (
    <header data-tour="dashboard-heading" className="mb-6 rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card px-5 py-5 sm:px-7 sm:py-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <h1 className="break-words font-playfair text-2xl font-bold leading-tight text-foreground sm:text-3xl">{title}</h1>
          <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="mt-4 border-t border-border pt-3">{children}</div>}
    </header>
  );
}
