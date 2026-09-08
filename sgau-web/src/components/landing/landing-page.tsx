"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, useScroll, useTransform, AnimatePresence, type Variants } from "framer-motion";
import {
  GraduationCap, Users, Target, ArrowRight, Sparkles,
  ChevronRight, Globe, Laptop, Clock, MapPin, Phone, Mail,
  Star, CheckCircle2, ChevronDown, Send, Menu, X, Heart,
} from "lucide-react";
import { createClient } from "@/lib/supabase/browser";

const stagger: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] } },
};

const features = [
  {
    icon: Globe,
    title: "Langues vivantes",
    desc: "Anglais, français, amazigh et bien d'autres. Des cours pour tous niveaux avec des méthodes immersives et interactives.",
    color: "bg-[#f97316]/10 text-[#f97316]",
  },
  {
    icon: Laptop,
    title: "Informatique",
    desc: "Bureautique, programmation et maintenance. Maîtrisez les outils numériques essentiels pour votre carrière.",
    color: "bg-[#6d28d9]/10 text-[#6d28d9]",
  },
  {
    icon: Users,
    title: "Petits groupes",
    desc: "Maximum 15 élèves par groupe pour un accompagnement personnalisé et une progression optimale.",
    color: "bg-[#f59e0b]/10 text-[#f59e0b]",
  },
  {
    icon: Target,
    title: "Suivi individualisé",
    desc: "Un parcours pédagogique sur mesure avec des évaluations régulières pour garantir votre progression.",
    color: "bg-[#f97316]/10 text-[#f97316]",
  },
  {
    icon: GraduationCap,
    title: "Formateurs certifiés",
    desc: "Une équipe de professionnels qualifiés, passionnés par l'enseignement et dédiés à votre réussite.",
    color: "bg-[#6d28d9]/10 text-[#6d28d9]",
  },
  {
    icon: Heart,
    title: "Ambiance bienveillante",
    desc: "Un cadre d'apprentissage stimulant et bienveillant où chaque élève est encouragé à donner le meilleur.",
    color: "bg-[#f59e0b]/10 text-[#f59e0b]",
  },
];

const stats = [
  { value: "+500", label: "Apprenants formés", icon: GraduationCap },
  { value: "+50", label: "Formateurs qualifiés", icon: Users },
  { value: "98%", label: "Taux de satisfaction", icon: Star },
  { value: "15+", label: "Langues enseignées", icon: Globe },
];

const formations = [
  { name: "Anglais", levels: "Débutant → Avancé", icon: "🇬🇧", desc: "Méthode immersive pour tous les niveaux" },
  { name: "Français", levels: "Primaire → Adulte", icon: "🇫🇷", desc: "Expression orale et écrite" },
  { name: "Amazigh", levels: "4ème primaire", icon: "ⵣ", desc: "Préparation aux examens" },
  { name: "Informatique", levels: "Bureautique", icon: "💻", desc: "Word, Excel, PowerPoint" },
  { name: "Arabe", levels: "Tous niveaux", icon: "📚", desc: "Lecture, écriture, grammaire" },
  { name: "Allemand", levels: "Débutant", icon: "🇩🇪", desc: "Initiation et conversation" },
];

const testimonials = [
  {
    name: "Amina B.",
    role: "Élève Anglais",
    text: "Grâce à ITRI Academy, j'ai réussi mon examen d'anglais avec mention. Les formateurs sont fantastiques !",
    rating: 5,
  },
  {
    name: "Youcef K.",
    role: "Élève Informatique",
    text: "J'ai appris à maîtriser Excel en quelques semaines. Le cours est pratique et bien structuré.",
    rating: 5,
  },
  {
    name: "Sarah M.",
    role: "Parent d'élève",
    text: "Mon fils a fait des progrès incroyables en anglais. L'ambiance est chaleureuse et les groupes sont petits.",
    rating: 5,
  },
];

