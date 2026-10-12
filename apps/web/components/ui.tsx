import Link from 'next/link';

/* Small presentational primitives used by the redesigned pages.
   They rely on the semantic theme tokens so they work in light + dark. */

export function Card({
  children,
  className = '',
  hover = false,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-border bg-card shadow-card ${
        hover ? 'transition hover:border-primary/40 hover:shadow-glow' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  tone = 'primary',
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  tone?: 'primary' | 'success' | 'warning' | 'muted';
}) {
  const tones: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-amber-500/10 text-amber-500',
    muted: 'bg-muted text-muted-foreground',
  };
  return (
    <Card className="p-5">
      <div className="flex items-center gap-4">
        {icon && (
          <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${tones[tone]}`}>
            {icon}
          </div>
        )}
        <div>
          <div className="text-2xl font-bold text-foreground">{value}</div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
        </div>
      </div>
    </Card>
  );
}

export function QuickAction({
  href,
  label,
  icon,
  tone = 'primary',
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  tone?: 'primary' | 'orange' | 'green' | 'purple' | 'muted';
}) {
  const tones: Record<string, string> = {
    primary: 'from-blue-500 to-cyan-500',
    orange: 'from-orange-400 to-amber-500',
    green: 'from-emerald-400 to-green-600',
    purple: 'from-violet-500 to-purple-600',
    muted: 'from-slate-500 to-slate-700',
  };
  return (
    <Link
      href={href}
      className="group flex flex-col items-center gap-2 text-center"
    >
      <span
        className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${tones[tone]} text-white shadow-card transition group-hover:scale-105 group-hover:shadow-glow`}
      >
        {icon}
      </span>
      <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">
        {label}
      </span>
    </Link>
  );
}

export function Badge({
  children,
  tone = 'muted',
}: {
  children: React.ReactNode;
  tone?: 'muted' | 'success' | 'warning' | 'danger' | 'primary';
}) {
  const tones: Record<string, string> = {
    muted: 'bg-muted text-muted-foreground',
    success: 'bg-success/15 text-success',
    warning: 'bg-amber-500/15 text-amber-500',
    danger: 'bg-destructive/15 text-destructive',
    primary: 'bg-primary/15 text-primary',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
