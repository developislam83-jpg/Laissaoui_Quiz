"use client";

import { useEffect, useState, use } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { useRouter } from "@/i18n/routing";

export default function JoinGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = useAuth();
  const router = useRouter();
  const unwrappedParams = use(params);
  const groupId = unwrappedParams.id;
  const [msg, setMsg] = useState("جاري التحقق من المجموعة...");

  useEffect(() => {
    if (!user) {
      setMsg("الرجاء تسجيل الدخول أولاً للانضمام.");
      return;
    }

    const joinGroup = async () => {
      const { data: group } = await supabase.from('groups').select('name, requires_approval').eq('id', groupId).single();
      if (!group) {
        setMsg("المجموعة غير موجودة.");
        return;
      }

      const { data: member } = await supabase.from('group_members').select('status').eq('group_id', groupId).eq('user_id', user.id).single();
      if (member) {
        if (member.status === 'banned') {
          setMsg("لا يمكنك الانضمام لهذه المجموعة (تم طردك سابقاً).");
        } else if (member.status === 'pending') {
          setMsg("طلبك قيد الانتظار لموافقة الإدارة.");
        } else {
          router.push("/groups");
        }
        return;
      }

      // New member joining
      const status = group.requires_approval ? 'pending' : 'approved';
      const { error } = await supabase.from('group_members').insert({
        group_id: groupId,
        user_id: user.id,
        status: status
      });

      if (error) {
        setMsg("حدث خطأ أثناء الانضمام: " + error.message);
      } else {
        if (status === 'pending') {
          setMsg("تم إرسال طلب الانضمام إلى " + group.name + ". يرجى انتظار الموافقة.");
        } else {
          router.push("/groups/" + groupId);
        }
      }
    };

    joinGroup();
  }, [user, groupId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
      <div className="mystery-box p-8 text-center max-w-md w-full">
        <h1 className="text-xl font-bold text-[var(--primary)] mb-4">الانضمام للمجموعة</h1>
        <p className="text-[var(--foreground)]">{msg}</p>
        <button onClick={() => router.push("/groups")} className="mystery-button-solid px-6 py-2 mt-6">العودة للمجموعات</button>
      </div>
    </div>
  );
}
