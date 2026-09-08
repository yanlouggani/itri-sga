export type MascotPose = "bonjour" | "validation" | "celebration" | "eureka" | "reflexion" | "tous";

export const MASCOT_CONFIG: Record<MascotPose, { src: string; alt: string; label: string }> = {
  bonjour: { src: "/mascots/bonjour.png", alt: "Mascotte qui salue", label: "Salut !" },
  validation: { src: "/mascots/validation.png", alt: "Mascotte qui approuve", label: "Validé !" },
  celebration: { src: "/mascots/celebration.png", alt: "Mascotte en célébration", label: "Bravo !" },
  eureka: { src: "/mascots/eureka.png", alt: "Mascotte avec une idée", label: "Astuce" },
  reflexion: { src: "/mascots/reflexion.png", alt: "Mascotte qui réfléchit", label: "Hmm..." },
  tous: { src: "/mascots/tous.png", alt: "Toute la communauté", label: "Ensemble !" },
};

export function getMascot(pose: MascotPose) {
  return MASCOT_CONFIG[pose] ?? MASCOT_CONFIG.reflexion;
}

