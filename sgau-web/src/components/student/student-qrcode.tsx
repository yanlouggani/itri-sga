"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

export function StudentQRCode({ studentId }: { studentId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, studentId, {
        width: 256,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });
    }
  }, [studentId]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="h-64 w-64 rounded-2xl border-4 border-primary/20 bg-white p-4 shadow-lg">
        <canvas ref={canvasRef} className="h-full w-full" />
      </div>
      <p className="text-xs font-mono text-muted-foreground">{studentId.slice(0, 8)}...</p>
    </div>
  );
}
