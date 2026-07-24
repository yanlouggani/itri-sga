"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, useScroll, useTransform, type Variants } from "framer-motion";
import { GraduationCap, BookOpen, Users, Target, ArrowRight, Sparkles, ChevronRight, Quote } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";

const stagger: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.3 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 25 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] } },
};

const features = [
  {
    icon: BookOpen,
    title: "Formations adaptées",
    desc: "Programmes sur mesure conçus pour tous les niveaux, du débutant au confirmé, avec des méthodes pédagogiques modernes et efficaces.",
  },
  {
    icon: Users,
    title: "Petits groupes",
    desc: "Des classes à taille humaine pour un accompagnement personnalisé et une progression optimale de chaque apprenant.",
  },
  {
    icon: Target,
    title: "Suivi individualisé",
    desc: "Un parcours pédagogique sur mesure avec des évaluations régulières pour garantir votre progression.",
  },
  {
    icon: GraduationCap,
    title: "Formateurs certifiés",
    desc: "Une équipe de professionnels qualifiés, natifs et expérimentés, passionnés par l'enseignement des langues.",
  },
];

const stats = [
  { value: "+500", label: "Apprenants" },
  { value: "+50", label: "Formateurs" },
  { value: "98%", label: "Satisfaction" },
  { value: "15+", label: "Langues" },
];

