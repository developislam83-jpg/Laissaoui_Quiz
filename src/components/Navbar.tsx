"use client";

import { useAuth } from "@/components/AuthProvider";
import { useRouter, usePathname } from "@/i18n/routing";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Bell, User, X } from "lucide-react";

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [groupInvites, setGroupInvites] = useState<any[]>([]);
  const [reactions, setReactions] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  const notifCount = friendRequests.length + groupInvites.length + reactions.length;

  useEffect(() => {
    if (user) {
      loadNotifications();
      
      // Setup Realtime subscriptions for notifications
      const channel = supabase.channel('custom-all-channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'friendships', filter: `addressee_id=eq.${user.id}` },
          () => loadNotifications()
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'group_invites', filter: `invitee_id=eq.${user.id}` },
          () => loadNotifications()
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          () => loadNotifications()
        )
        .subscribe();
        
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;
    
    // Load pending friend requests
    const { data: frData } = await supabase
      .from('friendships')
      .select('*, users!friendships_requester_id_fkey(name)')
      .eq('addressee_id', user.id)
      .eq('status', 'pending');
      
    if (frData) setFriendRequests(frData);
    
    // Load group invites
    const { data: invData } = await supabase
      .from('group_invites')
      .select('*, groups(name), users!group_invites_inviter_id_fkey(name)')
      .eq('invitee_id', user.id);
      
    if (invData) setGroupInvites(invData);
    
    // Load general notifications
    const { data: notifData } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_read', false)
      .order('created_at', { ascending: false });
      
    if (notifData) setReactions(notifData);
  };

  const handleAcceptFriend = async (requesterId: string) => {
    await supabase.from('friendships').update({ status: 'accepted' }).eq('requester_id', requesterId).eq('addressee_id', user?.id);
    loadNotifications();
  };

  const handleDeclineFriend = async (requesterId: string) => {
    await supabase.from('friendships').delete().eq('requester_id', requesterId).eq('addressee_id', user?.id);
    loadNotifications();
  };

  const handleAcceptInvite = async (groupId: string, inviterId: string) => {
    // Insert into group members
    await supabase.from('group_members').insert([{ group_id: groupId, user_id: user?.id }]);
    // Delete invite
    await supabase.from('group_invites').delete().eq('group_id', groupId).eq('invitee_id', user?.id);
    loadNotifications();
    router.push(`/groups/${groupId}`);
  };

  const handleDeclineInvite = async (groupId: string) => {
    await supabase.from('group_invites').delete().eq('group_id', groupId).eq('invitee_id', user?.id);
    loadNotifications();
  };

  // Hide Navbar for participant experience and landing page
  if (pathname.startsWith('/join') || pathname.startsWith('/play') || pathname === '/') {
    return null;
  }

  return (
    <div className="p-4">
      <header className="flex justify-between items-center p-4 bg-[var(--surface)] mystery-box max-w-7xl mx-auto rounded-2xl relative z-50">
      <div 
        onClick={() => router.push(user ? "/dashboard" : "/")}
        className="font-black text-2xl tracking-widest text-[var(--primary)] cursor-pointer hover:opacity-80 transition-opacity"
      >
        LQ.
      </div>
      
      <div className="flex items-center gap-4">
        {user && (
          <div className="relative">
            <button 
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="p-2 rounded-full border border-[var(--border)] hover:border-[var(--primary)] text-[var(--foreground)] hover:text-[var(--primary)] transition-all duration-200 hover:scale-110 active:scale-75 relative flex items-center justify-center"
            >
              <Bell size={20} />
              {notifCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                  {notifCount}
                </span>
              )}
            </button>
            
            {notificationsOpen && (
              <div className="absolute top-full left-0 mt-2 w-80 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-[var(--shadow-glow)] overflow-hidden z-50 p-4">
                <h3 className="font-bold border-b border-[var(--border)] pb-2 mb-2">الإشعارات ({notifCount})</h3>
                
                <div className="max-h-[400px] overflow-y-auto flex flex-col gap-3">
                  {/* User Search Section */}
                  <div className="mb-2">
                    <input 
                      type="text" 
                      placeholder="ابحث عن صديق بالاسم أو الإيميل..." 
                      className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--primary)]"
                      onChange={async (e) => {
                        const val = e.target.value;
                        if (val.length < 3) {
                          setSearchResults([]);
                          return;
                        }
                        const { data } = await supabase
                          .from('users')
                          .select('id, name, email')
                          .neq('id', user.id)
                          .or(`name.ilike.%${val}%,email.ilike.%${val}%`)
                          .limit(5);
                        if (data) setSearchResults(data);
                      }}
                    />
                    {searchResults.length > 0 && (
                      <div className="mt-2 flex flex-col gap-2">
                        {searchResults.map(sUser => (
                          <div key={sUser.id} className="flex items-center justify-between bg-[var(--background)] p-2 rounded border border-[var(--border)]">
                            <div className="flex flex-col overflow-hidden">
                              <span className="font-bold text-sm truncate">{sUser.name || 'بدون اسم'}</span>
                              <span className="text-xs text-[var(--secondary)] truncate">{sUser.email}</span>
                            </div>
                            <button 
                              onClick={async () => {
                                await supabase.from('friendships').insert({ requester_id: user.id, addressee_id: sUser.id, status: 'pending' });
                                setSearchResults(searchResults.filter(u => u.id !== sUser.id));
                                alert('تم إرسال طلب الصداقة!');
                              }}
                              className="text-xs bg-[var(--primary)] text-white px-2 py-1 rounded whitespace-nowrap hover:opacity-80"
                            >
                              إضافة
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {notifCount === 0 && <p className="text-sm text-[var(--secondary)] text-center py-4 border-t border-[var(--border)] mt-2 pt-4">لا توجد إشعارات جديدة</p>}
                  
                  {friendRequests.map(fr => (
                    <div key={fr.requester_id} className="bg-[var(--background)] p-3 rounded border border-[var(--border)] text-sm">
                      <p><strong>{fr.users?.name || 'مجهول'}</strong> أرسل لك طلب صداقة!</p>
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => handleAcceptFriend(fr.requester_id)} className="flex-1 bg-green-500/20 text-green-500 border border-green-500 rounded py-1 font-bold">قبول</button>
                        <button onClick={() => handleDeclineFriend(fr.requester_id)} className="flex-1 bg-red-500/20 text-red-500 border border-red-500 rounded py-1 font-bold">رفض</button>
                      </div>
                    </div>
                  ))}
                  
                  {/* Group Invites */}
                  {groupInvites.map(inv => (
                    <div key={inv.group_id} className="bg-[var(--background)] p-3 rounded-lg border border-[var(--border)] text-sm">
                      <p className="mb-2"><span className="font-bold text-[var(--primary)]">{inv.users?.name || 'مجهول'}</span> دعاك للانضمام إلى مجموعة <span className="font-bold">{inv.groups?.name}</span></p>
                      <div className="flex gap-2">
                        <button onClick={() => handleAcceptInvite(inv.group_id, inv.inviter_id)} className="flex-1 bg-[var(--primary)] text-white py-1 rounded hover:opacity-80 transition-opacity text-xs font-bold">قبول والدخول</button>
                        <button onClick={() => handleDeclineInvite(inv.group_id)} className="flex-1 bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] py-1 rounded hover:opacity-80 transition-opacity text-xs font-bold">رفض</button>
                      </div>
                    </div>
                  ))}

                  {/* General Notifications (Reactions) */}
                  {reactions.map(notif => (
                    <div key={notif.id} className="bg-[var(--background)] p-3 rounded-lg border border-[var(--border)] text-sm flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{notif.type === 'like' ? '👍' : '👎'}</span>
                        <p>{notif.content}</p>
                      </div>
                      <button 
                        onClick={async () => {
                          await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id);
                          loadNotifications();
                        }}
                        className="text-[var(--secondary)] hover:text-white p-1"
                        title="تعليم كمقروء"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}

                  {notifCount === 0 && (
                    <div className="text-center text-[var(--secondary)] py-4 text-sm border-t border-[var(--border)] mt-2 pt-4">
                      لا توجد إشعارات جديدة.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <ThemeSwitcher />
        <LanguageSwitcher />
        
        {user ? (
          <button 
            onClick={() => router.push("/account")}
            className="flex items-center gap-2 text-sm font-bold bg-[var(--background)] px-4 py-2 rounded-lg border border-[var(--border)] hover:border-[var(--primary)] text-[var(--foreground)] hover:text-[var(--primary)] transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <User size={18} />
            <span className="truncate max-w-[80px] md:max-w-[150px]">{user.email}</span>
          </button>
        ) : (
          <div className="flex gap-2">
            <button 
              onClick={() => router.push("/auth/login")}
              className="px-4 py-2 text-sm font-bold border border-[var(--border)] rounded-lg hover:border-[var(--primary)] transition-colors"
            >
              تسجيل الدخول
            </button>
            <button 
              onClick={() => router.push("/auth/signup")}
              className="hidden sm:block px-4 py-2 text-sm font-bold mystery-button-solid rounded-lg"
            >
              إنشاء حساب
            </button>
          </div>
        )}
      </div>
    </header>
    </div>
  );
}
