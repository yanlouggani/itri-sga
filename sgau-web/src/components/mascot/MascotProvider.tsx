"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { getMascot, type MascotPose } from "./config";
import { cn } from "@/lib/utils";

type Feedback = {
  id: number;
  pose: MascotPose;
  title: string;
  message?: string;
};

type MascotContextValue = {
  show: (pose: MascotPose, title: string, message?: string) => void;
};

const MascotContext = createContext<MascotContextValue | null>(null);

export function useMascot() {
  const ctx = useContext(MascotContext);
  if (!ctx) throw new Error("useMascot doit être utilisé dans <MascotProvider>");
  return ctx;
}

const DEFAULT_DURATION = 3200;

export function MascotProvider({ children }: { children: React.ReactNode }) {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const idRef = useRef(0);

  const show = useCallback((pose: MascotPose, title: string, message?: string) => {
    const id = ++idRef.current;
    setFeedbacks((prev) => [...prev.slice(-2), { id, pose, title, message }]);
    window.setTimeout(() => {
      setFeedbacks((prev) => prev.filter((f) => f.id !== id));
    }, DEFAULT_DURATION);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  const dismiss = (id: number) => setFeedbacks((prev) => prev.filter((f) => f.id !== id));

  return (
    <MascotContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[999] flex w-[calc(100%-2.5rem)] max-w-sm flex-col items-end gap-3">
        <AnimatePresence>
          {feedbacks.map((f) => {
            const mascot = getMascot(f.pose);
            return (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, x: 60, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 60, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
                className={cn(
                  "pointer-events-auto flex w-full items-center gap-3 rounded-2xl border bg-white/95 p-3 shadow-xl shadow-[#6D28D9]/10 backdrop-blur",
                  f.pose === "celebration" && "border-[#F97316]/30",
                  f.pose === "validation" && "border-emerald-300/50",
                  f.pose === "eureka" && "border-[#F97316]/30",
                  f.pose === "reflexion" && "border-[#6D28D9]/20",
                  f.pose === "bonjour" && "border-[#6D28D9]/20"
                )}
              >
                <motion.img
                  src={mascot.src}
                  alt={mascot.alt}
                  className="h-12 w-12 shrink-0 object-contain"
                  animate={{ y: [0, -3, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                />
                <div className="min-w-0 flex-1">
                  <p className={cn(
                    "flex items-center gap-1.5 text-sm font-semibold",
                    f.pose === "celebration" ? "text-[#F97316]" :
                    f.pose === "validation" ? "text-emerald-600" :
                    f.pose === "eureka" ? "text-[#F97316]" : "text-[#6D28D9]"
                  )}>
                    {f.pose === "validation" && <CheckCircle2 className="h-4 w-4" />}
                    {f.title}
                  </p>
                  {f.message && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{f.message}</p>
                  )}
                </div>
                <button
                  onClick={() => dismiss(f.id)}
                  className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Fermer"
                >
                  ✕
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </MascotContext.Provider>
  );
}
