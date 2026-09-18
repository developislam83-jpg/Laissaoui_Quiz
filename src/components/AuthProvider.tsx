"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "@/i18n/routing";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  dbUser: any | null; // From public.users
  isAdmin: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  dbUser: null,
  isAdmin: false,
  isLoading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [dbUser, setDbUser] = useState<any | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchUserData(session.user.id);
      } else {
        setIsLoading(false);
      }
    };

    fetchSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserData(session.user.id);
        } else {
          setDbUser(null);
          setIsAdmin(false);
          setIsLoading(false);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch user data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (!userError && userData) {
        setDbUser(userData);
      }

      // Check if admin
      const { data: adminData } = await supabase
        .from('admins')
        .select('*')
        .eq('user_id', userId)
        .single();
        
      setIsAdmin(!!adminData);
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Route guarding
  useEffect(() => {
    if (!isLoading) {
      const isAuthRoute = pathname.startsWith('/auth');
      const isJoinRoute = pathname.startsWith('/join') || pathname.startsWith('/play');
      const isHome = pathname === '/';
      const isDashboard = pathname === '/dashboard';
      
      // If not logged in and trying to access a protected route
      if (!user && !isAuthRoute && !isJoinRoute && !isHome && !isDashboard) {
        router.push('/auth/login');
      } 
      // If logged in but not approved
      else if (user && dbUser && !dbUser.is_approved && !isAuthRoute && !isHome && !isJoinRoute) {
         // Maybe redirect to a "pending approval" page or just block access
      }
      // If trying to access admin without being admin
      else if (pathname.startsWith('/admin') && !isAdmin) {
        router.push('/');
      }
    }
  }, [isLoading, user, dbUser, isAdmin, pathname, router]);

  return (
    <AuthContext.Provider value={{ user, session, dbUser, isAdmin, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
