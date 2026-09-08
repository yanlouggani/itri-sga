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
import { Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } },
};

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
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#f8f9fc]">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[#6d28d9]/[0.04] blur-[150px]" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full bg-[#f97316]/[0.04] blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="absolute left-6 top-6 z-10"
      >
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-[#64748b] transition-colors hover:text-[#6d28d9]"
        >
          <ArrowLeft className="h-4 w-4" />
          Accueil
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 relative z-10"
      >
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center gap-3 text-center"
        >
          <motion.div
            animate={{ y: [-4, 4, -4] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <img src="/logo.png" alt="ITRI Academy" width={64} height={64} className="rounded-xl shadow-lg shadow-[#6d28d9]/10" />
          </motion.div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#1a1a2e]">ITRI Academy</h1>
            <p className="text-sm text-[#64748b]">École de Langues et de Formation</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <Card className="border border-[#6d28d9]/[0.06] bg-white shadow-xl shadow-[#6d28d9]/[0.04] relative overflow-hidden" size="sm">
            <div className="absolute top-0 left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-transparent via-[#f97316] to-transparent" />
            <CardHeader className="text-center">
              <CardTitle className="text-lg font-bold text-[#1a1a2e]">Connexion</CardTitle>
              <CardDescription className="text-[#64748b]">Connectez-vous à votre espace</CardDescription>
            </CardHeader>
            <CardContent>
              <motion.form
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
                }}
                onSubmit={handleLogin}
                className="space-y-4"
              >
                <motion.div variants={itemVariants} className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium text-[#64748b]">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@itri-academy.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    className="h-11 rounded-xl border-[#6d28d9]/10 focus:border-[#6d28d9] focus:ring-[#6d28d9]/10"
                  />
                </motion.div>
                <motion.div variants={itemVariants} className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-medium text-[#64748b]">Mot de passe</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-11 rounded-xl border-[#6d28d9]/10 focus:border-[#6d28d9] focus:ring-[#6d28d9]/10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] transition-colors hover:text-[#6d28d9]"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </motion.div>
                <motion.div variants={itemVariants}>
                  <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      type="submit"
                      className="w-full h-11 rounded-xl font-semibold text-white shadow-lg shadow-[#f97316]/20 hover:shadow-xl hover:shadow-[#f97316]/30 transition-all"
                      style={{ background: "linear-gradient(135deg, #f97316, #6d28d9)" }}
                      disabled={loading}
                    >
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

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex justify-center"
        >
          <motion.img
            src="/mascots/bonjour.png"
            alt="Mascotte ITRI qui vous salue"
            className="w-24 h-24 object-contain"
            animate={{ y: [-5, 5, -5], rotate: [0, -3, 0, 3, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center text-xs text-[#64748b]"
        >
          &copy; {new Date().getFullYear()} ITRI Academy — Tous droits réservés
        </motion.p>
      </motion.div>
    </div>
  );
}
