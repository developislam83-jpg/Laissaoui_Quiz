"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/routing";
import { useTransition, useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const LANGUAGES = [
  { code: 'ar', label: 'العربية' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
];

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = LANGUAGES.find(l => l.code === locale) || LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (nextLocale: string) => {
    setIsOpen(false);
    if (nextLocale === locale) return;
    
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  };

  return (
    <div className="relative w-28" ref={dropdownRef} dir="ltr">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className={`w-full px-2 py-2 text-sm font-bold border rounded-lg transition-all focus:outline-none 
          ${isOpen ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white'}
          ${isPending ? 'opacity-50 cursor-wait' : ''}`}
      >
        {currentLang.label}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 w-full left-0 bg-[#0a0a0a]/95 backdrop-blur-lg border border-[var(--primary)] rounded-xl shadow-[var(--shadow-glow-sm)] overflow-hidden z-50 flex flex-col"
          >
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleSelect(lang.code)}
                className={`px-4 py-3 text-sm font-bold text-center transition-colors 
                  ${locale === lang.code ? 'bg-[var(--primary)] text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
              >
                {lang.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
