"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export default function LoginPage() {
  const t = useTranslations("Common");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (data.user) {
        // Check approval status
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("is_approved")
          .eq("id", data.user.id)
          .single();

        if (userError || !userData?.is_approved) {
          // Log them out immediately if not approved
          await supabase.auth.signOut();
          setError("حسابك بانتظار موافقة الإدارة. لا يمكنك الدخول حالياً.");
          setLoading(false);
          return;
        }

        router.push("/");
      }
    } catch (err: any) {
      setError(err.message || t("error"));
    } finally {
      if (!error) setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="neu-box p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-center text-[var(--primary-blue)] mb-6">تسجيل الدخول</h2>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium">البريد الإلكتروني</label>
            <input 
              type="email" 
              required
              className="w-full p-3 rounded-lg bg-[var(--surface)] border-none neu-box-inset focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">كلمة المرور</label>
            <input 
              type="password" 
              required
              className="w-full p-3 rounded-lg bg-[var(--surface)] border-none neu-box-inset focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full neu-button py-3 mt-4 text-[var(--primary-blue)] font-bold disabled:opacity-50"
          >
            {loading ? t("loading") : "دخول"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm">
          ليس لديك حساب؟{" "}
          <button onClick={() => router.push("/auth/signup")} className="text-[var(--primary-yellow)] font-bold">
            إنشاء حساب جديد
          </button>
        </p>
      </div>
    </div>
  );
}
