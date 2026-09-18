"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { useTranslations } from "next-intl";

export default function QuizStagesPage() {
  const t = useTranslations("Common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const quizId = searchParams.get("quizId");
  
  const [stages, setStages] = useState<{id: string, name: string}[]>([]);
  const [currentName, setCurrentName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!quizId) {
      router.push("/quiz/create");
      return;
    }
    loadExistingStages();
  }, [quizId]);

  const loadExistingStages = async () => {
    if (!quizId) return;
    const existing = await db.stages.where("quizId").equals(quizId).sortBy("order");
    setStages(existing.map(s => ({ id: s.id, name: s.name })));
    setLoading(false);
  };

  const handleAddStage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentName.trim()) return;
    
    setStages([...stages, { id: uuidv4(), name: currentName.trim() }]);
    setCurrentName("");
  };

  const handleRemoveStage = (id: string) => {
    setStages(stages.filter(s => s.id !== id));
  };

  const handleNext = async () => {
    if (stages.length === 0 || !quizId) return;
    setLoading(true);

    // Save stages to IndexedDB
    // First clear existing stages for this quiz to avoid duplicates on back-and-forth
    await db.stages.where("quizId").equals(quizId).delete();
    
    const stagesToInsert = stages.map((s, index) => ({
      id: s.id,
      quizId,
      name: s.name,
      order: index,
    }));
    
    await db.stages.bulkAdd(stagesToInsert);
    router.push(`/quiz/create/questions?quizId=${quizId}`);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">{t("loading")}</div>;

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center bg-[var(--background)]">
      <div className="max-w-2xl w-full mystery-box p-8">
        <h1 className="text-3xl font-bold text-[var(--primary)] mb-2 border-b border-[var(--border)] pb-4">إضافة المراحل</h1>
        <p className="text-[var(--secondary)] mb-8">خطوة 2: قسّم مسابقتك إلى مراحل (مثال: الجولة الأولى، جولة السرعة...)</p>
        
        <form onSubmit={handleAddStage} className="flex gap-4 mb-8">
          <input 
            type="text" 
            placeholder="اسم المرحلة الجديدة"
            className="flex-1 p-3 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:outline-none focus:border-[var(--primary)] transition-colors"
            value={currentName}
            onChange={(e) => setCurrentName(e.target.value)}
          />
          <button 
            type="submit" 
            disabled={!currentName.trim()}
            className="mystery-button-solid px-6 font-bold disabled:opacity-50"
          >
            إضافة
          </button>
        </form>

        <div className="space-y-4 mb-12">
          {stages.length === 0 ? (
            <div className="text-center p-8 text-[var(--secondary)] bg-[var(--background)] border border-dashed border-[var(--border)] rounded-xl">
              لا توجد مراحل بعد. أضف المرحلة الأولى للبدء.
            </div>
          ) : (
            stages.map((stage, idx) => (
              <div key={stage.id} className="flex justify-between items-center p-4 bg-[var(--surface)] border border-[var(--border)] rounded-lg">
                <span className="font-bold">{idx + 1}. {stage.name}</span>
                <button 
                  onClick={() => handleRemoveStage(stage.id)}
                  className="text-red-500 font-bold px-3 py-1 bg-red-500/10 border border-red-500/30 rounded hover:bg-red-500 hover:text-white transition-colors"
                >
                  حذف
                </button>
              </div>
            ))
          )}
        </div>

        <div className="flex gap-4 border-t border-[var(--border)] pt-6">
          <button 
            onClick={() => router.back()}
            className="mystery-button px-6 py-3 font-bold text-[var(--secondary)]"
          >
            السابق
          </button>
          <button 
            onClick={handleNext}
            disabled={stages.length === 0}
            className="flex-1 mystery-button-solid py-3 font-bold text-xl disabled:opacity-50"
          >
            التالي (الأسئلة)
          </button>
        </div>
      </div>
    </div>
  );
}