function FloatingShape({ className, delay = 0 }: { className: string; delay?: number }) {
  return (
    <motion.div
      className={`absolute rounded-full ${className}`}
      animate={{ y: [-25, 25, -25], rotate: [0, 12, -12, 0] }}
      transition={{ duration: 7 + delay, delay, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

export default function LandingPage() {
  const router = useRouter();
  const { scrollYProgress } = useScroll();
  const headerBg = useTransform(scrollYProgress, [0, 0.08], ["rgba(255,255,255,0)", "rgba(255,255,255,0.9)"]);
  const headerShadow = useTransform(scrollYProgress, [0, 0.08], ["0px 0px 0px rgba(0,0,0,0)", "0px 1px 3px rgba(0,0,0,0.06)"]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("users").select("role").eq("id", user.id).maybeSingle().then(({ data: profile }) => {
        if (profile?.role === "admin") router.push("/dashboard");
        else if (profile?.role === "professor") router.push("/professor/dashboard");
        else router.push("/student/dashboard");
      });
    });
  }, [router]);

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-white">
      <motion.header
        style={{ backgroundColor: headerBg, boxShadow: headerShadow }}
        className="fixed top-0 z-50 w-full backdrop-blur-lg"
      >
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2.5"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <GraduationCap className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight">ITRI Academy</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex items-center gap-6"
          >
            <Link href="/" className="text-sm text-neutral-600 transition-colors hover:text-neutral-900">
              Accueil
            </Link>
            <Link href="/login" className="text-sm text-neutral-600 transition-colors hover:text-neutral-900">
              Formations
            </Link>
            <Link
              href="/login"
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-white transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 active:scale-95"
            >
              Se connecter
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </motion.div>
        </div>
      </motion.header>

      <main className="flex-1">
        <section className="relative min-h-screen flex items-center overflow-hidden pt-14">
          <motion.div
            className="pointer-events-none absolute inset-0"
            animate={{
              background: [
                "radial-gradient(ellipse 90% 60% at 20% 50%, rgba(232,83,63,0.06) 0%, transparent 70%)",
                "radial-gradient(ellipse 80% 50% at 30% 40%, rgba(232,83,63,0.1) 0%, transparent 65%)",
                "radial-gradient(ellipse 90% 60% at 15% 55%, rgba(232,83,63,0.06) 0%, transparent 70%)",
                "radial-gradient(ellipse 80% 50% at 20% 50%, rgba(232,83,63,0.08) 0%, transparent 65%)",
                "radial-gradient(ellipse 90% 60% at 20% 50%, rgba(232,83,63,0.06) 0%, transparent 70%)",
              ],
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />

          <FloatingShape className="-left-24 top-1/4 h-72 w-72 border-2 border-primary/10" delay={0} />
          <FloatingShape className="-right-20 top-1/4 h-56 w-56 border-2 border-primary/5" delay={2} />
          <FloatingShape className="right-1/4 bottom-1/4 h-40 w-40 bg-primary/5" delay={4} />
          <FloatingShape className="left-1/3 top-1/5 h-24 w-24 border border-primary/10" delay={1} />

          <div className="mx-auto flex w-full max-w-7xl items-center px-8">
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="visible"
              className="w-full max-w-2xl"
            >
              <motion.div variants={fadeUp} className="mb-8">
                <img src="/logo.png" alt="ITRI Academy" width={80} height={80} className="rounded-xl" />
              </motion.div>

              <motion.div
                variants={fadeUp}
                className="mb-5 inline-flex items-center gap-1.5 rounded-full border bg-white/80 px-4 py-1.5 text-xs text-neutral-500 backdrop-blur-sm shadow-sm"
              >
                <Sparkles className="h-3 w-3 text-primary" />
                Plateforme de gestion pédagogique nouvelle génération
              </motion.div>

              <motion.h1 variants={fadeUp} className="mb-4 text-5xl font-bold leading-tight tracking-tight text-neutral-900 sm:text-6xl md:text-7xl">
                ITRI Academy
              </motion.h1>

              <motion.p variants={fadeUp} className="mb-2 text-xl font-medium text-primary sm:text-2xl">
                École de Langues et de Formation
              </motion.p>

              <motion.p variants={fadeUp} className="mb-10 text-base leading-relaxed text-neutral-500 max-w-xl">
                Gérez l&apos;ensemble de vos formations, le suivi des présences et la progression pédagogique
                dans une plateforme unique, simple et intuitive.
              </motion.p>

              <motion.div variants={fadeUp} className="flex items-center gap-4">
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    href="/login"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-7 text-base font-medium text-white shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30"
                  >
                    Accéder à mon espace
                    <motion.span
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </motion.span>
                  </Link>
                </motion.div>
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center gap-1.5 text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-700"
                >
                  En savoir plus
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </motion.div>

              <motion.div
                variants={fadeUp}
                className="mt-14 grid grid-cols-4 gap-8 border-t pt-8"
              >
                {stats.map((stat) => (
                  <div key={stat.label}>
                    <div className="text-2xl font-bold text-neutral-900">{stat.value}</div>
                    <div className="text-xs text-neutral-500">{stat.label}</div>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </div>

          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
          >
            <span className="text-[10px] text-neutral-400 tracking-widest uppercase">Découvrir</span>
            <motion.div animate={{ y: [0, 4, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-neutral-300">
                <path d="M8 3v10M11 10l-3 3-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.div>
          </motion.div>
        </section>

        <section className="relative bg-white py-28">
          <div className="mx-auto max-w-7xl px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6 }}
              className="mb-16 max-w-2xl"
            >
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="mb-4 inline-block rounded-full bg-primary/10 px-4 py-1 text-xs font-medium text-primary"
              >
                Pourquoi nous choisir ?
              </motion.span>
              <h2 className="mb-4 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
                Une école qui vous ressemble
              </h2>
              <p className="text-base leading-relaxed text-neutral-500 max-w-xl">
                Nous plaçons l&apos;apprenant au cœur de notre approche avec des formations conçues
                pour révéler le potentiel de chacun, dans une ambiance bienveillante et stimulante.
              </p>
            </motion.div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={feature.title}
                    custom={i}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    whileHover={{ y: -8, transition: { duration: 0.2 } }}
                    className="group relative rounded-2xl border bg-white p-8 transition-shadow hover:shadow-lg hover:shadow-primary/5"
                  >
                    <motion.div
                      whileHover={{ rotate: [0, -12, 12, 0] }}
                      transition={{ duration: 0.4 }}
                      className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors"
                    >
                      <Icon className="h-6 w-6 text-primary" />
                    </motion.div>
                    <h3 className="mb-2 text-base font-semibold text-neutral-900">{feature.title}</h3>
                    <p className="text-sm leading-relaxed text-neutral-500">{feature.desc}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="bg-neutral-50 py-12"
      >
        <div className="mx-auto max-w-7xl px-8">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
                <GraduationCap className="h-3 w-3 text-white" />
              </div>
              <span className="text-sm font-semibold text-neutral-700">ITRI Academy</span>
            </div>
            <p className="text-xs text-neutral-400">&copy; {new Date().getFullYear()} ITRI Academy. Tous droits réservés.</p>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}
