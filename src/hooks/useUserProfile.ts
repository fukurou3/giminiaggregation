import { useEffect, useState } from 'react';
import { getUserProfile, createUserProfile } from '@/lib/userProfile';
import { useAuth } from './useAuth';
import type { UserProfile } from '@/types/User';

export const useUserProfile = () => {
  const { user, isAuthenticated } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      return;
    }

    const loadUserProfile = async () => {
      setIsProfileLoading(true);
      setProfileError(null);

      try {
        let profile = await getUserProfile(user.uid);
        
        // プロフィールが存在しない場合は作成（emailを使用せず）
        if (!profile) {
          await createUserProfile(user.uid);
          profile = await getUserProfile(user.uid);
        }

        setUserProfile(profile);
      } catch (error) {
        console.error('Error loading user profile:', error);
        setProfileError('プロフィールの読み込みに失敗しました');
      } finally {
        setIsProfileLoading(false);
      }
    };

    loadUserProfile();
  }, [user]);

  const refreshProfile = async () => {
    if (!user) return;
    
    setIsProfileLoading(true);
    try {
      const profile = await getUserProfile(user.uid);
      setUserProfile(profile);
    } catch (error) {
      console.error('Error refreshing profile:', error);
    } finally {
      setIsProfileLoading(false);
    }
  };

  return {
    user,
    userProfile,
    isAuthenticated,
    isProfileLoading,
    profileError,
    refreshProfile,
    needsProfileSetup: isAuthenticated && userProfile && !userProfile.isSetupComplete,
  };
};