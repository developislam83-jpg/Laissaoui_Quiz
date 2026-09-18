"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { useTranslations } from "next-intl";

export default function AdminPage() {
  const t = useTranslations("Common");
  const { isAdmin, isLoading } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });
      
    if (!error && data) {
      setUsers(data);
    }
    setLoadingUsers(false);
  };

  const toggleApproval = async (userId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("users")
      .update({ is_approved: !currentStatus })
      .eq("id", userId);

    if (!error) {
      setUsers(users.map(u => u.id === userId ? { ...u, is_approved: !currentStatus } : u));
    }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">{t("loading")}</div>;
  if (!isAdmin) return null; // AuthProvider redirects

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-[var(--primary-blue)] mb-8">لوحة تحكم الإدارة</h1>

        <div className="neu-box p-6 mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">إحصائيات</h2>
            <p className="text-gray-500 mt-2">إجمالي المستخدمين: {users.length}</p>
          </div>
          <div>
             <p className="text-gray-500 mt-2">الحسابات المعلقة: {users.filter(u => !u.is_approved).length}</p>
          </div>
        </div>

        <div className="neu-box p-6 overflow-x-auto">
          <h2 className="text-xl font-bold mb-4">إدارة المستخدمين</h2>
          {loadingUsers ? (
            <p>{t("loading")}</p>
          ) : (
            <table className="w-full text-right">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="py-3 px-4">الاسم</th>
                  <th className="py-3 px-4">البريد الإلكتروني</th>
                  <th className="py-3 px-4">رقم الهاتف</th>
                  <th className="py-3 px-4">تاريخ التسجيل</th>
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-b border-gray-100 dark:border-gray-900/30">
                    <td className="py-3 px-4">{user.name}</td>
                    <td className="py-3 px-4">{user.email}</td>
                    <td className="py-3 px-4">{user.phone || '-'}</td>
                    <td className="py-3 px-4">{new Date(user.created_at).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${user.is_approved ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-600'}`}>
                        {user.is_approved ? 'مفعل' : 'معلق'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button 
                        onClick={() => toggleApproval(user.id, user.is_approved)}
                        className={`px-3 py-1 rounded text-sm font-bold transition-all ${user.is_approved ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'}`}
                      >
                        {user.is_approved ? 'إيقاف' : 'قبول'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
