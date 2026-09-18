"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/routing";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "@/components/AuthProvider";
import { useTranslations } from "next-intl";

export default function CreateQuizPage() {
  const t = useTranslations("Common");
  const router = useRouter();
  const { user } = useAuth();
  
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !user) return;
    
    setSaving(true);
    const quizId = uuidv4();
    
    await db.quizzes.add({
      id: quizId,
      title: title.trim(),
      status: "draft",
      createdAt: Date.now(),
    });

    router.push(`/quiz/create/stages?quizId=${quizId}`);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex items-center justify-center bg-[var(--background)]">
      <div className="w-full max-w-2xl mystery-box p-8">
        
        <h1 className="text-3xl font-bold text-[var(--primary)] mb-8 border-b border-[var(--border)] pb-4">المرحلة الأولى: إعداد المسابقة</h1>
        
        <form onSubmit={handleNext} className="space-y-6">
          <div>
            <label className="block mb-2 font-bold text-[var(--secondary)]">اسم المسابقة أو عنوانها</label>
            <input 
              type="text" 
              required
              placeholder="مثال: اختبار الذكاء المرعب"
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-4 py-4 text-lg focus:outline-none focus:border-[var(--primary)] transition-colors"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="flex justify-between items-center mt-12 pt-6 border-t border-[var(--border)]">
            <button 
              type="button"
              onClick={() => router.push("/dashboard")}
              className="px-6 py-3 font-bold text-[var(--secondary)] hover:text-white transition-colors"
            >
              إلغاء
            </button>
            <button 
              type="submit" 
              disabled={!title.trim()}
              className="mystery-button-solid px-8 py-3 disabled:opacity-50"
            >
              التالي (المراحل)
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
