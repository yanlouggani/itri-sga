"use client";

import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  icon,
  actions,
  className,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between flex-wrap gap-4", className)}>
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div className="hidden sm:flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl gradient-itri text-white shadow-lg shadow-[#6d28d9]/15">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-[#1a1a2e] truncate">{title}</h1>
          {subtitle && <p className="text-sm text-[#64748b] truncate">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}
