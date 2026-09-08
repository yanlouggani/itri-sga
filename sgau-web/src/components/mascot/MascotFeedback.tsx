"use client";

import { AnimatePresence, motion } from "framer-motion";
import { getMascot, type MascotPose } from "./config";
import { cn } from "@/lib/utils";

export function MascotFeedback({
  pose,
  title,
  message,
  open,
  onClose,
  className,
}: {
  pose: MascotPose;
  title: string;
  message?: string;
  open: boolean;
  onClose?: () => void;
  className?: string;
}) {
  const mascot = getMascot(pose);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 12 }}
          transition={{ type: "spring", stiffness: 280, damping: 22 }}
          className={cn(
            "flex w-full items-center gap-4 rounded-2xl border bg-white p-4 shadow-lg shadow-[#6D28D9]/10",
            pose === "celebration" && "border-[#F97316]/30 bg-gradient-to-r from-orange-50 to-white",
            pose === "validation" && "border-emerald-300/60 bg-gradient-to-r from-emerald-50 to-white",
            pose === "eureka" && "border-[#F97316]/30 bg-gradient-to-r from-orange-50 to-white",
            pose === "reflexion" && "border-[#6D28D9]/20",
            pose === "bonjour" && "border-[#6D28D9]/20",
            className
          )}
          role="status"
        >
          <motion.img
            src={mascot.src}
            alt={mascot.alt}
            className="h-16 w-16 shrink-0 object-contain"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="min-w-0 flex-1">
            <p className={cn(
              "text-base font-bold",
              pose === "celebration" ? "text-[#F97316]" :
              pose === "validation" ? "text-emerald-600" :
              pose === "eureka" ? "text-[#F97316]" : "text-[#6D28D9]"
            )}>
              {title}
            </p>
            {message && (
              <p className="mt-0.5 text-sm text-muted-foreground">{message}</p>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Fermer"
            >
              ✕
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