const faqItems = [
  {
    q: "Quels sont les horaires des cours ?",
    a: "Nous proposons des cours du dimanche au vendredi, de 8h30 à 16h30, avec des créneaux flexibles pour s'adapter à votre emploi du temps.",
  },
  {
    q: "Quel est le tarif des formations ?",
    a: "Nos tarifs varient selon la formation choisie. Contactez-nous pour recevoir notre grille tarifaire complète.",
  },
  {
    q: "Faut-il un niveau préalable ?",
    a: "Non, nous accueillons tous les niveaux, du débutant au confirmé. Un test de positionnement peut être proposé pour les langues.",
  },
  {
    q: "Y a-t-il un certificat de fin de formation ?",
    a: "Oui, un certificat de fin de formation est délivré à l'issue du programme complété.",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const { scrollYProgress } = useScroll();
  const headerBg = useTransform(scrollYProgress, [0, 0.08], ["rgba(255,255,255,0)", "rgba(255,255,255,0.95)"]);
  const headerShadow = useTransform(scrollYProgress, [0, 0.08], ["0px 0px 0px rgba(0,0,0,0)", "0px 2px 20px rgba(57,35,98,0.06)"]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

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

  useEffect(() => {
    const handleScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(total > 0 ? (window.scrollY / total) * 100 : 0);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-[#f8f9fc]">
      <div
        className="fixed top-0 left-0 h-[3px] z-[9999]"
        style={{
          width: `${scrollProgress}%`,
          background: "linear-gradient(90deg, #f97316, #f59e0b, #6d28d9)",
          transition: "width 0.1s",
        }}
      />

      <motion.header
        style={{ backgroundColor: headerBg, boxShadow: headerShadow }}
        className="fixed top-0 z-50 w-full backdrop-blur-xl"
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden">
              <img src="/logo.png" alt="ITRI Academy" className="h-full w-full object-cover" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-[#1a1a2e]">ITRI Academy</span>
              <span className="text-[10px] text-[#64748b] tracking-wider uppercase">École de langues</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="hidden md:flex items-center gap-1"
          >
            {["Accueil", "Formations", "À propos", "Contact"].map((item) => (
              <Link
                key={item}
                href={`#${item.toLowerCase() === "accueil" ? "hero" : item.toLowerCase() === "formations" ? "formations" : item.toLowerCase() === "à propos" ? "about" : "contact"}`}
                className="text-sm text-[#64748b] px-4 py-2 rounded-lg font-medium transition-all hover:text-[#1a1a2e] hover:bg-[#6d28d9]/5"
              >
                {item}
              </Link>
            ))}
            <Link
              href="/login"
              className="ml-2 inline-flex h-9 items-center gap-2 rounded-xl px-5 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-[#f97316]/25 active:scale-95"
              style={{ background: "linear-gradient(135deg, #f97316, #6d28d9)" }}
            >
              Se connecter
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </motion.div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-[#6d28d9]/5"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white/95 backdrop-blur-xl border-t border-[#6d28d9]/5 overflow-hidden"
            >
              <div className="flex flex-col p-4 gap-1">
                {["Accueil", "Formations", "À propos", "Contact"].map((item) => (
                  <Link
                    key={item}
                    href={`#${item.toLowerCase() === "accueil" ? "hero" : item.toLowerCase() === "formations" ? "formations" : item.toLowerCase() === "à propos" ? "about" : "contact"}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-sm text-[#64748b] px-4 py-3 rounded-lg font-medium transition-all hover:text-[#1a1a2e] hover:bg-[#6d28d9]/5"
                  >
                    {item}
                  </Link>
                ))}
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="mt-2 inline-flex h-10 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white"
                  style={{ background: "linear-gradient(135deg, #f97316, #6d28d9)" }}
                >
                  Se connecter
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      <main className="flex-1">
        <section className="relative min-h-screen flex items-center overflow-hidden pt-16" id="hero">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-br from-[#f8f9fc] via-white to-[#6d28d9]/[0.03]" />
            <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-[#f97316]/[0.04] blur-[100px]" />
            <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-[#6d28d9]/[0.04] blur-[120px]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-[#f59e0b]/[0.03] blur-[80px]" />
          </div>

          <div className="mx-auto flex w-full max-w-7xl items-center px-6 lg:px-8 relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center w-full">
              <motion.div
                variants={stagger}
                initial="hidden"
                animate="visible"
              >
                <motion.div
                  variants={fadeUp}
                  className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#6d28d9]/10 bg-white/80 px-4 py-2 text-xs text-[#6d28d9] backdrop-blur-sm shadow-sm"
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#f97316]" />
                  Plateforme de gestion pédagogique nouvelle génération
                </motion.div>

                <motion.h1 variants={fadeUp} className="mb-5 text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight text-[#1a1a2e]">
                  Révélez votre{" "}
                  <span className="text-gradient-itri">potentiel</span>{" "}
                  avec ITRI Academy
                </motion.h1>

                <motion.p variants={fadeUp} className="mb-8 text-base sm:text-lg text-[#64748b] max-w-lg leading-relaxed">
                  Anglais, français, amazigh et informatique — des cours sur mesure pour enfants et adultes à Draâ El Borj, Bouira.
                </motion.p>

                <motion.div variants={fadeUp} className="flex flex-wrap gap-3 mb-10">
                  {[
                    { icon: GraduationCap, text: "500+ élèves" },
                    { icon: Star, text: "98% satisfaction" },
                    { icon: Users, text: "15 max/groupe" },
                  ].map((stat) => (
                    <span
                      key={stat.text}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#6d28d9]/8 text-sm font-medium text-[#6d28d9] shadow-sm"
                    >
                      <stat.icon className="h-4 w-4 text-[#f97316]" />
                      {stat.text}
                    </span>
                  ))}
                </motion.div>

                <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-4">
                  <Link
                    href="/login"
                    className="inline-flex h-12 items-center gap-2 rounded-xl px-7 text-base font-semibold text-white shadow-lg shadow-[#f97316]/20 transition-all hover:shadow-xl hover:shadow-[#f97316]/30 hover:-translate-y-0.5 active:scale-95"
                    style={{ background: "linear-gradient(135deg, #f97316, #6d28d9)" }}
                  >
                    Accéder à mon espace
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="#formations"
                    className="inline-flex h-12 items-center gap-2 rounded-xl border border-[#6d28d9]/15 bg-white/80 px-6 text-sm font-medium text-[#1a1a2e] backdrop-blur-sm transition-all hover:bg-white hover:border-[#6d28d9]/25 hover:-translate-y-0.5"
                  >
                    Découvrir nos formations
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                className="hidden lg:flex justify-center"
              >
                <div className="relative">
                  <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-[#f97316]/10 to-[#6d28d9]/10 blur-2xl" />
                  <div className="relative bg-white rounded-3xl p-8 shadow-xl shadow-[#6d28d9]/[0.06] border border-[#6d28d9]/[0.06]">
                    <div className="flex justify-center mb-6">
                      <motion.img
                        src="/mascots/bonjour.png"
                        alt="Mascotte ITRI"
                        className="w-36 h-36 object-contain"
                        animate={{ y: [-8, 8, -8] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="text-center p-3 rounded-xl bg-[#6d28d9]/[0.04]">
                        <div className="text-2xl font-bold text-[#6d28d9]">5+</div>
                        <div className="text-[10px] text-[#64748b] uppercase tracking-wider">Langues</div>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-[#f97316]/[0.04]">
                        <div className="text-2xl font-bold text-[#f97316]">500+</div>
                        <div className="text-[10px] text-[#64748b] uppercase tracking-wider">Élèves</div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {["Formateurs qualifiés", "Groupes interactifs", "Suivi personnalisé", "Méthode immersive"].map((feat) => (
                        <div key={feat} className="flex items-center gap-3 text-sm text-[#64748b]">
                          <CheckCircle2 className="h-4 w-4 text-[#f97316] shrink-0" />
                          {feat}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="py-16 relative">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="text-center p-6 rounded-2xl bg-white border border-[#6d28d9]/[0.06] shadow-sm"
                >
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#f97316]/10 to-[#6d28d9]/10 mb-3">
                    <stat.icon className="h-5 w-5 text-[#f97316]" />
                  </div>
                  <div className="text-3xl font-bold text-[#6d28d9]">{stat.value}</div>
                  <div className="text-xs text-[#64748b] mt-1">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-white" id="about">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
                className="relative"
              >
                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#6d28d9] to-[#f97316] p-1">
                  <div className="rounded-2xl overflow-hidden bg-white p-6">
                    <div className="flex justify-center mb-4">
                      <motion.img
                        src="/mascots/tous.png"
                        alt="Mascottes ITRI"
                        className="w-48 h-48 object-contain"
                        animate={{ y: [-5, 5, -5] }}
                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-[#f97316]/[0.06] text-center">
                        <div className="text-lg font-bold text-[#f97316]">500+</div>
                        <div className="text-[10px] text-[#64748b]">Élèves formés</div>
                      </div>
                      <div className="p-3 rounded-xl bg-[#6d28d9]/[0.06] text-center">
                        <div className="text-lg font-bold text-[#6d28d9]">15+</div>
                        <div className="text-[10px] text-[#64748b]">Langues</div>
                      </div>
                      <div className="p-3 rounded-xl bg-[#f59e0b]/[0.06] text-center">
                        <div className="text-lg font-bold text-[#f59e0b]">50+</div>
                        <div className="text-[10px] text-[#64748b]">Formateurs</div>
                      </div>
                      <div className="p-3 rounded-xl bg-[#f97316]/[0.06] text-center">
                        <div className="text-lg font-bold text-[#f97316]">98%</div>
                        <div className="text-[10px] text-[#64748b]">Satisfaction</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-4 -right-4 bg-gradient-to-br from-[#f97316] to-[#6d28d9] text-white w-20 h-20 rounded-full flex flex-col items-center justify-center font-bold shadow-lg">
                  <span className="text-xl">+500</span>
                  <span className="text-[9px] opacity-90">Élèves</span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.1 }}
              >
                <span className="mb-4 inline-block rounded-full bg-[#f97316]/10 px-4 py-1.5 text-xs font-semibold text-[#f97316] uppercase tracking-wider">
                  À propos
                </span>
                <h2 className="mb-4 text-3xl sm:text-4xl font-bold tracking-tight text-[#1a1a2e]">
                  Un centre d&apos;<span className="text-gradient-itri">excellence</span> au cœur de Bouira
                </h2>
                <p className="text-[#64748b] leading-relaxed mb-4">
                  Située à Draâ El Borj, en face de la Pharmacie L. Rabia, ITRI Academy est un centre de formation linguistique et informatique moderne. Nous croyons que l&apos;apprentissage des langues ouvre des portes vers un avenir meilleur.
                </p>
                <p className="text-[#64748b] leading-relaxed mb-6">
                  Notre pédagogie allie rigueur académique et méthodes interactives, dans une ambiance bienveillante. Chaque élève bénéficie d&apos;un suivi personnalisé adapté à son rythme et à ses objectifs.
                </p>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {["Formateurs diplômés", "Groupes réduits", "Méthode interactive", "Certificat de fin"].map((feat) => (
                    <div key={feat} className="flex items-center gap-2.5 text-sm text-[#475569]">
                      <CheckCircle2 className="h-4 w-4 text-[#f97316] shrink-0" />
                      {feat}
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#6d28d9]/10 text-xs font-semibold text-[#6d28d9] shadow-sm">
                    <GraduationCap className="h-3.5 w-3.5" /> Formateurs qualifiés
                  </span>
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#6d28d9]/10 text-xs font-semibold text-[#6d28d9] shadow-sm">
                    <Users className="h-3.5 w-3.5" /> Petits groupes
                  </span>
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#f97316] text-xs font-semibold text-white shadow-sm">
                    <Star className="h-3.5 w-3.5" /> Satisfaction 98%
                  </span>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-[#f8f9fc]" id="formations">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-14"
            >
              <span className="mb-4 inline-block rounded-full bg-[#6d28d9]/10 px-4 py-1.5 text-xs font-semibold text-[#6d28d9] uppercase tracking-wider">
                Nos programmes
              </span>
              <h2 className="mb-4 text-3xl sm:text-4xl font-bold tracking-tight text-[#1a1a2e]">
                Des formations <span className="text-gradient-itri">pour tous</span>
              </h2>
              <p className="text-[#64748b] max-w-xl mx-auto">
                Du primaire à l&apos;adulte, du débutant à l&apos;avancé — trouvez la formation qui vous correspond.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {formations.map((f, i) => (
                <motion.div
                  key={f.name}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  whileHover={{ y: -6, transition: { duration: 0.2 } }}
                  className="group bg-white rounded-2xl p-6 border border-[#6d28d9]/[0.06] shadow-sm hover:shadow-lg hover:shadow-[#6d28d9]/[0.06] transition-all relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#f97316] to-[#6d28d9] opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="text-3xl mb-4">{f.icon}</div>
                  <h3 className="text-lg font-semibold text-[#1a1a2e] mb-1">{f.name}</h3>
                  <p className="text-sm text-[#64748b] mb-3">{f.desc}</p>
                  <span className="inline-block px-3 py-1 rounded-full bg-[#6d28d9]/[0.06] text-[11px] font-medium text-[#6d28d9]">
                    {f.levels}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-white">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-14"
            >
              <span className="mb-4 inline-block rounded-full bg-[#f97316]/10 px-4 py-1.5 text-xs font-semibold text-[#f97316] uppercase tracking-wider">
                Pourquoi nous choisir ?
              </span>
              <h2 className="mb-4 text-3xl sm:text-4xl font-bold tracking-tight text-[#1a1a2e]">
                4 raisons de <span className="text-gradient-itri">nous faire confiance</span>
              </h2>
              <p className="text-[#64748b] max-w-xl mx-auto">
                Depuis notre ouverture, nous plaçons la qualité pédagogique et la satisfaction de nos élèves au cœur de notre mission.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 gap-5">
              {features.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="flex gap-5 p-6 rounded-2xl bg-white border border-[#6d28d9]/[0.06] shadow-sm hover:shadow-lg hover:shadow-[#6d28d9]/[0.06] transition-all"
                >
                  <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${f.color}`}>
                    <f.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[#1a1a2e] mb-1.5">{f.title}</h3>
                    <p className="text-sm text-[#64748b] leading-relaxed">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-[#f8f9fc]">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-14"
            >
              <span className="mb-4 inline-block rounded-full bg-[#f59e0b]/10 px-4 py-1.5 text-xs font-semibold text-[#f59e0b] uppercase tracking-wider">
                Témoignages
              </span>
              <h2 className="mb-4 text-3xl sm:text-4xl font-bold tracking-tight text-[#1a1a2e]">
                Ce que disent nos <span className="text-gradient-itri">élèves</span>
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6">
              {testimonials.map((t, i) => (
                <motion.div
                  key={t.name}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="bg-white rounded-2xl p-6 border border-[#6d28d9]/[0.06] shadow-sm"
                >
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-[#f59e0b] text-[#f59e0b]" />
                    ))}
                  </div>
                  <p className="text-sm text-[#64748b] leading-relaxed mb-5 italic">&quot;{t.text}&quot;</p>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#f97316] to-[#6d28d9] flex items-center justify-center text-white text-sm font-bold">
                      {t.name[0]}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#1a1a2e]">{t.name}</div>
                      <div className="text-xs text-[#64748b]">{t.role}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-white">
          <div className="mx-auto max-w-3xl px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <span className="mb-4 inline-block rounded-full bg-[#6d28d9]/10 px-4 py-1.5 text-xs font-semibold text-[#6d28d9] uppercase tracking-wider">
                FAQ
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1a1a2e]">
                Questions <span className="text-gradient-itri">fréquentes</span>
              </h2>
            </motion.div>

            <div className="space-y-3">
              {faqItems.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="rounded-2xl border border-[#6d28d9]/[0.06] overflow-hidden bg-white"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between gap-4 p-5 text-left"
                  >
                    <span className="text-sm font-semibold text-[#1a1a2e]">{item.q}</span>
                    <ChevronDown className={`h-4 w-4 text-[#f97316] shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {openFaq === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <p className="px-5 pb-5 text-sm text-[#64748b] leading-relaxed">{item.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-[#f8f9fc]" id="contact">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <span className="mb-4 inline-block rounded-full bg-[#f97316]/10 px-4 py-1.5 text-xs font-semibold text-[#f97316] uppercase tracking-wider">
                  Contact
                </span>
                <h2 className="mb-4 text-3xl sm:text-4xl font-bold tracking-tight text-[#1a1a2e]">
                  Parlons de votre <span className="text-gradient-itri">formation</span>
                </h2>
                <p className="text-[#64748b] mb-8 leading-relaxed">
                  N&apos;hésitez pas à nous contacter pour plus d&apos;informations sur nos formations et nos tarifs.
                </p>

                <div className="space-y-4">
                  {[
                    { icon: MapPin, label: "Adresse", value: "Draâ El Borj, Bouira", color: "bg-[#f97316]/10 text-[#f97316]" },
                    { icon: Phone, label: "Téléphone", value: "+213 542 957 755", color: "bg-[#6d28d9]/10 text-[#6d28d9]" },
                    { icon: Mail, label: "Email", value: "contact@itri-academy.com", color: "bg-[#f59e0b]/10 text-[#f59e0b]" },
                    { icon: Clock, label: "Horaires", value: "Dim - Ven: 8h30 - 16h30", color: "bg-[#f97316]/10 text-[#f97316]" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-4 p-4 rounded-xl bg-white border border-[#6d28d9]/[0.06]">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${item.color}`}>
                        <item.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs text-[#64748b]">{item.label}</div>
                        <div className="text-sm font-medium text-[#1a1a2e]">{item.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="bg-white rounded-2xl p-8 border border-[#6d28d9]/[0.06] shadow-lg shadow-[#6d28d9]/[0.04] relative overflow-hidden"
              >
                <div className="absolute top-0 left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-transparent via-[#f97316] to-transparent" />
                <h3 className="text-lg font-bold text-[#1a1a2e] mb-1">Envoyez-nous un message</h3>
                <p className="text-sm text-[#64748b] mb-6">Nous vous répondrons dans les plus brefs délais.</p>
                <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#64748b] mb-1.5">Prénom</label>
                      <input type="text" className="w-full px-4 py-2.5 rounded-xl border border-[#6d28d9]/10 text-sm focus:outline-none focus:border-[#6d28d9] focus:ring-2 focus:ring-[#6d28d9]/10 transition-all" placeholder="Votre prénom" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#64748b] mb-1.5">Nom</label>
                      <input type="text" className="w-full px-4 py-2.5 rounded-xl border border-[#6d28d9]/10 text-sm focus:outline-none focus:border-[#6d28d9] focus:ring-2 focus:ring-[#6d28d9]/10 transition-all" placeholder="Votre nom" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#64748b] mb-1.5">Email</label>
                    <input type="email" className="w-full px-4 py-2.5 rounded-xl border border-[#6d28d9]/10 text-sm focus:outline-none focus:border-[#6d28d9] focus:ring-2 focus:ring-[#6d28d9]/10 transition-all" placeholder="email@exemple.com" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#64748b] mb-1.5">Formation souhaitée</label>
                    <select className="w-full px-4 py-2.5 rounded-xl border border-[#6d28d9]/10 text-sm focus:outline-none focus:border-[#6d28d9] focus:ring-2 focus:ring-[#6d28d9]/10 transition-all bg-white text-[#1a1a2e]">
                      <option value="">Sélectionnez une formation</option>
                      <option value="anglais">Anglais</option>
                      <option value="francais">Français</option>
                      <option value="amazigh">Amazigh</option>
                      <option value="informatique">Informatique</option>
                      <option value="arabe">Arabe</option>
                      <option value="allemand">Allemand</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#64748b] mb-1.5">Message</label>
                    <textarea rows={4} className="w-full px-4 py-2.5 rounded-xl border border-[#6d28d9]/10 text-sm focus:outline-none focus:border-[#6d28d9] focus:ring-2 focus:ring-[#6d28d9]/10 transition-all resize-none" placeholder="Votre message..." />
                  </div>
                  <button
                    type="submit"
                    className="w-full inline-flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white shadow-lg shadow-[#f97316]/20 transition-all hover:shadow-xl hover:shadow-[#f97316]/30 hover:-translate-y-0.5 active:scale-[0.98]"
                    style={{ background: "linear-gradient(135deg, #f97316, #6d28d9)" }}
                  >
                    <Send className="h-4 w-4" />
                    Envoyer le message
                  </button>
                </form>
              </motion.div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#1a1a2e] text-white pt-16 pb-6">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-10 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden">
                  <img src="/logo.png" alt="ITRI Academy" className="h-full w-full object-cover" />
                </div>
                <div>
                  <span className="text-base font-bold">ITRI Academy</span>
                  <span className="block text-[10px] text-white/50 tracking-wider uppercase">École de langues</span>
                </div>
              </div>
              <p className="text-sm text-white/60 leading-relaxed max-w-xs">
                Centre de formation linguistique et informatique moderne à Draâ El Borj, Bouira.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-4">Formations</h4>
              <div className="space-y-2">
                {["Anglais", "Français", "Amazigh", "Informatique", "Arabe", "Allemand"].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm text-white/50">
                    <ChevronRight className="h-3 w-3 text-[#f97316]" />
                    {f}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-4">Contact</h4>
              <div className="space-y-3 text-sm text-white/50">
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#f97316] shrink-0" /> Draâ El Borj, Bouira</div>
                <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-[#f97316] shrink-0" /> +213 542 957 755</div>
                <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-[#f97316] shrink-0" /> contact@itri-academy.com</div>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-xs text-white/40">&copy; {new Date().getFullYear()} ITRI Academy. Tous droits réservés.</p>
            <div className="flex items-center gap-4 text-xs text-white/40">
              <Link href="/login" className="hover:text-white transition-colors">Connexion</Link>
              <Link href="#contact" className="hover:text-white transition-colors">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
