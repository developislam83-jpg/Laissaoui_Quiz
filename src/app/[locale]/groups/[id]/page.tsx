"use client";

import { useState, useEffect, useRef, use } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { useRouter } from "@/i18n/routing";
import { Reply, ThumbsUp, ThumbsDown, Trash2, X, Share2 } from "lucide-react";

export default function GroupChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = useAuth();
  const router = useRouter();
  
  // Unwrap params
  const unwrappedParams = use(params);
  const groupId = unwrappedParams.id;

  const [group, setGroup] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Interaction State
  const [replyingTo, setReplyingTo] = useState<any>(null);

  // Group Management State
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [manageMsg, setManageMsg] = useState("");

  const isOwner = group?.owner_id === user?.id;

  const prevMessagesLength = useRef(0);

  useEffect(() => {
    if (user && groupId) {
      loadGroup();
      loadMessages();
      loadMembers();

      const channel = supabase.channel(`group-${groupId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'group_messages', filter: `group_id=eq.${groupId}` },
          () => {
            loadMessages(); // Re-fetch to get replies/likes correctly
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'group_members', filter: `group_id=eq.${groupId}` },
          () => {
            loadMembers(); 
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, groupId]);

  useEffect(() => {
    if (messages.length > prevMessagesLength.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessagesLength.current = messages.length;
  }, [messages]);

  const loadGroup = async () => {
    const { data } = await supabase.from('groups').select('*').eq('id', groupId).single();
    if (data) {
      setGroup(data);
      setEditName(data.name);
      setEditDesc(data.description || "");
      setRequiresApproval(data.requires_approval || false);
    }
  };

  const loadMembers = async () => {
    const { data } = await supabase
      .from('group_members')
      .select('user_id, status, users(name, email)')
      .eq('group_id', groupId);
    if (data) setMembers(data);
  };

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('group_messages')
      .select('*, users(name)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error("Error loading messages:", error);
      return;
    }

    if (data) {
      setMessages(data);
    }
  };

  const toggleReaction = async (msg: any, type: 'likes' | 'dislikes') => {
    if (!user) return;
    
    const isLike = type === 'likes';
    const oppositeType = isLike ? 'dislikes' : 'likes';
    
    const targetArray = msg[type] || [];
    const oppositeArray = msg[oppositeType] || [];
    
    const isPresent = targetArray.includes(user.id);
    
    // If adding a like/dislike, add to target and remove from opposite
    const newTargetArray = isPresent 
      ? targetArray.filter((id: string) => id !== user.id)
      : [...targetArray, user.id];
      
    const newOppositeArray = !isPresent 
      ? oppositeArray.filter((id: string) => id !== user.id)
      : oppositeArray;
      
    // Optimistic Update
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, [type]: newTargetArray, [oppositeType]: newOppositeArray } : m));

    const { data, error } = await supabase.from('group_messages').update({ 
      [type]: newTargetArray,
      [oppositeType]: newOppositeArray
    }).eq('id', msg.id).select();
    
    if (error || !data || data.length === 0) {
      console.error("Error toggling reaction:", error || "تم رفض العملية بواسطة نظام الأمان (RLS)");
      alert("لم يتم الحفظ! يرجى التأكد من تشغيل سكريبت SQL لفتح الصلاحيات (RLS) للرسائل. " + (error?.message || ""));
      // Revert Optimistic Update
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, [type]: targetArray, [oppositeType]: oppositeArray } : m));
      return;
    }

    // Send Notification to message owner if we just ADDED a reaction
    if (!isPresent && msg.user_id !== user.id) {
      const reactionWord = isLike ? 'أعجب' : 'لم يعجب';
      const senderName = user.user_metadata?.name || 'مستخدم';
      const notifContent = `لقد ${reactionWord} ${senderName} برسالتك: "${msg.content.substring(0, 20)}..."`;
      
      const { error: notifErr } = await supabase.from('notifications').insert({
        user_id: msg.user_id,
        sender_id: user.id,
        type: isLike ? 'like' : 'dislike',
        content: notifContent
      });
      if (notifErr) {
        console.error("Failed to send notification:", JSON.stringify(notifErr));
        alert("تنبيه: الإعجاب سُجل، ولكن حدث خطأ في إرسال الإشعار لصاحب الرسالة: " + (notifErr.message || JSON.stringify(notifErr)));
      }
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;
    
    const msgText = newMessage.trim();
    setNewMessage("");
    
    const replyId = replyingTo?.id || null;
    setReplyingTo(null);

    // Optimistic Update
    const tempId = "temp-" + Date.now();
    const tempMsg = {
      id: tempId,
      group_id: groupId,
      user_id: user.id,
      content: msgText,
      reply_to_id: replyId,
      likes: [],
      dislikes: [],
      created_at: new Date().toISOString(),
      users: { name: user.user_metadata?.name || 'أنت' }
    };
    setMessages(prev => [...prev, tempMsg]);
    
    const { error } = await supabase.from('group_messages').insert([{
      group_id: groupId,
      user_id: user.id,
      content: msgText,
      reply_to_id: replyId
    }]);
    
    if (error) {
      console.error("Error sending message:", JSON.stringify(error));
      alert("حدث خطأ أثناء الإرسال. تأكد من أنك عضو مقبول في المجموعة.");
      // Revert optimistic update
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
  };

  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setManageMsg("");
    const { error } = await supabase.from('groups').update({ 
      name: editName, 
      description: editDesc,
      requires_approval: requiresApproval
    }).eq('id', group.id);
    if (!error) {
      setManageMsg("تم التحديث بنجاح!");
      loadGroup();
    } else {
      setManageMsg("خطأ في التحديث.");
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setManageMsg("");
    
    const { data: userData, error: userError } = await supabase.from('users').select('id').eq('email', inviteEmail).single();
    if (userError || !userData) {
      setManageMsg("لم يتم العثور على حساب بهذا الإيميل.");
      return;
    }
    
    const existing = members.find(m => m.user_id === userData.id);
    if (existing) {
      setManageMsg("المستخدم موجود بالفعل (عضو أو محظور).");
      return;
    }

    const { error: inviteError } = await supabase.from('group_invites').insert([{
      group_id: group.id,
      inviter_id: user?.id,
      invitee_id: userData.id
    }]);

    if (!inviteError) {
      setManageMsg("تم إرسال الدعوة بنجاح!");
      setInviteEmail("");
    } else {
      setManageMsg("حدث خطأ أو تم دعوته مسبقاً.");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!isOwner || !confirm("هل أنت متأكد من طرد هذا العضو نهائياً؟")) return;
    await supabase.from('group_members').update({ status: 'banned' }).eq('group_id', groupId).eq('user_id', memberId);
    loadMembers();
  };

  const handleApproveMember = async (memberId: string) => {
    if (!isOwner) return;
    await supabase.from('group_members').update({ status: 'approved' }).eq('group_id', groupId).eq('user_id', memberId);
    loadMembers();
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!isOwner) return; // Only admin can delete
    if (!confirm("هل أنت متأكد من مسح الرسالة؟")) return;
    await supabase.from('group_messages').delete().eq('id', msgId);
  };


  const handleCopyLink = () => {
    // Generate a direct join link for the group
    navigator.clipboard.writeText(`${window.location.origin}/groups/join/${groupId}`);
    alert("تم نسخ رابط المجموعة! يمكن لأي شخص طلب الانضمام من خلاله.");
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center">الرجاء تسجيل الدخول...</div>;
  if (!group) return <div className="min-h-screen flex items-center justify-center">جاري التحميل...</div>;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] p-4 md:p-8">
      <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col md:flex-row gap-6 overflow-hidden h-[85vh]">
        
        {/* Management & Info Sidebar */}
        <div className="w-full md:w-80 mystery-box flex flex-col overflow-y-auto">
          <div className="p-6 border-b border-[var(--border)]">
            <h1 className="text-xl font-bold text-[var(--primary)] mb-2">{group.name}</h1>
            {group.description && <p className="text-xs text-[var(--secondary)] italic mb-4">{group.description}</p>}
            
            <button onClick={handleCopyLink} className="flex items-center justify-center gap-2 w-full text-sm font-bold border border-[var(--primary)] text-[var(--primary)] px-4 py-2 rounded hover:bg-[var(--primary)] hover:text-white transition-colors mb-4">
              <Share2 size={16} /> نسخ رابط المجموعة
            </button>
            
            {/* Invite Form */}
            <form onSubmit={handleInvite} className="flex flex-col gap-2 mt-4">
              <h3 className="font-bold text-sm text-white">دعوة صديق بالإيميل</h3>
              <input 
                type="email" 
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="أدخل الإيميل..."
                className="bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--primary)]"
              />
              <button type="submit" disabled={!inviteEmail.trim()} className="mystery-button py-2 text-sm">إرسال دعوة</button>
            </form>
            {manageMsg && <div className="mt-2 text-green-400 text-xs font-bold text-center">{manageMsg}</div>}
          </div>

          <div className="p-6 flex-1">
            <h3 className="font-bold text-sm text-white mb-4">أعضاء المجموعة ({members.filter(m => m.status === 'approved').length})</h3>
            
            {/* Pending Members */}
            {isOwner && members.some(m => m.status === 'pending') && (
              <div className="mb-4">
                <h4 className="text-xs text-yellow-500 font-bold mb-2">طلبات الانضمام:</h4>
                <div className="flex flex-col gap-2">
                  {members.filter(m => m.status === 'pending').map(m => (
                    <div key={m.user_id} className="flex items-center justify-between bg-[var(--background)] p-2 rounded border border-[var(--border)]">
                      <span className="text-sm truncate">{m.users?.name}</span>
                      <div className="flex gap-1">
                        <button onClick={() => handleApproveMember(m.user_id)} className="text-green-500 hover:text-green-400 p-1">✔</button>
                        <button onClick={() => handleRemoveMember(m.user_id)} className="text-red-500 hover:text-red-400 p-1">❌</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Approved Members */}
            <div className="flex flex-col gap-3">
              {members.filter(m => m.status === 'approved').map(m => (
                <div key={m.user_id} className="flex justify-between items-center bg-[var(--background)] p-2 rounded border border-[var(--border)]">
                  <div className="flex flex-col truncate">
                    <span className="text-sm font-bold text-[var(--foreground)] truncate">{m.users?.name || 'مجهول'}</span>
                    <span className="text-xs text-[var(--secondary)] truncate">{m.users?.email}</span>
                  </div>
                  {isOwner && m.user_id !== group.owner_id && (
                    <button onClick={() => handleRemoveMember(m.user_id)} className="text-red-500 hover:text-red-400 p-1" title="طرد نهائي">
                      <Trash2 size={16} />
                    </button>
                  )}
                  {m.user_id === group.owner_id && <span className="text-xs text-[var(--primary)] font-bold">مدير</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Admin Settings */}
          {isOwner && (
            <div className="p-6 border-t border-[var(--border)] bg-[var(--surface)]">
              <h3 className="font-bold text-sm text-white mb-4">إعدادات الإدارة</h3>
              <form onSubmit={handleUpdateGroup} className="flex flex-col gap-3">
                <input 
                  type="text" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="اسم المجموعة"
                  className="bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--primary)]"
                />
                <input 
                  type="text" 
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="الوصف"
                  maxLength={30}
                  className="bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--primary)]"
                />
                <label className="flex items-center gap-2 text-sm text-[var(--secondary)] mt-2">
                  <input type="checkbox" checked={requiresApproval} onChange={(e) => setRequiresApproval(e.target.checked)} className="rounded" />
                  الانضمام يتطلب موافقة
                </label>
                <button type="submit" className="mystery-button-solid py-2 text-sm mt-2">حفظ التعديلات</button>
              </form>
            </div>
          )}
        </div>

        {/* Chat Area */}
        <div className="flex-1 max-w-2xl mx-auto w-full flex flex-col mystery-box overflow-hidden relative">
          {/* Chat Header */}
          <div className="p-4 border-b border-[var(--border)] bg-[var(--surface)] flex justify-between items-center z-10">
            <h2 className="text-lg font-bold text-white">الدردشة</h2>
            <button onClick={() => router.push("/groups")} className="text-sm font-bold text-[var(--secondary)] hover:text-white">
              العودة
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[var(--background)]/50 relative">
            {messages.map((msg) => {
              const isMe = msg.user_id === user.id;
              const replyMsg = msg.reply_to_id ? messages.find(m => m.id === msg.reply_to_id) : null;
              
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-start' : 'items-end'} group/msg relative w-full`}>
                  <div className="flex items-center gap-2 mb-1 mx-2">
                    <span className="text-[10px] text-[var(--secondary)] font-bold">{isMe ? 'أنت' : msg.users?.name || 'مجهول'}</span>
                  </div>
                  
                  <div className={`px-4 py-2 rounded-2xl max-w-[85%] relative ${
                    isMe 
                      ? 'bg-[var(--primary)] text-white rounded-tr-none' 
                      : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] rounded-tl-none'
                  }`}>
                    {/* Quoted Reply */}
                    {replyMsg && (
                      <div className="bg-black/20 border-r-2 border-[var(--border)] pr-2 p-1 rounded text-xs mb-2 opacity-80 truncate max-w-full">
                        <span className="font-bold ml-1">{replyMsg.user_id === user.id ? 'أنت' : replyMsg.users?.name}:</span>
                        {replyMsg.content}
                      </div>
                    )}
                    
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                  </div>
                  
                  {/* Reactions & Actions Row (Below the message) */}
                  <div className={`flex items-center gap-2 mt-1 mx-2 transition-opacity duration-200 ${(msg.likes?.length > 0 || msg.dislikes?.length > 0) ? 'opacity-100' : 'opacity-0 group-hover/msg:opacity-100'}`}>
                    
                    {/* Display Counts for Everyone */}
                    {(msg.likes?.length > 0 || msg.dislikes?.length > 0) && (
                      <div className="flex gap-2 text-[10px] bg-[var(--surface)] px-2 py-1.5 rounded-full border border-[var(--border)] shadow-sm">
                        {msg.likes?.length > 0 && <span className="flex items-center gap-1 text-green-400"><ThumbsUp size={12} /> {msg.likes.length}</span>}
                        {msg.dislikes?.length > 0 && <span className="flex items-center gap-1 text-red-400"><ThumbsDown size={12} /> {msg.dislikes.length}</span>}
                      </div>
                    )}

                    <div className="flex gap-1 bg-[var(--surface)] px-1 py-1 rounded-full border border-[var(--border)] shadow-sm">
                      <button onClick={() => setReplyingTo(msg)} className="p-1.5 hover:text-[var(--primary)] transition-colors rounded-full hover:bg-[var(--background)] text-[var(--secondary)]" title="رد">
                        <Reply size={14} />
                      </button>
                      
                      {!isMe && (
                        <>
                          <button 
                            onClick={() => toggleReaction(msg, 'likes')} 
                            className={`flex items-center gap-1 p-1.5 transition-colors rounded-full hover:bg-[var(--background)] ${(msg.likes || []).includes(user.id) ? 'text-green-500 bg-green-500/10' : 'text-[var(--secondary)] hover:text-green-500'}`} 
                            title="أعجبني"
                          >
                            <ThumbsUp size={14} />
                          </button>
                          
                          <button 
                            onClick={() => toggleReaction(msg, 'dislikes')} 
                            className={`flex items-center gap-1 p-1.5 transition-colors rounded-full hover:bg-[var(--background)] ${(msg.dislikes || []).includes(user.id) ? 'text-red-500 bg-red-500/10' : 'text-[var(--secondary)] hover:text-red-500'}`} 
                            title="لم يعجبني"
                          >
                            <ThumbsDown size={14} />
                          </button>
                        </>
                      )}
                      
                      {isOwner && (
                        <button onClick={() => handleDeleteMessage(msg.id)} className="p-1.5 text-red-500 hover:bg-red-500/20 transition-colors rounded-full mr-1 border-r border-[var(--border)] pr-2" title="مسح الرسالة">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply/Edit Indicator */}
          {replyingTo && (
            <div className="bg-[var(--surface)] border-t border-[var(--border)] p-3 flex justify-between items-center text-sm">
              <div className="flex flex-col truncate">
                <span className="text-[var(--primary)] font-bold text-xs">جاري الرد على {replyingTo.users?.name}</span>
                <span className="text-[var(--secondary)] truncate max-w-[200px] text-xs">{replyingTo.content}</span>
              </div>
              <button onClick={() => setReplyingTo(null)} className="text-[var(--secondary)] hover:text-white p-2"><X size={14} /></button>
            </div>
          )}

          {/* Chat Input */}
          <form onSubmit={sendMessage} className="p-4 border-t border-[var(--border)] bg-[var(--surface)] flex gap-2">
            <input 
              type="text" 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="اكتب رسالتك..."
              className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-full px-4 py-2 text-sm focus:outline-none focus:border-[var(--primary)]"
            />
            <button type="submit" disabled={!newMessage.trim()} className="mystery-button-solid rounded-full px-4 text-sm font-bold disabled:opacity-50">
              إرسال
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
