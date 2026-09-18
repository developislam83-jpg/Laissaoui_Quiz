"use client";

import { use, useEffect, useState, useRef } from "react";
import { useRouter } from "@/i18n/routing";
import { usePeerWebRTC } from "@/lib/webrtc/usePeerWebRTC";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase";

export default function PlaySessionPage({ params }: { params: Promise<{ code: string }> }) {
  const t = useTranslations("Common");
  const { code } = use(params);
  const router = useRouter();
  
  const [peerData, setPeerData] = useState<{ id: string, name: string, avatar: string, userId?: string } | null>(null);
  
  // Game State
  const [gameState, setGameState] = useState<"waiting_approval" | "lobby" | "playing" | "stage_break" | "results">("waiting_approval");
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [leaderboard, setLeaderboard] = useState<Record<string, any>>({});
  
  // Lobby Chat
  const [lobbyChat, setLobbyChat] = useState<any[]>([]);
  const [lobbyMsg, setLobbyMsg] = useState("");

  useEffect(() => {
    const id = sessionStorage.getItem("quiz_peerId");
    const name = sessionStorage.getItem("quiz_name");
    const avatar = sessionStorage.getItem("quiz_avatar");
    const userId = sessionStorage.getItem("quiz_userId"); // for friend requests
    
    if (!id || !name || !avatar) {
      router.push(`/join/${code}`);
      return;
    }
    setPeerData({ id, name, avatar, userId: userId || undefined });
  }, [code, router]);

  const { status, sendMessage, setOnMessage } = usePeerWebRTC(
    code, peerData?.id || "", peerData?.name || "", peerData?.avatar || ""
  );

  useEffect(() => {
    setOnMessage((msg) => {
      if (msg.type === "ADMITTED" && msg.peerId === peerData?.id) {
        setGameState("lobby");
      } else if (msg.type === "LOBBY_CHAT_UPDATE") {
        setLobbyChat(prev => [...prev, msg.message]);
      } else if (msg.type === "START_QUIZ") {
        setGameState("playing");
      } else if (msg.type === "QUESTION") {
        setGameState("playing");
        setCurrentQuestion(msg.payload);
        setTimeRemaining(msg.payload.timeLimit);
        setAnswered(false);
      } else if (msg.type === "STAGE_RESULTS") {
        setGameState("stage_break");
        setLeaderboard(msg.leaderboard);
      } else if (msg.type === "FINAL_RESULTS") {
        setGameState("results");
        setLeaderboard(msg.leaderboard);
      }
    });
  }, [setOnMessage, peerData]);

  // Timer logic
  useEffect(() => {
    if (gameState === "playing" && currentQuestion && timeRemaining > 0 && !answered) {
      const timer = setInterval(() => setTimeRemaining(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeRemaining === 0 && currentQuestion && !answered) {
      setAnswered(true);
    }
  }, [gameState, currentQuestion, timeRemaining, answered]);

  const handleAnswer = (optionId: string) => {
    if (answered || timeRemaining === 0) return;
    setAnswered(true);
    sendMessage({ type: "SUBMIT_ANSWER", optionId, timeRemaining });
  };

  const sendLobbyChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lobbyMsg.trim()) return;
    sendMessage({ type: "LOBBY_CHAT", senderName: peerData?.name, text: lobbyMsg });
    setLobbyMsg("");
  };

  const handleAddFriend = async (friendId: string) => {
    if (!peerData?.userId) return alert("سجل دخولك أولاً لإضافة الأصدقاء");
    await supabase.from('friendships').insert({ requester_id: peerData.userId, addressee_id: friendId, status: 'pending' });
    alert("تم إرسال طلب الصداقة!");
  };

  // Leaderboard sorting & animations
  const prevRanksRef = useRef<Record<string, number>>({});
  const [glowingPeers, setGlowingPeers] = useState<Record<string, boolean>>({});
  
  const sortedPeersList = Object.entries(leaderboard).map(([pId, stat]:any) => ({ pId, ...stat })).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return 0; // The actual names aren't in leaderboard dict, host has them. We just rely on points for participants, or we could pass the full list from host. We'll sort by points.
  });

  useEffect(() => {
    if (gameState !== 'stage_break' && gameState !== 'results') return;
    const currentRanks: Record<string, number> = {};
    const newGlowing: Record<string, boolean> = {};
    sortedPeersList.forEach((p, idx) => {
      currentRanks[p.pId] = idx;
      const prevRank = prevRanksRef.current[p.pId];
      if (prevRank !== undefined && idx < prevRank) newGlowing[p.pId] = true;
    });
    if (Object.keys(newGlowing).length > 0) {
      setGlowingPeers(prev => ({ ...prev, ...newGlowing }));
      setTimeout(() => setGlowingPeers({}), 3000);
    }
    prevRanksRef.current = currentRanks;
  }, [leaderboard, gameState]);


  if (!peerData) return null;

  if (gameState === "waiting_approval") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-[var(--background)]">
        <div className="w-full max-w-md mystery-box p-12 flex flex-col items-center">
          <img src={peerData.avatar} alt="Avatar" className="w-32 h-32 rounded-full mx-auto drop-shadow-[var(--shadow-glow)] mb-6 border-2 border-[var(--primary)]" />
          <h2 className="text-2xl font-bold mb-4">أهلاً بك، <span className="text-[var(--primary)]">{peerData.name}</span></h2>
          <p className="text-[var(--secondary)] flex items-center justify-center gap-2">
            <span className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></span>
            بانتظار موافقة المنظم للدخول للغرفة...
          </p>
        </div>
      </div>
    );
  }

  if (gameState === "lobby") {
    return (
      <div className="min-h-screen p-4 flex flex-col items-center bg-[var(--background)]">
        <div className="w-full max-w-2xl flex-1 flex flex-col gap-6 h-[85vh]">
           <div className="mystery-box p-6 border-[var(--border)] text-center">
             <h2 className="text-xl font-bold text-white mb-2">غرفة الانتظار</h2>
             <p className="text-[var(--secondary)] text-sm mb-4">المسابقة ستبدأ قريباً، يمكنك الدردشة مع المشاركين الآخرين...</p>
           </div>
           
           <div className="mystery-box p-6 border-[var(--border)] flex-1 flex flex-col overflow-hidden">
             <div className="flex-1 overflow-y-auto bg-[var(--surface)] p-4 rounded mb-4 space-y-3">
               {lobbyChat.map(msg => {
                 const isMe = msg.senderId === peerData.id;
                 return (
                   <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                     <span className="text-[10px] text-[var(--secondary)] mx-1 font-bold">{isMe ? 'أنت' : msg.senderName}</span>
                     <div className={`px-4 py-2 rounded-xl text-sm ${msg.senderId === 'HOST' ? 'bg-[var(--primary)] text-white' : isMe ? 'bg-[var(--surface)] border border-[var(--primary)]' : 'bg-[var(--background)] border border-[var(--border)]'}`}>
                       {msg.text}
                     </div>
                   </div>
                 );
               })}
             </div>
             <form onSubmit={sendLobbyChat} className="flex gap-2">
                <input type="text" value={lobbyMsg} onChange={e => setLobbyMsg(e.target.value)} placeholder="دردش مع الجميع..." className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm focus:border-[var(--primary)] outline-none" />
                <button type="submit" className="mystery-button-solid px-4">إرسال</button>
             </form>
           </div>
        </div>
      </div>
    );
  }

  if (gameState === "stage_break" || gameState === "results") {
    const myStat = leaderboard[peerData.id] || { points: 0, correct: 0, incorrect: 0 };
    const myRank = sortedPeersList.findIndex(p => p.pId === peerData.id) + 1;
    
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[var(--background)] relative overflow-hidden">
        {myRank === 1 && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-yellow-500/20 rounded-full blur-[100px] -z-10 pointer-events-none"></div>
        )}
        
        <div className="w-full max-w-md flex flex-col h-[80vh] mystery-box border-[var(--primary)] shadow-[var(--shadow-glow)]">
          <div className="p-8 text-center border-b border-[var(--border)]">
             <h1 className="text-3xl font-bold text-white mb-2 drop-shadow-[var(--shadow-glow-sm)]">
               {gameState === "results" ? "النتائج النهائية!" : "نهاية المرحلة!"}
             </h1>
             <div className="flex justify-around mt-4">
                <div className="flex flex-col"><span className="text-sm text-[var(--secondary)]">المركز</span><span className={`text-3xl font-black ${myRank === 1 ? 'text-yellow-400' : 'text-white'}`}>#{myRank}</span></div>
                <div className="flex flex-col"><span className="text-sm text-[var(--secondary)]">نقاطك</span><span className="text-3xl font-black text-[var(--primary)]">{myStat.points}</span></div>
             </div>
             <div className="flex justify-around mt-4 text-xs font-bold">
                <span className="text-green-500 bg-green-500/10 px-3 py-1 rounded">✅ {myStat.correct}</span>
                <span className="text-red-500 bg-red-500/10 px-3 py-1 rounded">❌ {myStat.incorrect}</span>
             </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[var(--surface)]/50 relative">
             <AnimatePresence>
               {sortedPeersList.map((stat, idx) => {
                 const isGlowing = glowingPeers[stat.pId];
                 const isMe = stat.pId === peerData.id;
                 return (
                   <motion.div key={stat.pId} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0, scale: isGlowing ? 1.05 : 1, boxShadow: isGlowing ? "0 0 20px var(--primary)" : "none", borderColor: isGlowing ? "var(--primary)" : "var(--border)" }} transition={{ type: "spring", stiffness: 300, damping: 20 }} className={`flex items-center gap-3 p-3 rounded-lg border ${isMe ? 'bg-[var(--primary)]/10 border-[var(--primary)]' : 'bg-[var(--background)]'}`}>
                     <div className="font-black text-[var(--secondary)] w-6 text-center">#{idx + 1}</div>
                     <div className="flex-1 font-bold text-white text-sm">{isMe ? peerData.name : `مشارك #${idx+1}`}</div>
                     <div className="font-black text-[var(--primary)]">{stat.points}</div>
                   </motion.div>
                 );
               })}
             </AnimatePresence>
          </div>
          
          {gameState === "results" && (
            <div className="p-4 bg-[var(--surface)] border-t border-[var(--border)]">
               <button onClick={() => router.push("/")} className="mystery-button-solid px-8 py-3 font-bold w-full text-lg">العودة للرئيسية</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Playing view
  if (!currentQuestion) return <div className="min-h-screen flex items-center justify-center text-white font-bold">تجهيز السؤال...</div>;

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 bg-[var(--background)]">
      <div className="w-full max-w-3xl flex justify-between items-center mb-12 mystery-box px-8 py-4 border-[var(--border)]">
        <span className="text-lg font-bold text-[var(--secondary)]">السؤال القادم</span>
        <div className={`text-3xl font-black ${timeRemaining <= 3 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
          {timeRemaining}s
        </div>
      </div>

      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-6">
        {currentQuestion.options.map((option: any) => (
          <button
            key={option.id}
            onClick={() => handleAnswer(option.id)}
            disabled={answered || timeRemaining === 0}
            className={`
              p-8 rounded-2xl text-xl font-bold border-2 transition-all duration-300 relative overflow-hidden group
              ${answered ? 'opacity-50 cursor-not-allowed scale-95' : 'hover:scale-105 shadow-lg'}
              bg-[var(--surface)] border-[var(--border)] text-white hover:border-[var(--primary)]
            `}
          >
            {option.text}
          </button>
        ))}
      </div>
      
      {answered && (
        <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} className="mt-12 text-2xl font-bold text-[var(--primary)] mystery-box px-12 py-6 border-[var(--primary)] shadow-[var(--shadow-glow)]">
          تم الإرسال! بانتظار البقية...
        </motion.div>
      )}
    </div>
  );
}
