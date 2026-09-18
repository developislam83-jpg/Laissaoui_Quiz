"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { useRouter } from "@/i18n/routing";

export default function AccountPage() {
  const { user, dbUser } = useAuth();
  const router = useRouter();
  
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    if (dbUser) setName(dbUser.name || "");
  }, [dbUser]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: "", type: "" });

    try {
      // Update Name in public.users
      if (name && name !== dbUser?.name) {
        const { error } = await supabase
          .from("users")
          .update({ name })
          .eq("id", user?.id);
        
        if (error) throw error;
      }

      // Update Password in auth if provided
      if (password) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
      }

      setMessage({ text: "تم تحديث البيانات بنجاح!", type: "success" });
      setPassword(""); // Clear password field
    } catch (err: any) {
      setMessage({ text: err.message || "حدث خطأ أثناء التحديث", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center">جاري التحميل...</div>;

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center bg-[var(--background)] text-[var(--foreground)]">
      <div className="w-full max-w-md mystery-box p-8">
        
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--primary)]">الإعدادات</h1>
          <button 
            onClick={() => router.push("/dashboard")}
            className="text-[var(--secondary)] hover:text-[var(--primary)] transition-colors"
          >
            العودة
          </button>
        </div>

        {message.text && (
          <div className={`p-4 rounded-lg mb-6 text-sm font-bold border ${message.type === 'error' ? 'bg-red-500/10 border-red-500 text-red-500' : 'bg-green-500/10 border-green-500 text-green-500'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleUpdate} className="flex flex-col gap-6">
          <div>
            <label className="block mb-2 font-bold text-[var(--secondary)]">الاسم السري</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-4 py-3 focus:outline-none focus:border-[var(--primary)] transition-colors"
            />
          </div>

          <div>
            <label className="block mb-2 font-bold text-[var(--secondary)]">البريد الإلكتروني</label>
            <input 
              type="email" 
              value={user.email || ""}
              disabled
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-4 py-3 opacity-50 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block mb-2 font-bold text-[var(--secondary)]">تغيير كلمة المرور</label>
            <input 
              type="password" 
              placeholder="اترك الحقل فارغاً إذا لم ترغب بتغييرها"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-4 py-3 focus:outline-none focus:border-[var(--primary)] transition-colors"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="mystery-button-solid py-4 mt-4 w-full text-lg disabled:opacity-50"
          >
            {loading ? "جاري التحديث..." : "حفظ التغييرات"}
          </button>
        </form>

        <button 
          onClick={async () => {
            await supabase.auth.signOut();
            router.push("/");
          }}
          className="w-full mt-6 py-3 border border-red-500/50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors font-bold"
        >
          تسجيل الخروج
        </button>
      </div>
    </div>
  );
}
