"use client";

import { motion } from "framer-motion";
import { Mascot } from "./Mascot";
import type { MascotPose } from "./config";
import { cn } from "@/lib/utils";

interface MascotTipCardProps {
  title: string;
  description: string;
  pose?: MascotPose;
  action?: React.ReactNode;
  className?: string;
}

export function MascotTipCard({
  title,
  description,
  pose = "eureka",
  action,
  className,
}: MascotTipCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-[#f97316]/20 bg-gradient-to-r from-amber-50/60 via-white to-orange-50/40 p-4 shadow-xs",
        className
      )}
    >
      <div className="flex items-center gap-4">
        <Mascot pose={pose} size="sm" animate={true} className="shrink-0" />
        <div className="flex-1 space-y-0.5">
          <h4 className="text-sm font-bold text-[#1a1a2e]">{title}</h4>
          <p className="text-xs font-medium text-[#64748b] leading-relaxed">
            {description}
          </p>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </motion.div>
  );
}
