"use client";

import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "@/i18n/routing";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

export default function LandingPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const t = useTranslations("Landing");

  return (
    <div className="min-h-screen flex flex-col bg-[#050505] text-[#e0e0e0] font-sans selection:bg-[var(--primary)] selection:text-white">
      
      {/* Floating Action Buttons */}
      <div className="absolute top-6 left-6 right-6 flex justify-end items-center z-50 pointer-events-none">
        <div className="flex gap-4 items-center pointer-events-auto">
          <LanguageSwitcher />
          
          {!isLoading && !user && (
            <>
              <button 
                onClick={() => router.push("/auth/login")}
                className="px-4 py-2 text-sm font-bold border border-[#2d3748] text-gray-300 rounded-lg hover:border-[var(--primary)] hover:text-white transition-colors bg-[#0a0a0a]/80 backdrop-blur-sm"
              >
                تسجيل الدخول
              </button>
              <button 
                onClick={() => router.push("/auth/signup")}
                className="hidden sm:block px-4 py-2 text-sm font-bold bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-opacity shadow-[var(--shadow-glow-sm)]"
              >
                إنشاء حساب
              </button>
            </>
          )}
        </div>
      </div>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 pt-32 text-center relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--primary)]/10 rounded-full blur-[100px] -z-10 pointer-events-none mt-16"></div>

        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-6xl md:text-8xl font-black mb-6 tracking-tighter"
        >
          Laissaoui<span className="text-[var(--primary)]">_</span>Quiz
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="max-w-2xl text-lg md:text-xl text-gray-400 mb-12 leading-relaxed"
        >
          {t("description")}
        </motion.p>

        <motion.button 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          onClick={() => router.push("/dashboard")}
          className="px-12 py-5 text-2xl font-black bg-[var(--primary)] text-white rounded-lg shadow-[var(--shadow-glow)] hover:opacity-90 transition-all uppercase tracking-widest relative overflow-hidden group"
        >
          <span className="relative z-10">{t("letsGo")}</span>
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
        </motion.button>
      </main>

      {/* User Reviews Section */}
      <section className="py-20 px-6 bg-[#0a0a0a] border-t border-[#2d3748]/30">
        <h2 className="text-3xl font-bold text-center mb-16 text-gray-300">{t("reviewsTitle")}</h2>
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
          {[
            { name: t("review1Name"), text: t("review1Text") },
            { name: t("review2Name"), text: t("review2Text") },
            { name: t("review3Name"), text: t("review3Text") }
          ].map((review, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2 }}
              key={i} 
              className="bg-[#121212] p-8 rounded-xl border border-[#2d3748] hover:border-[var(--primary)] transition-colors relative"
            >
              <div className="text-4xl absolute top-4 left-4 opacity-10 font-serif">"</div>
              <p className="text-gray-400 italic mb-6 relative z-10">{review.text}</p>
              <div className="font-bold text-[var(--primary)]">{review.name}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Professional Footer */}
      <footer className="bg-[#050505] py-12 px-6 border-t border-[#2d3748]/50 text-center text-sm text-gray-600">
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          <div className="text-2xl font-black tracking-widest text-gray-500 mb-6">Laissaoui_Quiz</div>
          <div className="flex gap-6 mb-8">
            <a href="#" className="hover:text-[var(--primary)] transition-colors">{t("footerAbout")}</a>
            <a href="#" className="hover:text-[var(--primary)] transition-colors">{t("footerTerms")}</a>
            <a href="#" className="hover:text-[var(--primary)] transition-colors">{t("footerPrivacy")}</a>
          </div>
          <p>{t("footerRights")}</p>
        </div>
      </footer>

    </div>
  );
}
