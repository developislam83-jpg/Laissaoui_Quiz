"use client";

import { use, useState, useEffect, useRef } from "react";
import { useRouter } from "@/i18n/routing";
import { useHostWebRTC } from "@/lib/webrtc/useHostWebRTC";
import { db } from "@/lib/db";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

export default function HostSessionPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  
  // Game State
  const [gameState, setGameState] = useState<"lobby" | "playing" | "stage_break" | "results">("lobby");
  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  
  // Leaderboard tracks { points, correct, incorrect }
  const [leaderboard, setLeaderboard] = useState<Record<string, { points: number, correct: number, incorrect: number }>>({});
  
  // Advanced Lobby Tracking
  const [admittedPeers, setAdmittedPeers] = useState<string[]>([]);
  const [lobbyChat, setLobbyChat] = useState<any[]>([]);
  const [lobbyMsg, setLobbyMsg] = useState("");

  const handlePeerMessage = (peerId: string, msg: any) => {
    if (msg.type === "SUBMIT_ANSWER") {
      const q = questions[currentQIndex];
      if (!q) return;
      
      const isCorrect = q.type === 'mcq' 
        ? q.options.find((o:any) => o.id === msg.optionId)?.isCorrect 
        : (msg.optionId === 'true' && q.options[0].isCorrect) || (msg.optionId === 'false' && q.options[1].isCorrect);
        
      setLeaderboard(prev => {
        const current = prev[peerId] || { points: 0, correct: 0, incorrect: 0 };
        if (isCorrect) {
          const ratio = msg.timeRemaining / q.timeLimit;
          const earned = Math.round(q.points * ratio);
          return { ...prev, [peerId]: { points: current.points + earned, correct: current.correct + 1, incorrect: current.incorrect } };
        } else {
          return { ...prev, [peerId]: { ...current, incorrect: current.incorrect + 1 } };
        }
      });
    } else if (msg.type === "LOBBY_CHAT") {
      // Broadcast to everyone
      const newMsg = { id: crypto.randomUUID(), senderId: peerId, senderName: msg.senderName, text: msg.text };
      setLobbyChat(prev => [...prev, newMsg]);
      broadcastMessage({ type: "LOBBY_CHAT_UPDATE", message: newMsg });
      
      // Save locally (IndexedDB)
      db.results.add({
        id: crypto.randomUUID(),
        quizId: quiz?.id || 'unknown',
        type: 'chat',
        content: newMsg,
        createdAt: Date.now()
      });
    }
  };

  const { peers, removePeer, broadcastMessage } = useHostWebRTC(code, handlePeerMessage);
  
  const connectedPeers = peers.filter(p => p.status === "connected");
  const pendingPeers = connectedPeers.filter(p => !admittedPeers.includes(p.peerId));
  const acceptedPeers = connectedPeers.filter(p => admittedPeers.includes(p.peerId));

  useEffect(() => {
    loadQuizData();
  }, []);

  const loadQuizData = async () => {
    const q = await db.quizzes.where("code").equals(code).first();
    if (q) {
      setQuiz(q);
      const s = await db.stages.where("quizId").equals(q.id).sortBy("order");
      const sIds = s.map(st => st.id);
      let qs: any[] = [];
      if (sIds.length > 0) {
        qs = await db.questions.where("stageId").anyOf(sIds).toArray();
        const opts = await db.options.where("questionId").anyOf(qs.map(q => q.id)).toArray();
        qs = qs.map(question => ({
          ...question,
          options: opts.filter(o => o.questionId === question.id).sort((a, b) => a.order - b.order)
        }));
      }
      setQuestions(qs.sort((a, b) => a.order - b.order));
    }
  };

  const handleAdmit = (peerId: string) => {
    setAdmittedPeers(prev => [...prev, peerId]);
    broadcastMessage({ type: "ADMITTED", peerId }); // Client checks if it matches them
  };

  const handleHostSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lobbyMsg.trim()) return;
    const newMsg = { id: crypto.randomUUID(), senderId: "HOST", senderName: "المنظم", text: lobbyMsg };
    setLobbyChat(prev => [...prev, newMsg]);
    broadcastMessage({ type: "LOBBY_CHAT_UPDATE", message: newMsg });
    setLobbyMsg("");
  };

  const handleStart = () => {
    setGameState("playing");
    broadcastMessage({ type: "START_QUIZ" });
    setTimeout(() => { broadcastQuestion(0); }, 500);
  };

  const broadcastQuestion = (index: number) => {
    const q = questions[index];
    if (!q) {
      handleEndQuiz();
      return;
    }
    
    // Check if we changed stage!
    const currQ = questions[currentQIndex];
    if (gameState === "playing" && currQ && currQ.stageId !== q.stageId && index > currentQIndex) {
      setGameState("stage_break");
      broadcastMessage({ type: "STAGE_RESULTS", leaderboard });
      return;
    }

    setCurrentQIndex(index);
    setGameState("playing");
    broadcastMessage({
      type: "QUESTION",
      payload: {
        id: q.id, text: q.text, type: q.type, timeLimit: q.timeLimit, points: q.points,
        options: q.options?.map((o: any) => ({ id: o.id, text: o.text })) || [],
      }
    });
  };

  const handleNext = () => {
    if (gameState === "stage_break") {
      broadcastQuestion(currentQIndex + 1); // Resume next stage
    } else {
      broadcastQuestion(currentQIndex + 1);
    }
  };
  
  const handlePrev = () => broadcastQuestion(Math.max(0, currentQIndex - 1));

  // Sorting: Alphabetical (Arabic) if points are 0, else by points
  const sortedPeers = [...acceptedPeers].sort((a, b) => {
    const statA = leaderboard[a.peerId] || { points: 0 };
    const statB = leaderboard[b.peerId] || { points: 0 };
    
    if (statB.points !== statA.points) return statB.points - statA.points;
    return a.name.localeCompare(b.name, 'ar-SA');
  });

  const prevRanksRef = useRef<Record<string, number>>({});
  const [glowingPeers, setGlowingPeers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (gameState === 'lobby') return; // Don't animate in lobby

    const currentRanks: Record<string, number> = {};
    const newGlowing: Record<string, boolean> = {};
    
    sortedPeers.forEach((p, idx) => {
      currentRanks[p.peerId] = idx;
      const prevRank = prevRanksRef.current[p.peerId];
      if (prevRank !== undefined && idx < prevRank) {
        newGlowing[p.peerId] = true;
      }
    });
    
    if (Object.keys(newGlowing).length > 0) {
      setGlowingPeers(prev => ({ ...prev, ...newGlowing }));
      setTimeout(() => {
        setGlowingPeers(prev => {
          const reset = { ...prev };
          Object.keys(newGlowing).forEach(k => delete reset[k]);
          return reset;
        });
      }, 3000);
    }
    prevRanksRef.current = currentRanks;
  }, [leaderboard, gameState]);

  const handleEndQuiz = async () => {
    setGameState("results");
    broadcastMessage({ type: "FINAL_RESULTS", leaderboard });
    if (quiz) {
      try {
        await db.quizzes.update(quiz.id, { status: 'finished' });
        await db.results.add({
          id: crypto.randomUUID(), quizId: quiz.id, type: 'final', standings: leaderboard, createdAt: Date.now()
        });
      } catch (err) {}
    }
  };

  if (gameState === "lobby") {
    return (
      <div className="min-h-screen p-4 md:p-8 flex flex-col md:flex-row gap-6 bg-[var(--background)]">
        {/* Left Side: Quiz Info & Waitlist */}
        <div className="flex-1 flex flex-col gap-6">
          <div className="mystery-box p-8 border-[var(--border)] relative">
            <h1 className="text-3xl font-bold text-white mb-2">{quiz?.title || 'جاري التحميل...'}</h1>
            {quiz?.description && <p className="text-[var(--secondary)] italic mb-6">{quiz.description}</p>}
            
            <div className="flex items-center gap-4 bg-[var(--surface)] p-4 rounded-lg border border-[var(--border)] w-fit mb-6">
              <span className="text-2xl font-black text-[var(--primary)]">{code}</span>
              <button onClick={() => {
                const url = window.location.href.replace('/host/', '/join/');
                navigator.clipboard.writeText(url).catch(() => prompt("انسخ الرابط:", url));
              }} className="text-xs bg-[var(--primary)] text-white px-3 py-1 rounded">نسخ الرابط</button>
            </div>

            <button onClick={handleStart} disabled={acceptedPeers.length === 0} className="mystery-button-solid px-8 py-3 text-lg font-bold disabled:opacity-50 w-full md:w-auto">
              ابدأ المسابقة
            </button>
          </div>

          <div className="mystery-box p-6 border-[var(--border)] flex-1">
            <h2 className="text-xl font-bold text-white mb-4">قائمة الانتظار ({pendingPeers.length})</h2>
            <div className="grid grid-cols-2 gap-4">
              {pendingPeers.map(p => (
                <div key={p.peerId} className="flex justify-between items-center bg-[var(--surface)] p-3 rounded border border-[var(--border)]">
                  <span className="font-bold truncate">{p.name}</span>
                  <button onClick={() => handleAdmit(p.peerId)} className="bg-green-500/20 text-green-500 hover:bg-green-500 hover:text-white px-2 py-1 rounded text-xs font-bold transition-colors">إدخال</button>
                </div>
              ))}
              {pendingPeers.length === 0 && <p className="text-sm text-[var(--secondary)]">لا يوجد متسابقين في الانتظار...</p>}
            </div>
          </div>
        </div>

        {/* Right Side: Admitted Peers & Chat */}
        <div className="w-full md:w-[450px] flex flex-col gap-6">
          <div className="mystery-box p-6 border-[var(--border)] max-h-64 overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-4">المقبولين ({acceptedPeers.length})</h2>
            <div className="flex flex-col gap-2">
              {acceptedPeers.map(p => (
                <div key={p.peerId} className="flex items-center gap-3 bg-[var(--surface)] p-2 rounded">
                  <img src={p.avatarUrl} className="w-8 h-8 rounded-full" />
                  <span className="font-bold flex-1 truncate">{p.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mystery-box p-6 border-[var(--border)] flex-1 flex flex-col">
            <h2 className="text-xl font-bold text-white mb-4">دردشة الغرفة</h2>
            <div className="flex-1 overflow-y-auto bg-[var(--surface)] p-4 rounded mb-4 space-y-3">
              {lobbyChat.map(msg => (
                <div key={msg.id} className={`flex flex-col ${msg.senderId === 'HOST' ? 'items-end' : 'items-start'}`}>
                  <span className="text-[10px] text-[var(--secondary)] mx-1">{msg.senderName}</span>
                  <div className={`px-3 py-2 rounded-xl text-sm ${msg.senderId === 'HOST' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--background)] border border-[var(--border)]'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handleHostSendChat} className="flex gap-2">
              <input type="text" value={lobbyMsg} onChange={e => setLobbyMsg(e.target.value)} placeholder="اكتب..." className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm focus:border-[var(--primary)] outline-none" />
              <button type="submit" className="mystery-button px-4">إرسال</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Live Game View (Playing or Stage Break)
  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8 bg-[var(--background)] relative">
      <div className="mystery-box p-6 flex justify-between items-center mb-8 sticky top-4 z-50 bg-[var(--surface)]/95 backdrop-blur">
        <h1 className="text-2xl font-bold text-white drop-shadow-[var(--shadow-glow-sm)]">{quiz?.title}</h1>
        <div className="flex gap-4">
          <button onClick={handlePrev} disabled={currentQIndex === 0} className="px-6 py-2 font-bold border border-[var(--border)] rounded-lg hover:border-white transition-colors disabled:opacity-50">السابق</button>
          <button onClick={handleNext} className="mystery-button px-6 py-2 font-bold text-[var(--primary)]">
            {currentQIndex === questions.length - 1 ? "إنهاء وإعلان النتائج" : (gameState === "stage_break" ? "بدء المرحلة القادمة" : "السؤال التالي")}
          </button>
        </div>
      </div>

      <div className="flex-1 grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 mystery-box p-8 flex flex-col justify-center items-center text-center relative overflow-hidden border-[var(--border)]">
          {gameState === "stage_break" ? (
             <div className="flex flex-col items-center">
               <h2 className="text-4xl font-black text-[var(--primary)] drop-shadow-[var(--shadow-glow)] mb-6">انتهت المرحلة!</h2>
               <p className="text-[var(--secondary)] text-xl">النتائج تظهر الآن للمتسابقين، اضغط (بدء المرحلة القادمة) للمتابعة.</p>
             </div>
          ) : gameState === "results" ? (
             <div className="flex flex-col items-center">
               <h2 className="text-5xl font-black text-white drop-shadow-[var(--shadow-glow)] mb-8">انتهت المسابقة!</h2>
               <button onClick={() => router.push("/dashboard")} className="mystery-button px-8 py-4 font-bold text-lg">العودة للرئيسية</button>
             </div>
          ) : (
            <>
              <span className="text-[var(--primary)] font-bold mb-4 drop-shadow-[var(--shadow-glow-sm)]">السؤال {currentQIndex + 1} من {questions.length}</span>
              <h2 className="text-4xl font-black mb-12 text-white leading-relaxed">{questions[currentQIndex]?.text}</h2>
              <div className="grid grid-cols-2 gap-4 w-full max-w-lg opacity-50 pointer-events-none">
                 <p className="col-span-2 text-[var(--secondary)] border border-[var(--border)] p-4 rounded-lg bg-[var(--background)]">الخيارات في شاشات المتسابقين...</p>
              </div>
            </>
          )}
        </div>

        {/* Live Leaderboard Sidebar */}
        <div className="md:col-span-1 mystery-box p-6 h-[75vh] overflow-y-auto border-[var(--border)] relative bg-[var(--surface)]/50">
          <h2 className="text-xl font-bold text-white mb-6 text-center border-b border-[var(--border)] pb-4 sticky top-0 bg-[var(--surface)] z-10 shadow-sm">الترتيب المباشر</h2>
          <div className="space-y-4">
            <AnimatePresence>
              {sortedPeers.map((peer, idx) => {
                const isGlowing = glowingPeers[peer.peerId];
                const stat = leaderboard[peer.peerId] || { points: 0, correct: 0, incorrect: 0 };
                return (
                  <motion.div 
                    key={peer.peerId} layout initial={{ opacity: 0, y: 20 }}
                    animate={{ 
                      opacity: 1, y: 0, scale: isGlowing ? 1.05 : 1,
                      boxShadow: isGlowing ? "0 0 20px var(--primary)" : "none",
                      borderColor: isGlowing ? "var(--primary)" : "var(--border)"
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="flex flex-col bg-[var(--background)] p-3 rounded-xl border border-[var(--border)] relative"
                  >
                    <div className="flex items-center gap-3">
                      <div className="font-black text-[var(--secondary)] w-6 text-center">#{idx + 1}</div>
                      <img src={peer.avatarUrl} className="w-10 h-10 rounded-full" />
                      <div className="flex-1 font-bold truncate text-white">{peer.name}</div>
                      <div className="font-black text-[var(--primary)]">{stat.points} <span className="text-[10px] font-normal">نقطة</span></div>
                    </div>
                    <div className="flex gap-4 mt-2 text-[10px] text-[var(--secondary)] ml-9 border-t border-[var(--border)] pt-1">
                       <span className="text-green-500">صح: {stat.correct}</span>
                       <span className="text-red-500">خطأ: {stat.incorrect}</span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
