"use client";

import { use, useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { useHostWebRTC } from "@/lib/webrtc/useHostWebRTC";
import { useTranslations } from "next-intl";

export default function HostLobbyPage({ params }: { params: Promise<{ code: string }> }) {
  const t = useTranslations("Common");
  const { code } = use(params);
  const router = useRouter();
  
  const { peers, removePeer, broadcastMessage } = useHostWebRTC(code);

  const connectedPeers = peers.filter(p => p.status === "connected");

  const handleStartQuiz = () => {
    // Notify all peers to start and redirect them
    broadcastMessage({ type: "START_QUIZ" });
    // Redirect host to control panel
    router.push(`/host/control/${code}`);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center">
      <div className="max-w-4xl w-full">
        
        <div className="neu-box p-8 text-center mb-8">
          <h1 className="text-4xl font-bold text-[var(--primary-blue)] mb-4">غرفة الانتظار</h1>
          <p className="text-xl mb-6">شارك هذا الرمز مع المتسابقين للانضمام:</p>
          <div className="inline-block neu-box-inset px-10 py-6 text-6xl font-black text-[var(--primary-yellow)] tracking-widest rounded-xl mb-8">
            {code}
          </div>
          <p className="text-gray-500 mb-8">بانتظار انضمام اللاعبين...</p>
          
          <button 
            onClick={handleStartQuiz}
            disabled={connectedPeers.length === 0}
            className="neu-button px-12 py-4 text-[var(--primary-blue)] font-bold text-2xl disabled:opacity-50"
          >
            ابدأ المسابقة
          </button>
        </div>

        <div className="neu-box p-8">
          <h2 className="text-2xl font-bold mb-6">المتسابقون ({connectedPeers.length})</h2>
          
          {connectedPeers.length === 0 ? (
            <p className="text-gray-500 text-center py-8">لا يوجد متسابقون بعد.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {connectedPeers.map(peer => (
                <div key={peer.peerId} className="neu-box-inset p-4 flex flex-col items-center text-center relative group">
                  <button 
                    onClick={() => removePeer(peer.peerId)}
                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs"
                    title="حذف المتسابق"
                  >
                    ✕
                  </button>
                  <img src={peer.avatarUrl} alt={peer.name} className="w-16 h-16 rounded-full mb-3" />
                  <span className="font-bold truncate w-full">{peer.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
