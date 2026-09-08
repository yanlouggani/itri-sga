"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { getMascot, type MascotPose } from "./config";
import { cn } from "@/lib/utils";

export function Mascot({
  pose,
  message,
  size = "md",
  animate = true,
  className,
  bubbleClassName,
  ...rest
}: {
  pose: MascotPose;
  message?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  animate?: boolean;
  className?: string;
  bubbleClassName?: string;
} & Omit<HTMLMotionProps<"div">, "className">) {
  const mascot = getMascot(pose);
  const sizeClasses: Record<NonNullable<typeof size>, string> = {
    xs: "h-8 w-8",
    sm: "h-12 w-12",
    md: "h-16 w-16",
    lg: "h-24 w-24",
    xl: "h-32 w-32",
  };

  const bubble =
    <span className={cn("inline-flex items-center rounded-2xl border bg-white px-3 py-1.5 text-xs font-medium shadow-sm border-[#6D28D9]/10", bubbleClassName)}>
      {message}
    </span>;

  return (
    <motion.div
      {...rest}
      className={cn("inline-flex items-center gap-2", className)}
      initial={animate ? { opacity: 0, scale: 0.6, y: 8 } : false}
      animate={animate ? { opacity: 1, scale: 1, y: 0 } : undefined}
      whileHover={animate ? { scale: 1.05 } : undefined}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
    >
      {message && size !== "xs" && (
        <motion.div
          initial={animate ? { opacity: 0, x: -8 } : false}
          animate={animate ? { opacity: 1, x: 0 } : undefined}
          transition={{ delay: 0.15 }}
          className="relative"
        >
          {bubble}
        </motion.div>
      )}
      <motion.img
        src={mascot.src}
        alt={mascot.alt}
        draggable={false}
        className={cn("object-contain select-none", sizeClasses[size])}
        animate={animate ? { y: [0, -4, 0] } : undefined}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.div>
  );
}
