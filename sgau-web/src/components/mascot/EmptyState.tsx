"use client";

import { motion } from "framer-motion";
import { Mascot } from "./Mascot";
import type { MascotPose } from "./config";
import { cn } from "@/lib/utils";

export function EmptyState({
  pose = "reflexion",
  title,
  hint,
  action,
  className,
  compact = false,
}: {
  pose?: MascotPose;
  title: string;
  hint?: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#6D28D9]/15 bg-white px-6 text-center",
        compact ? "py-10" : "py-16",
        className
      )}
    >
      <Mascot pose={pose} size={compact ? "sm" : "md"} animate={false} className="mb-4" />
      <p className={cn("font-semibold text-muted-foreground", compact ? "text-sm" : "text-lg")}>{title}</p>
      {hint && <p className="mt-1 text-sm text-muted-foreground/70">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </motion.div>
  );
}

export function LoadingState({
  label = "Chargement...",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-16", className)}>
      <motion.div
        animate={{ y: [0, -6, 0], rotate: [0, -4, 0] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
      >
        <img src="/mascots/reflexion.png" alt="Chargement" className="h-16 w-16 object-contain" />
      </motion.div>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
