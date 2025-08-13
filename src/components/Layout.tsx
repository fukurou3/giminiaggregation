'use client';

import { ReactNode } from 'react';
import { Navbar } from './Navbar';
import Footer from './Footer';
import { ProfileSetup } from './ProfileSetup';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { loading } = useAuth();
  const { userProfile, isProfileLoading, needsProfileSetup, refreshProfile } = useUserProfile();

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
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}