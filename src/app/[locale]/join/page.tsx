"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/routing";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

export default function JoinGenericPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const t = useTranslations("Common"); // Assuming you have some common translations, or we can hardcode

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length === 6) {
      router.push(`/join/${code.trim()}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--background)]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md mystery-box p-8 text-center"
      >
        <div className="text-6xl mb-6">🎲</div>
        <h1 className="text-3xl font-bold text-[var(--primary)] mb-4">الانضمام لمسابقة</h1>
        <p className="text-[var(--secondary)] mb-8">أدخل رمز المسابقة المكون من 6 أرقام للبدء</p>
        
        <form onSubmit={handleJoin} className="flex flex-col gap-4">
          <input 
            type="text" 
            placeholder="مثال: 123456" 
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={6}
            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-4 py-4 text-center font-bold tracking-[0.5em] text-2xl focus:outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
          />
          <button 
            type="submit"
            disabled={code.trim().length !== 6}
            className="w-full mystery-button-solid py-4 mt-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            دخول
          </button>
        </form>

        <button 
          onClick={() => router.push("/dashboard")}
          className="mt-6 text-sm text-[var(--secondary)] hover:text-[var(--primary)] transition-colors"
        >
          العودة للغرفة الرئيسية
        </button>
      </motion.div>
    </div>
  );
}
