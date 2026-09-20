import { cn } from "@/lib/utils";

type DashboardHeaderProps = {
  title: string;
  description?: string;
  subtitle?: string;
  breadcrumbs?: Array<{ label: string; href?: string }> | React.ReactNode;
  actions?: React.ReactNode;
};

export function DashboardHeader({ title, description, subtitle, breadcrumbs, actions }: DashboardHeaderProps) {
  const bodyDescription = description ?? subtitle;

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-5 shadow-sm">
      {Array.isArray(breadcrumbs) ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          {breadcrumbs.map((crumb, index) => (
            <span key={`${crumb.label}-${index}`} className={cn(index === breadcrumbs.length - 1 ? "font-semibold text-slate-700" : "") }>
              {crumb.label}
              {index < breadcrumbs.length - 1 ? <span className="ml-2 text-slate-300">/</span> : null}
            </span>
          ))}
        </div>
      ) : breadcrumbs ? (
        <div className="mb-2 text-sm text-slate-500">{breadcrumbs}</div>
      ) : null}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
          {bodyDescription ? <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{bodyDescription}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
    </section>
  );
}
