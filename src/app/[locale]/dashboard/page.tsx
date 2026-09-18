"use client";

import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "@/i18n/routing";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { X, Trophy, MessageCircle, Layers, HelpCircle, Trash2 } from "lucide-react";
import { db } from "@/lib/db";

const HistoryCard = ({ record, onDelete }: { record: any, onDelete: (id: string) => void }) => {
  const [showModal, setShowModal] = useState(false);
  const [details, setDetails] = useState<any>(null);
  
  const allStandings = Object.entries(record.standings || {}).sort(([,a]:any, [,b]:any) => b - a);
  const displayStandings = allStandings.slice(0, 3);
  
  const loadFullDetails = async () => {
    if (!record.quizId) {
      alert("معرف المسابقة مفقود في هذا السجل.");
      return;
    }
    
    // Fetch quiz data (questions, stages)
    const quiz = await db.quizzes.where("id").equals(record.quizId).first();
    
    // Fetch chat for this quiz session (rough estimate: chat before this result)
    const allResults = await db.results.where("quizId").equals(record.quizId).toArray();
    
    // Find chats that happened before this final result
    const chats = allResults
      .filter(r => r.type === 'chat' && r.createdAt <= record.date)
      .sort((a, b) => a.createdAt - b.createdAt)
      .map(r => r.content);
      
    setDetails({ quiz, chats });
    setShowModal(true);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("هل أنت متأكد من مسح هذا السجل؟ لن تتمكن من استرجاعه.")) {
      await db.results.delete(record.resultId);
      onDelete(record.resultId);
    }
  };
  
  return (
    <>
      <div className="mystery-box p-5 border border-[var(--border)] flex flex-col h-full relative group">
        <button 
          onClick={handleDelete}
          className="absolute top-4 left-4 p-2 text-[var(--secondary)] hover:text-red-500 hover:bg-red-500/10 rounded-full opacity-0 group-hover:opacity-100 transition-all"
          title="مسح السجل"
        >
          <Trash2 size={18} />
        </button>
        <h3 className="font-bold text-lg text-[var(--primary)] mb-1 pr-6">{record.title}</h3>
        <p className="text-xs text-[var(--secondary)] mb-4">{new Date(record.date).toLocaleDateString()} {new Date(record.date).toLocaleTimeString()}</p>
        
        <div className="mb-4 flex-1">
          <h4 className="text-sm font-bold mb-2">أعلى المراكز:</h4>
          {displayStandings.map(([peer, score]: any, idx) => (
              <div key={peer} className="flex justify-between items-center text-sm bg-[var(--background)] p-1 px-2 rounded mb-1 border border-[var(--border)]">
                <span className="truncate max-w-[120px]"><span className="text-[var(--secondary)] text-xs ml-1">{idx + 1}.</span> {peer.split('-')[0]}</span>
                <span className="font-bold text-[var(--primary)]">{score}</span>
              </div>
          ))}
          {allStandings.length === 0 && (
            <div className="text-sm text-[var(--secondary)]">لا يوجد متسابقين</div>
          )}
        </div>
        
        <button 
          onClick={loadFullDetails} 
          className="mystery-button w-full py-2 text-sm mt-auto"
        >
          عرض التفاصيل
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-[var(--surface)] border border-[var(--primary)] rounded-2xl p-4 sm:p-6 max-w-3xl w-full sm:w-[95%] max-h-[90vh] overflow-y-auto shadow-[var(--shadow-glow)]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 sm:mb-6 border-b border-[var(--border)] pb-3 sm:pb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--primary)] pr-2">{record.title}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-[var(--background)] rounded-full transition-colors"><X size={20} className="sm:w-6 sm:h-6" /></button>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Standings Section */}
              <div className="bg-[var(--background)] p-4 rounded-xl border border-[var(--border)]">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Trophy size={18} className="text-yellow-500"/> ترتيب المتسابقين</h3>
                <div className="max-h-60 overflow-y-auto flex flex-col gap-2 pr-2">
                  {allStandings.map(([peer, score]: any, idx) => (
                    <div key={peer} className="flex justify-between items-center bg-[var(--surface)] p-2 rounded border border-[var(--border)]">
                      <span className="font-bold"><span className="text-[var(--secondary)] mr-2">{idx + 1}.</span> {peer.split('-')[0]}</span>
                      <span className="text-[var(--primary)] font-bold">{score} نقطة</span>
                    </div>
                  ))}
                  {allStandings.length === 0 && <p className="text-[var(--secondary)] text-sm">لا يوجد متسابقين</p>}
                </div>
              </div>

              {/* Chat Section */}
              <div className="bg-[var(--background)] p-4 rounded-xl border border-[var(--border)]">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><MessageCircle size={18} className="text-blue-500"/> دردشة ما قبل المسابقة</h3>
                <div className="max-h-60 overflow-y-auto flex flex-col gap-2 pr-2">
                  {details?.chats?.length > 0 ? (
                    details.chats.map((c: any, i: number) => (
                      <div key={i} className="text-sm bg-[var(--surface)] p-2 rounded">
                        <span className="font-bold text-[var(--primary)]">{c.senderName}: </span>
                        <span>{c.text}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[var(--secondary)] text-sm">لا توجد دردشة مسجلة لهذه المسابقة.</p>
                  )}
                </div>
              </div>

              {/* Stages and Questions Section */}
              <div className="bg-[var(--background)] p-4 rounded-xl border border-[var(--border)] md:col-span-2">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Layers size={18} className="text-green-500"/> محتوى المسابقة (المراحل والأسئلة)</h3>
                
                {details?.quiz?.stages ? (
                  <div className="flex flex-col gap-4">
                    {details.quiz.stages.map((stage: any, sIdx: number) => (
                      <div key={stage.id} className="border border-[var(--border)] rounded-lg overflow-hidden">
                        <div className="bg-[var(--surface)] p-3 font-bold border-b border-[var(--border)] text-[var(--primary)] flex justify-between">
                          <span>{stage.title}</span>
                          <span className="text-xs bg-[var(--background)] px-2 py-1 rounded">مرحلة {sIdx + 1}</span>
                        </div>
                        <div className="p-3 bg-[var(--background)]/50 flex flex-col gap-2">
                          {stage.questions.map((q: any, qIdx: number) => (
                            <div key={q.id} className="text-sm flex gap-2">
                              <HelpCircle size={16} className="text-[var(--secondary)] shrink-0 mt-0.5" />
                              <span>{q.question}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[var(--secondary)] text-sm">تفاصيل المسابقة غير متوفرة أو تم حذفها.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const t = useTranslations("Dashboard");
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const loadHistory = async () => {
      // Import dynamically to avoid SSR issues with Dexie
      const { db } = await import('@/lib/db');
      const allResults = await db.results.toArray();
      const results = allResults.filter((r: any) => r.type === 'final');
      const quizzes = await db.quizzes.toArray();
      
      const mapped = results.map(r => {
        const q = quizzes.find(quiz => quiz.id === r.quizId);
        return {
          resultId: r.id,
          quizId: r.quizId,
          title: q?.title || 'مسابقة بدون اسم',
          date: r.createdAt,
          standings: r.standings
        };
      }).sort((a, b) => b.date - a.date);
      
      setHistory(mapped);
    };
    loadHistory();
  }, [user]);

  const handleJoinClick = () => {
    router.push(`/join`);
  };

  const cards = [
    {
      id: "join",
      title: t("joinTitle"),
      description: t("joinDesc"),
      isAvailable: true,
      actionText: t("joinAction"),
      icon: "🎲",
      onClick: handleJoinClick
    },
    {
      id: "create",
      title: t("createTitle"),
      description: t("createDesc"),
      isAvailable: !!user,
      actionText: user ? t("createAction") : t("lockedAction"),
      icon: "📝",
      onClick: () => router.push("/quiz/create")
    },
    {
      id: "friends",
      title: t("friendsTitle"),
      description: t("friendsDesc"),
      isAvailable: !!user,
      actionText: user ? t("friendsAction") : t("lockedAction"),
      icon: "👥",
      onClick: () => router.push("/groups")
    },
    {
      id: "settings",
      title: t("settingsTitle"),
      description: t("settingsDesc"),
      isAvailable: !!user,
      actionText: user ? t("settingsAction") : t("lockedAction"),
      icon: "⚙️",
      onClick: () => router.push("/account")
    }
  ];

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300">
      


      {/* Main Content */}
      <main className="flex-1 p-6 md:p-12 max-w-7xl mx-auto w-full">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center md:text-right"
        >
          <h1 className="text-4xl md:text-5xl font-black mb-4">
            {t("welcomePrefix")} <span className="text-[var(--primary)]">{t("welcomeHighlight")}</span>
          </h1>
          <p className="text-xl text-[var(--secondary)]">
            {t("welcomeSub")}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {cards.map((card, idx) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className={`relative p-6 rounded-2xl border ${
                card.isAvailable 
                  ? 'bg-[var(--surface)] border-[var(--primary)]/50 hover:border-[var(--primary)] shadow-[var(--shadow-glow-sm)] hover:shadow-[var(--shadow-glow)] cursor-pointer' 
                  : 'bg-[var(--surface)]/50 border-[var(--border)] opacity-70 grayscale-[50%]'
              } transition-all flex flex-col h-full`}
              onClick={() => {
                if (card.isAvailable && card.onClick) card.onClick();
              }}
            >
              {!card.isAvailable && (
                <div className="absolute top-4 left-4 text-2xl opacity-50" title="مغلق">🔒</div>
              )}
              
              <div className="text-5xl mb-6">{card.icon}</div>
              <h3 className="text-2xl font-bold mb-3">{card.title}</h3>
              <p className="text-[var(--secondary)] mb-8 flex-1 leading-relaxed">{card.description}</p>
              
              <button 
                className={`mt-auto w-full py-3 ${card.isAvailable ? 'mystery-button-solid' : 'bg-[var(--background)] text-[var(--secondary)] rounded-lg border border-[var(--border)] font-bold cursor-not-allowed'}`}
                disabled={!card.isAvailable}
              >
                {card.actionText}
              </button>
            </motion.div>
          ))}
        </div>

        {/* Quiz History Section */}
        {user && history.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="w-full"
          >
            <h2 className="text-2xl font-bold mb-6 text-[var(--primary)] border-b border-[var(--border)] pb-2 flex items-center gap-2">
              <span>★</span> سجل المسابقات السابقة
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {history.map((record: any) => (
                <HistoryCard 
                  key={record.resultId} 
                  record={record} 
                  onDelete={(id) => setHistory(prev => prev.filter(r => r.resultId !== id))}
                />
              ))}
            </div>
          </motion.div>
        )}
      </main>

    </div>
  );
}
