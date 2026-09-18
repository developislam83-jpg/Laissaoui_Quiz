"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export default function SignupPage() {
  const t = useTranslations("Common");
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (data.user) {
        // Attempt to insert into public.users. 
        // Note: It's highly recommended to handle this via a Supabase DB Trigger instead!
        const { error: insertError } = await supabase.from("users").insert([
          {
            id: data.user.id,
            name,
            email,
            phone,
          },
        ]);

        if (insertError) {
          console.warn("Could not insert user data (RLS or Trigger exists):", insertError.message);
        }

        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || t("error"));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="neu-box p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-[var(--primary-blue)] mb-4">تم إنشاء الحساب بنجاح!</h2>
          <p className="mb-6">حسابك الآن قيد المراجعة. يرجى انتظار موافقة الإدارة لتتمكن من تسجيل الدخول.</p>
          <button 
            onClick={() => router.push("/auth/login")}
            className="neu-button px-6 py-2 w-full text-[var(--primary-blue)] font-bold"
          >
            الذهاب لتسجيل الدخول
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="neu-box p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-center text-[var(--primary-blue)] mb-6">إنشاء حساب جديد</h2>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium">الاسم الكامل</label>
            <input 
              type="text" 
              required
              className="w-full p-3 rounded-lg bg-[var(--surface)] border-none neu-box-inset focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)]"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          
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
            <label className="block mb-1 text-sm font-medium">رقم الهاتف</label>
            <input 
              type="tel" 
              className="w-full p-3 rounded-lg bg-[var(--surface)] border-none neu-box-inset focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)]"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
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
            {loading ? t("loading") : "إنشاء حساب"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm">
          لديك حساب بالفعل؟{" "}
          <button onClick={() => router.push("/auth/login")} className="text-[var(--primary-blue)] font-bold">
            تسجيل الدخول
          </button>
        </p>
      </div>
    </div>
  );
}
