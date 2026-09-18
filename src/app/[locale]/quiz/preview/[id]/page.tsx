"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { useAuth } from "@/components/AuthProvider";
import { db } from "@/lib/db";
import { use } from "react";
import { useTranslations } from "next-intl";

export default function QuizPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const t = useTranslations("Common");
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  
  const [quiz, setQuiz] = useState<any>(null);
  const [stages, setStages] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    loadQuiz();
  }, []);

  const loadQuiz = async () => {
    try {
      const q = await db.quizzes.get(id);
      if (!q) {
        router.push("/quiz/create");
        return;
      }
      
      const s = await db.stages.where("quizId").equals(id).sortBy("order");
      const sIds = s.map(st => st.id);
      
      const qs = await db.questions.where("stageId").anyOf(sIds).toArray();
      
      setQuiz(q);
      setStages(s);
      setQuestions(qs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLaunch = async () => {
    setLaunching(true);
    // Generate a 6-digit random code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    await db.quizzes.update(id, {
      code,
      status: "live",
      launchedAt: Date.now()
    });
    
    // Redirect to Host Session
    router.push(`/host/${code}`);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">{t("loading")}</div>;
  if (!quiz) return null;

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center">
      <div className="max-w-4xl w-full">
        
        <div className="neu-box p-8 text-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--primary-blue)] mb-2">{quiz.title}</h1>
          <p className="text-gray-500 mb-6">جاهزة للإطلاق! (الحالة: مسودة)</p>
          
          <div className="flex flex-wrap justify-center gap-6 mb-8">
            <div className="neu-box-inset px-6 py-3 rounded-lg text-center">
              <span className="block text-2xl font-bold text-[var(--primary-yellow)]">{stages.length}</span>
              <span className="text-sm text-gray-500">مراحل</span>
            </div>
            <div className="neu-box-inset px-6 py-3 rounded-lg text-center">
              <span className="block text-2xl font-bold text-[var(--primary-blue)]">{questions.length}</span>
              <span className="text-sm text-gray-500">سؤالاً</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => router.push(`/quiz/create/questions?quizId=${quiz.id}`)}
              className="neu-button px-8 py-4 font-bold text-gray-600"
            >
              تعديل الأسئلة
            </button>
            <button 
              onClick={handleLaunch}
              disabled={launching || stages.length === 0 || questions.length === 0}
              className="neu-button px-10 py-4 text-[var(--primary-blue)] font-bold text-xl disabled:opacity-50"
            >
              {launching ? "جاري الإطلاق..." : "إطلاق المسابقة الآن 🚀"}
            </button>
          </div>
        </div>

        {/* Detailed Review */}
        <h2 className="text-xl font-bold mb-4">نظرة عامة على المحتوى</h2>
        <div className="space-y-6">
          {stages.map((stage, idx) => (
            <div key={stage.id} className="neu-box p-6">
              <h3 className="text-lg font-bold text-[var(--primary-blue)] border-b border-gray-200 dark:border-gray-800 pb-3 mb-4">
                المرحلة {idx + 1}: {stage.name}
              </h3>
              
              <div className="space-y-3">
                {questions.filter(q => q.stageId === stage.id).map((q, qIdx) => (
                  <div key={q.id} className="p-4 bg-[var(--surface)] neu-box-inset rounded-lg">
                    <p className="font-bold mb-2">{qIdx + 1}. {q.text}</p>
                    <div className="text-sm text-gray-500 flex gap-4">
                      <span>{q.type === 'mcq' ? 'اختيار من متعدد' : 'صح/خطأ'}</span>
                      <span>|</span>
                      <span>{q.points} نقطة</span>
                      <span>|</span>
                      <span>{q.timeLimit} ثوانٍ</span>
                      {q.imageUrl && <span>| 🖼️ صورة</span>}
                      {q.audioUrl && <span>| 🎵 صوت</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
