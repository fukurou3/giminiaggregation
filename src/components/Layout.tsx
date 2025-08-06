'use client';

import { ReactNode, useState } from 'react';
import { Navbar } from './Navbar';
import Footer from './Footer';
import { ProfileSetup } from './ProfileSetup';
import { ProfileEditModal } from './ProfileEditModal';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { loading } = useAuth();
  const { userProfile, isProfileLoading, needsProfileSetup, refreshProfile } = useUserProfile();
  const [showProfileEditModal, setShowProfileEditModal] = useState(false);

  if (loading || isProfileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (needsProfileSetup) {
    return (
      <ProfileSetup
        uid={userProfile!.uid}
        onComplete={refreshProfile}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar onProfileEdit={() => setShowProfileEditModal(true)} />
      <main className="pt-19 flex-1">
        {children}
      </main>
      <Footer />
      
      {/* プロフィール編集モーダル */}
      <ProfileEditModal 
        isOpen={showProfileEditModal} 
        onClose={() => setShowProfileEditModal(false)} 
      />
    </div>
  );
}