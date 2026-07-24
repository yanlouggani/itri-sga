"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const formVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } },
};

function FloatingShape({ className, delay = 0 }: { className: string; delay?: number }) {
  return (
    <motion.div
      className={`absolute rounded-full ${className}`}
      animate={{
        y: [-15, 15, -15],
        rotate: [0, 8, -8, 0],
      }}
      transition={{
        duration: 5 + delay,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      toast.error("Erreur de connexion", { description: error.message });
      setLoading(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      toast.error("Impossible de récupérer vos informations");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", userData.user.id)
      .maybeSingle();

    setLoading(false);

    const target = profile?.role === "admin"
      ? "/dashboard"
      : profile?.role === "professor"
        ? "/professor/dashboard"
        : "/student/dashboard";
    router.push(target);
    router.refresh();
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-white">
      <motion.div
        className="pointer-events-none absolute inset-0"
        animate={{
          background: [
            "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(232,83,63,0.06) 0%, transparent 60%)",
            "radial-gradient(ellipse 80% 50% at 40% 0%, rgba(232,83,63,0.1) 0%, transparent 60%)",
            "radial-gradient(ellipse 70% 50% at 60% 0%, rgba(232,83,63,0.06) 0%, transparent 60%)",
            "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(232,83,63,0.08) 0%, transparent 60%)",
            "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(232,83,63,0.06) 0%, transparent 60%)",
          ],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      <FloatingShape className="-left-12 top-1/4 h-40 w-40 border-2 border-primary/10" delay={0} />
      <FloatingShape className="-right-12 top-1/3 h-32 w-32 border-2 border-primary/5" delay={1.2} />
      <FloatingShape className="bottom-1/4 left-1/4 h-24 w-24 bg-primary/5" delay={2.5} />

      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="absolute left-6 top-6"
      >
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-400 transition-colors hover:text-neutral-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Accueil
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mx-auto flex w-full max-w-sm flex-col gap-6 px-4"
      >
        <motion.div
          variants={itemVariants}
          className="flex flex-col items-center gap-2 text-center"
        >
          <motion.div
            animate={{ y: [-3, 3, -3] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <img src="/logo.png" alt="ITRI Academy" width={56} height={56} className="rounded-xl" />
          </motion.div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-neutral-900">ITRI Academy</h1>
            <p className="text-sm text-neutral-500">École de Langues et de Formation</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <Card className="border bg-white shadow-none" size="sm">
            <CardHeader>
              <CardTitle>Connexion</CardTitle>
              <CardDescription>Connectez-vous à votre espace</CardDescription>
            </CardHeader>
            <CardContent>
              <motion.form
                variants={formVariants}
                initial="hidden"
                animate="visible"
                onSubmit={handleLogin}
                className="space-y-3"
              >
                <motion.div variants={itemVariants} className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@itri-academy.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </motion.div>
                <motion.div variants={itemVariants} className="space-y-1.5">
                  <Label htmlFor="password">Mot de passe</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 transition-colors hover:text-neutral-600"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </motion.div>
                <motion.div variants={itemVariants}>
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Loader2 className="h-4 w-4" />
                        </motion.span>
                      ) : (
                        "Se connecter"
                      )}
                    </Button>
                  </motion.div>
                </motion.div>
              </motion.form>
            </CardContent>
          </Card>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-xs text-neutral-400"
        >
          ITRI Academy
        </motion.p>
      </motion.div>
    </div>
  );
}
