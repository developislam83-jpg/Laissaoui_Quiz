"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "@/i18n/routing";
import { v4 as uuidv4 } from "uuid";
import { useTranslations } from "next-intl";

export default function JoinQuizPage({ params }: { params: Promise<{ code: string }> }) {
  const t = useTranslations("Common");
  const { code } = use(params);
  const router = useRouter();
  
  const [name, setName] = useState("");
  const [avatars, setAvatars] = useState<any[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState<string>("");

  useEffect(() => {
    fetch("/avatars.config.json")
      .then(res => res.json())
      .then(data => {
        setAvatars(data.avatars);
        if (data.avatars.length > 0) {
          setSelectedAvatar(data.avatars[0].image_url);
        }
      })
      .catch(err => console.error("Could not load avatars", err));
  }, []);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedAvatar) return;
    
    // Generate a unique peer ID for this participant
    const peerId = uuidv4();
    
    // Pass them in query params (or Zustand, but query params is robust across refreshes if handled well)
    // Actually, local storage is better for participant session.
    sessionStorage.setItem("quiz_peerId", peerId);
    sessionStorage.setItem("quiz_name", name.trim());
    sessionStorage.setItem("quiz_avatar", selectedAvatar);

    router.push(`/play/${code}`);
  };

  return (
    <div className="min-h-screen p-4 flex items-center justify-center bg-[var(--background)]">
      <div className="max-w-md w-full mystery-box p-8 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-[var(--primary)] shadow-[var(--shadow-glow)]"></div>
        <h1 className="text-2xl font-bold text-white mb-2">الانضمام للمسابقة</h1>
        <p className="text-[var(--secondary)] mb-8">أنت تنضم للمسابقة ذات الرمز: <span className="font-bold text-[var(--primary)] text-xl drop-shadow-[var(--shadow-glow-sm)]">{code}</span></p>
        
        <form onSubmit={handleJoin} className="space-y-6">
          <div>
            <label className="block mb-2 font-medium text-right text-[var(--secondary)]">اسمك</label>
            <input 
              type="text" 
              required
              placeholder="اكتب اسمك هنا"
              className="w-full p-4 text-lg rounded-lg bg-[var(--background)] border border-[var(--border)] focus:outline-none focus:border-[var(--primary)] transition-colors text-white"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block mb-4 font-medium text-right text-[var(--secondary)]">اختر صورتك الرمزية</label>
            <div className="grid grid-cols-4 gap-4">
              {avatars.map((avatar, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedAvatar(avatar.image_url)}
                  className={`p-2 rounded-xl transition-all ${selectedAvatar === avatar.image_url ? 'ring-2 ring-[var(--primary)] scale-110 bg-[var(--surface)] shadow-[var(--shadow-glow-sm)]' : 'opacity-50 hover:opacity-100 hover:scale-105 filter grayscale hover:grayscale-0'}`}
                >
                  <img src={avatar.image_url} alt={avatar.name} className="w-full h-auto drop-shadow-md" />
                </button>
              ))}
            </div>
          </div>

          <button 
            type="submit" 
            disabled={!name.trim() || !selectedAvatar}
            className="w-full mystery-button-solid py-4 font-bold text-xl mt-4 disabled:opacity-50"
          >
            دخول غرفة الانتظار
          </button>
        </form>
      </div>
    </div>
  );
}
