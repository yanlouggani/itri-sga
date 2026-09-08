"use client";

import { motion } from "framer-motion";
import { Mascot } from "./Mascot";
import type { MascotPose } from "./config";
import { cn } from "@/lib/utils";

interface MascotHeaderProps {
  title: string;
  description?: string;
  pose?: MascotPose;
  mascotMessage?: string;
  badge?: string;
  children?: React.ReactNode;
  className?: string;
}

export function MascotHeader({
  title,
  description,
  pose = "bonjour",
  mascotMessage,
  badge,
  children,
  className,
}: MascotHeaderProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border border-[#6d28d9]/10 bg-gradient-to-br from-white via-[#f8f9fc] to-[#f3f0ff] p-6 shadow-sm shadow-[#6d28d9]/5 md:p-8",
        className
      )}
    >
      {/* Decorative gradient blur in background */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-gradient-to-br from-[#6d28d9]/15 to-[#f97316]/10 blur-2xl" />

      <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <Mascot
            pose={pose}
            message={mascotMessage}
            size="lg"
            className="shrink-0"
          />
          <div className="space-y-1">
            {badge && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#6d28d9]/10 px-3 py-1 text-xs font-semibold text-[#6d28d9]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#6d28d9]" />
                {badge}
              </span>
            )}
            <h1 className="text-2xl font-bold tracking-tight text-[#1a1a2e] md:text-3xl">
              {title}
            </h1>
            {description && (
              <p className="text-sm font-medium text-[#64748b] max-w-xl">
                {description}
              </p>
            )}
          </div>
        </div>

        {children && (
          <div className="flex items-center gap-3 shrink-0 self-start md:self-auto">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
