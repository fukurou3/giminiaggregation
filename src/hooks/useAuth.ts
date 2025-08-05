import { useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuthStore } from '@/lib/stores/authStore';

export const useAuth = () => {
  const { user, loading, setUser } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      setUser(user);
    });

    return () => unsubscribe();
  }, [setUser]);

  return {
    user,
    loading,
    isAuthenticated: !!user,
  };
};