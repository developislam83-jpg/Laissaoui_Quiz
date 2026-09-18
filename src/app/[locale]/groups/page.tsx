"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { useRouter } from "@/i18n/routing";
import { motion } from "framer-motion";

export default function GroupsPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [groups, setGroups] = useState<any[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Check if user already owns a group
  const userOwnsGroup = groups.some(g => g.owner_id === user?.id);
  const userGroupIds = groups.map(g => g.id); // To know which groups we are already in

  useEffect(() => {
    if (user) loadGroups();
  }, [user]);

  const loadGroups = async () => {
    setLoading(true);
    // Fetch groups the user is a part of
    const { data, error } = await supabase
      .from("groups")
      .select(`
        id, name, description, owner_id, created_at,
        group_members (user_id)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading groups:", JSON.stringify(error));
      setLoading(false);
      return;
    }

    if (data) {
      const ownerIds = [...new Set(data.map(g => g.owner_id))];
      let userMap: any = {};
      
      if (ownerIds.length > 0) {
        const { data: usersData } = await supabase.from('users').select('id, name').in('id', ownerIds);
        usersData?.forEach(u => { userMap[u.id] = u.name; });
      }

      const groupsWithOwners = data.map(g => ({ ...g, users: { name: userMap[g.owner_id] || 'مجهول' } }));

      const myGroups = groupsWithOwners.filter(g => 
        g.owner_id === user?.id || 
        g.group_members?.some((m: any) => m.user_id === user?.id)
      );
      setGroups(myGroups);
    }
    setLoading(false);
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!newGroupName.trim() || !user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("groups")
      .insert([{ 
        name: newGroupName, 
        description: newGroupDesc,
        owner_id: user.id 
      }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        setErrorMsg("لا يمكنك إنشاء أكثر من مجموعة واحدة!");
      } else {
        setErrorMsg("حدث خطأ أثناء الإنشاء.");
      }
    } else {
      setNewGroupName("");
      setNewGroupDesc("");
      await loadGroups();
    }
    setLoading(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    const { data, error } = await supabase
      .from("groups")
      .select(`
        id, name, description, owner_id,
        group_members (user_id)
      `)
      .ilike("name", `%${searchQuery}%`)
      .limit(10);

    if (error) {
      console.error("Search error:", JSON.stringify(error));
    }

    if (data) {
      const ownerIds = [...new Set(data.map(g => g.owner_id))];
      let userMap: any = {};
      
      if (ownerIds.length > 0) {
        const { data: usersData } = await supabase.from('users').select('id, name').in('id', ownerIds);
        usersData?.forEach(u => { userMap[u.id] = u.name; });
      }

      const resultsWithOwners = data.map(g => ({ ...g, users: { name: userMap[g.owner_id] || 'مجهول' } }));
      setSearchResults(resultsWithOwners);
    }
    setIsSearching(false);
  };

  const handleJoinGroup = async (groupId: string) => {
    if (!user) return;
    
    const { error } = await supabase
      .from("group_members")
      .insert([{ group_id: groupId, user_id: user.id }]);

    if (!error) {
      await loadGroups();
      setSearchResults([]);
      setSearchQuery("");
      alert("تم الانضمام للمجموعة بنجاح!");
    } else {
      alert("حدث خطأ، ربما أنت منضم بالفعل!");
    }
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center">الرجاء تسجيل الدخول...</div>;

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center bg-[var(--background)] text-[var(--foreground)]">
      <div className="w-full max-w-4xl mystery-box p-8">
        


        {/* Create Group Form */}
        {!userOwnsGroup && (
          <form onSubmit={handleCreateGroup} className="flex flex-col gap-4 mb-8 bg-[var(--surface)] p-6 rounded-xl border border-[var(--border)]">
            <h3 className="font-bold mb-2">إنشاء مجموعة خاصة بك</h3>
            {errorMsg && <div className="text-red-500 text-sm font-bold bg-red-500/10 p-2 rounded">{errorMsg}</div>}
            <div className="flex gap-4 flex-col md:flex-row">
              <input 
                type="text" 
                required
                placeholder="اسم المجموعة..." 
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-lg px-4 py-3 focus:outline-none focus:border-[var(--primary)]"
              />
              <button type="submit" disabled={!newGroupName.trim() || loading} className="mystery-button-solid px-8 font-bold">إنشاء</button>
            </div>
          </form>
        )}

        {/* Search & Join Groups */}
        <div className="mb-12 bg-[var(--surface)] p-6 rounded-xl border border-[var(--border)]">
          <h3 className="font-bold mb-4 text-[var(--secondary)]">البحث عن مجموعات للانضمام</h3>
          <form onSubmit={handleSearch} className="flex gap-4 flex-col md:flex-row mb-6">
            <input 
              type="text" 
              placeholder="ابحث باسم المجموعة..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-lg px-4 py-3 focus:outline-none focus:border-[var(--primary)]"
            />
            <button type="submit" disabled={!searchQuery.trim() || isSearching} className="mystery-button px-8 py-3 font-bold">
              {isSearching ? "جاري البحث..." : "بحث"}
            </button>
          </form>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-4">
              {searchResults.map((res) => {
                const isMember = userGroupIds.includes(res.id);
                return (
                  <div key={res.id} className="flex justify-between items-center p-4 bg-[var(--background)] border border-[var(--border)] rounded-lg">
                    <div>
                      <h4 className="font-bold text-[var(--primary)]">{res.name}</h4>
                      <p className="text-xs text-[var(--secondary)]">المالك: {res.users?.name}</p>
                    </div>
                    {isMember ? (
                      <span className="text-green-500 font-bold text-sm bg-green-500/10 px-3 py-1 rounded">أنت عضو بالفعل</span>
                    ) : (
                      <button 
                        onClick={() => handleJoinGroup(res.id)}
                        className="bg-[var(--primary)] text-white px-4 py-2 rounded font-bold hover:opacity-80 transition-opacity"
                      >
                        انضمام
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* List of My Groups */}
        <h2 className="text-xl font-bold mb-6 text-[var(--secondary)]">مجموعاتك</h2>
        
        {loading ? (
          <div className="text-center text-gray-500 py-8">جاري التحميل...</div>
        ) : groups.length === 0 ? (
          <div className="text-center border border-dashed border-[var(--border)] rounded-xl py-12 text-[var(--secondary)]">
            أنت لست في أي مجموعة حالياً.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {groups.map((group) => {
              const memberCount = group.group_members?.length || 0;
              return (
                <motion.div 
                  key={group.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[var(--surface)] p-6 rounded-xl border border-[var(--border)] hover:border-[var(--primary)] transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-white cursor-pointer hover:text-[var(--primary)] transition-colors" onClick={() => router.push(`/groups/${group.id}`)}>
                      {group.name}
                    </h3>
                    <div className="flex gap-2 items-center">
                      {group.owner_id === user.id && (
                        <span className="text-xs bg-[var(--primary)]/20 text-[var(--primary)] px-2 py-1 rounded-md font-bold">المالك</span>
                      )}
                    </div>
                  </div>
                  
                  {group.description && (
                    <p className="text-[var(--primary)] text-sm mb-4 italic">"{group.description}"</p>
                  )}
                  
                  <div className="flex justify-between items-center text-sm text-[var(--secondary)] mb-4">
                    <span>المالك: {group.users?.name || "مجهول"}</span>
                    <span className="font-bold bg-[var(--background)] px-2 py-1 rounded">عدد الأعضاء: {memberCount}</span>
                  </div>
                  
                  <div className="flex gap-2 mt-auto">
                    <button 
                      onClick={() => router.push(`/groups/${group.id}`)}
                      className="flex-1 mystery-button py-2 text-sm font-bold"
                    >
                      دخول الدردشة
                    </button>
                    {group.owner_id === user.id && (
                      <button 
                        onClick={async () => {
                          if (confirm("هل أنت متأكد من حذف هذه المجموعة نهائياً؟")) {
                            await supabase.from("groups").delete().eq("id", group.id);
                            loadGroups();
                          }
                        }}
                        className="bg-red-500/20 text-red-500 border border-red-500 px-3 py-2 rounded text-sm font-bold hover:bg-red-500 hover:text-white transition-colors"
                        title="حذف المجموعة"
                      >
                        حذف
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
