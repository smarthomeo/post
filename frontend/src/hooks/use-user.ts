import { useContext } from 'react';
import { AuthContext, type User } from '@/contexts/AuthContext';

export type { User };

export function useUser() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useUser must be used within an AuthProvider');
  }

  const { user, setUser } = context;

  const mutate = (newUser: User | null) => {
    setUser(newUser);
  };

  return {
    user,
    mutate,
    isLoading: false,
  };
}
