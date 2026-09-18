"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "@/i18n/routing";
import { usePeerWebRTC } from "@/lib/webrtc/usePeerWebRTC";
import { useTranslations } from "next-intl";

export default function WaitingRoomPage({ params }: { params: Promise<{ code: string }> }) {
  const t = useTranslations("Common");
  const { code } = use(params);
  const router = useRouter();
  
  const [peerData, setPeerData] = useState<{ id: string, name: string, avatar: string } | null>(null);

  useEffect(() => {
    const id = sessionStorage.getItem("quiz_peerId");
    const name = sessionStorage.getItem("quiz_name");
    const avatar = sessionStorage.getItem("quiz_avatar");
    
    if (!id || !name || !avatar) {
      router.push(`/join/${code}`);
      return;
    }
    
    setPeerData({ id, name, avatar });
  }, [code, router]);

  // Hook works conditionally based on peerData existing
  const { status, setOnMessage } = usePeerWebRTC(
    code, 
    peerData?.id || "", 
    peerData?.name || "", 
    peerData?.avatar || ""
  );

  useEffect(() => {
    setOnMessage((msg) => {
      if (msg.type === "START_QUIZ") {
        router.push(`/play/${code}`);
      }
    });
  }, [setOnMessage, code, router]);

  if (!peerData) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
      <div className="w-full max-w-md neu-box p-12 flex flex-col items-center">
        
        <div className="relative mb-8">
          <img src={peerData.avatar} alt="Avatar" className="w-32 h-32 rounded-full mx-auto drop-shadow-xl z-10 relative" />
          {status === "connected" && (
             <div className="absolute top-0 right-0 w-8 h-8 bg-green-500 rounded-full border-4 border-[var(--surface)] z-20"></div>
          )}
        </div>

        <h2 className="text-2xl font-bold mb-2">أهلاً بك، {peerData.name}</h2>
        
        {status === "connecting" ? (
          <p className="text-gray-500 flex items-center justify-center gap-2">
            <span className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></span>
            جاري الاتصال بالمضيف...
          </p>
        ) : status === "connected" ? (
          <p className="text-green-600 font-bold flex items-center justify-center gap-2">
            تم الاتصال! بانتظار بدء المسابقة...
          </p>
        ) : (
          <p className="text-red-500 font-bold flex items-center justify-center gap-2">
            فقد الاتصال بالمضيف. يرجى إعادة المحاولة.
          </p>
        )}
        
      </div>
    </div>
  );
}
