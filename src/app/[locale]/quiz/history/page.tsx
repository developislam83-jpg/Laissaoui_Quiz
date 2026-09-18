"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/routing";
import { db } from "@/lib/db";
import { useTranslations } from "next-intl";

export default function QuizHistoryPage() {
  const t = useTranslations("Common");
  const router = useRouter();
  
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const allQuizzes = await db.quizzes.reverse().sortBy("createdAt");
      setQuizzes(allQuizzes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">{t("loading")}</div>;

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl">
        
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--primary-blue)]">سجل المسابقات</h1>
          <button 
            onClick={() => router.push("/")}
            className="neu-button px-6 py-2 font-bold text-gray-500"
          >
            العودة للرئيسية
          </button>
        </div>

        {quizzes.length === 0 ? (
          <div className="neu-box p-12 text-center text-gray-500">
            لا توجد مسابقات سابقة. قم بإنشاء مسابقتك الأولى!
          </div>
        ) : (
          <div className="grid gap-4">
            {quizzes.map((quiz) => (
              <div key={quiz.id} className="neu-box p-6 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                  <h3 className="text-xl font-bold mb-2">{quiz.title}</h3>
                  <div className="flex gap-4 text-sm text-gray-500">
                    <span>التاريخ: {new Date(quiz.createdAt).toLocaleDateString()}</span>
                    <span>الحالة: {quiz.status === 'live' ? 'بُثت' : 'مسودة'}</span>
                    {quiz.code && <span>الرمز: {quiz.code}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => router.push(`/quiz/preview/${quiz.id}`)}
                    className="neu-button px-6 py-2 font-bold text-[var(--primary-blue)]"
                  >
                    عرض / إطلاق
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
