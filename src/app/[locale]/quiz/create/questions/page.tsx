"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { useTranslations } from "next-intl";

type OptionData = { id: string, text: string, isCorrect: boolean };
type QuestionData = {
  id: string;
  stageId: string;
  type: 'mcq' | 'boolean';
  text: string;
  timeLimit: 5 | 10;
  points: number;
  imageUrl?: string;
  audioUrl?: string;
  options: OptionData[];
};

export default function QuizQuestionsPage() {
  const t = useTranslations("Common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const quizId = searchParams.get("quizId");
  
  const [stages, setStages] = useState<any[]>([]);
  const [selectedStage, setSelectedStage] = useState<string>("");
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  
  // Current Form State
  const [qType, setQType] = useState<'mcq'|'boolean'>('mcq');
  const [qText, setQText] = useState("");
  const [qTime, setQTime] = useState<5|10>(10);
  const [qPoints, setQPoints] = useState(100);
  const [qImage, setQImage] = useState("");
  const [qAudio, setQAudio] = useState("");
  const [mcqOptions, setMcqOptions] = useState<OptionData[]>([
    { id: uuidv4(), text: "", isCorrect: true },
    { id: uuidv4(), text: "", isCorrect: false },
    { id: uuidv4(), text: "", isCorrect: false },
    { id: uuidv4(), text: "", isCorrect: false },
  ]);
  const [boolCorrect, setBoolCorrect] = useState<boolean>(true);

  useEffect(() => {
    if (!quizId) {
      router.push("/quiz/create");
      return;
    }
    loadData();
  }, [quizId]);

  const loadData = async () => {
    if (!quizId) return;
    const stagesData = await db.stages.where("quizId").equals(quizId).sortBy("order");
    setStages(stagesData);
    if (stagesData.length > 0) setSelectedStage(stagesData[0].id);

    // load existing questions just in case (we'll store them in state)
    // For simplicity in this UI, we might just build an array in memory and save all on "Next"
  };

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qText.trim() || !selectedStage) return;

    let finalOptions: OptionData[] = [];
    if (qType === 'mcq') {
      if (mcqOptions.some(o => !o.text.trim())) {
         alert("يرجى تعبئة جميع الخيارات");
         return;
      }
      finalOptions = [...mcqOptions];
    } else {
      finalOptions = [
        { id: uuidv4(), text: "صح", isCorrect: boolCorrect },
        { id: uuidv4(), text: "خطأ", isCorrect: !boolCorrect },
      ];
    }

    const newQuestion: QuestionData = {
      id: uuidv4(),
      stageId: selectedStage,
      type: qType,
      text: qText.trim(),
      timeLimit: qTime,
      points: qPoints,
      imageUrl: qImage.trim() || undefined,
      audioUrl: qAudio.trim() || undefined,
      options: finalOptions
    };

    setQuestions([...questions, newQuestion]);
    
    // Reset form
    setQText("");
    setQImage("");
    setQAudio("");
    setMcqOptions([
      { id: uuidv4(), text: "", isCorrect: true },
      { id: uuidv4(), text: "", isCorrect: false },
      { id: uuidv4(), text: "", isCorrect: false },
      { id: uuidv4(), text: "", isCorrect: false },
    ]);
  };

  const setMcqCorrect = (id: string) => {
    setMcqOptions(mcqOptions.map(o => ({ ...o, isCorrect: o.id === id })));
  };

  const updateMcqText = (id: string, text: string) => {
    setMcqOptions(mcqOptions.map(o => o.id === id ? { ...o, text } : o));
  };

  const handleSaveAll = async () => {
    if (questions.length === 0 || !quizId) return;
    
    // Process insertions
    // 1. Get all stage IDs to clear old questions if re-editing
    const stageIds = stages.map(s => s.id);
    
    // Delete existing questions/options for these stages (simplified version)
    // Real app might need deeper cleanup, but for now we'll just insert
    
    let dbQuestions = [];
    let dbOptions = [];
    
    let orderCounter = 0;
    for (const q of questions) {
      dbQuestions.push({
        id: q.id,
        stageId: q.stageId,
        order: orderCounter++,
        type: q.type,
        text: q.text,
        timeLimit: q.timeLimit,
        points: q.points,
        imageUrl: q.imageUrl,
        audioUrl: q.audioUrl
      });
      
      let optOrder = 0;
      for (const o of q.options) {
        dbOptions.push({
          id: o.id,
          questionId: q.id,
          text: o.text,
          isCorrect: o.isCorrect,
          order: optOrder++
        });
      }
    }

    await db.questions.bulkAdd(dbQuestions);
    await db.options.bulkAdd(dbOptions);

    router.push(`/quiz/preview/${quizId}`);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Existing Questions Overview */}
        <div className="lg:col-span-1 mystery-box p-6 h-fit max-h-[80vh] overflow-y-auto">
          <h2 className="text-xl font-bold mb-4 text-[var(--primary)]">الأسئلة المضافة ({questions.length})</h2>
          {stages.map(stage => {
            const stageQs = questions.filter(q => q.stageId === stage.id);
            if (stageQs.length === 0) return null;
            return (
              <div key={stage.id} className="mb-4">
                <h3 className="font-bold text-[var(--secondary)] text-sm mb-2">{stage.name}</h3>
                <div className="space-y-2">
                  {stageQs.map((q, i) => (
                    <div key={q.id} className="p-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm">
                      <div className="font-bold truncate text-white">{i+1}. {q.text}</div>
                      <div className="text-xs text-[var(--secondary)] mt-1 flex justify-between">
                        <span>{q.type === 'mcq' ? 'اختيارات' : 'صح/خطأ'}</span>
                        <span>{q.points} نقطة - {q.timeLimit} ثوانٍ</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          
          <button 
            onClick={handleSaveAll}
            disabled={questions.length === 0}
            className="w-full mt-6 mystery-button py-3 font-bold disabled:opacity-50"
          >
            حفظ ومعاينة المسابقة
          </button>
        </div>

        {/* Right Side: Add Question Form */}
        <div className="lg:col-span-2 mystery-box p-6 md:p-8">
          <h1 className="text-2xl font-bold text-[var(--primary)] mb-6 border-b border-[var(--border)] pb-2">إضافة سؤال جديد</h1>
          
          <form onSubmit={handleAddQuestion} className="space-y-6">
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 font-medium text-sm text-[var(--secondary)]">اختر المرحلة</label>
                <select 
                  className="w-full p-3 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:outline-none focus:border-[var(--primary)] transition-colors text-[var(--foreground)]"
                  value={selectedStage}
                  onChange={e => setSelectedStage(e.target.value)}
                >
                  {stages.map(s => <option key={s.id} value={s.id} className="bg-[var(--surface)]">{s.name}</option>)}
                </select>
              </div>
              
              <div>
                <label className="block mb-2 font-medium text-sm text-[var(--secondary)]">نوع السؤال</label>
                <select 
                  className="w-full p-3 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:outline-none focus:border-[var(--primary)] transition-colors text-[var(--foreground)]"
                  value={qType}
                  onChange={e => setQType(e.target.value as any)}
                >
                  <option value="mcq" className="bg-[var(--surface)]">اختيار من متعدد</option>
                  <option value="boolean" className="bg-[var(--surface)]">صح / خطأ</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block mb-2 font-medium text-sm text-[var(--secondary)]">نص السؤال</label>
              <textarea 
                required
                rows={3}
                className="w-full p-3 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                value={qText}
                onChange={e => setQText(e.target.value)}
                placeholder="اكتب سؤالك هنا..."
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 font-medium text-sm text-[var(--secondary)]">الوقت المخصص</label>
                <select 
                  className="w-full p-3 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:outline-none focus:border-[var(--primary)] transition-colors text-[var(--foreground)]"
                  value={qTime}
                  onChange={e => setQTime(Number(e.target.value) as any)}
                >
                  <option value={10} className="bg-[var(--surface)]">10 ثوانٍ</option>
                  <option value={5} className="bg-[var(--surface)]">5 ثوانٍ</option>
                </select>
              </div>
              
              <div>
                <label className="block mb-2 font-medium text-sm text-[var(--secondary)]">النقاط الكاملة</label>
                <input 
                  type="number" 
                  min={10} step={10} required
                  className="w-full p-3 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                  value={qPoints}
                  onChange={e => setQPoints(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 font-medium text-sm text-[var(--secondary)]">رابط صورة (اختياري)</label>
                <input 
                  type="url" 
                  placeholder="https://..."
                  className="w-full p-3 text-left rounded-lg bg-[var(--background)] border border-[var(--border)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                  value={qImage}
                  onChange={e => setQImage(e.target.value)}
                  dir="ltr"
                />
              </div>
              
              <div>
                <label className="block mb-2 font-medium text-sm text-[var(--secondary)]">رابط صوت (اختياري)</label>
                <input 
                  type="url" 
                  placeholder="https://..."
                  className="w-full p-3 text-left rounded-lg bg-[var(--background)] border border-[var(--border)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                  value={qAudio}
                  onChange={e => setQAudio(e.target.value)}
                  dir="ltr"
                />
              </div>
            </div>

            {/* Answer Section */}
            <div className="pt-4 border-t border-[var(--border)]">
              <h3 className="font-bold mb-4 text-[var(--primary)]">الإجابات</h3>
              
              {qType === 'mcq' ? (
                <div className="space-y-3">
                  <p className="text-sm text-[var(--secondary)] mb-2">اكتب الخيارات واختر الدائرة للإجابة الصحيحة</p>
                  {mcqOptions.map((opt, i) => (
                    <div key={opt.id} className="flex items-center gap-3">
                      <input 
                        type="radio" 
                        name="correctAnswer" 
                        checked={opt.isCorrect}
                        onChange={() => setMcqCorrect(opt.id)}
                        className="w-5 h-5 accent-[var(--primary)]"
                      />
                      <input 
                        type="text" 
                        required
                        placeholder={`الخيار ${i + 1}`}
                        className={`flex-1 p-3 rounded-lg bg-[var(--background)] focus:outline-none transition-colors border ${opt.isCorrect ? 'border-[var(--primary)]' : 'border-[var(--border)]'}`}
                        value={opt.text}
                        onChange={e => updateMcqText(opt.id, e.target.value)}
                      />
                    </div>
                  ))}
                  {/* Future: allow adding more options dynamically if needed */}
                </div>
              ) : (
                <div className="flex gap-4">
                   <button
                     type="button"
                     onClick={() => setBoolCorrect(true)}
                     className={`flex-1 p-4 rounded-lg font-bold text-lg border transition-colors ${boolCorrect ? 'bg-green-500/20 text-green-500 border-green-500' : 'bg-[var(--background)] border-[var(--border)] text-[var(--secondary)]'}`}
                   >
                     صح
                   </button>
                   <button
                     type="button"
                     onClick={() => setBoolCorrect(false)}
                     className={`flex-1 p-4 rounded-lg font-bold text-lg border transition-colors ${!boolCorrect ? 'bg-red-500/20 text-red-500 border-red-500' : 'bg-[var(--background)] border-[var(--border)] text-[var(--secondary)]'}`}
                   >
                     خطأ
                   </button>
                </div>
              )}
            </div>

            <button 
              type="submit" 
              className="w-full mystery-button-solid py-4 font-bold text-lg mt-4"
            >
              إضافة السؤال للمرحلة
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
