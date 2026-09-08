"use client";

import { motion } from "framer-motion";
import { Mascot } from "./Mascot";
import type { MascotPose } from "./config";
import { cn } from "@/lib/utils";

interface MascotStatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  pose?: MascotPose;
  icon?: React.ComponentType<{ className?: string }>;
  trend?: {
    value: string;
    positive?: boolean;
  };
  className?: string;
}

export function MascotStatsCard({
  title,
  value,
  subtitle,
  pose = "eureka",
  icon: Icon,
  trend,
  className,
}: MascotStatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-[#6d28d9]/10 bg-white p-5 shadow-sm shadow-[#6d28d9]/5 transition-all hover:shadow-md hover:shadow-[#6d28d9]/10",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-[#1a1a2e] md:text-3xl">
              {value}
            </span>
            {trend && (
              <span
                className={cn(
                  "inline-flex items-center text-xs font-semibold rounded-full px-2 py-0.5",
                  trend.positive
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-amber-50 text-amber-600"
                )}
              >
                {trend.value}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-[#64748b]">{subtitle}</p>
          )}
        </div>

        <div className="relative flex items-center justify-center">
          <Mascot pose={pose} size="sm" animate={true} />
        </div>
      </div>
    </motion.div>
  );
}
