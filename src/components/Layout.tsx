'use client';

import { ReactNode } from 'react';
import { Navbar } from './Navbar';
import Footer from './Footer';
import { ProfileSetup } from './ProfileSetup';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Spinner } from '@/components/ui/Spinner';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { loading } = useAuth();
  const { userProfile, isProfileLoading, needsProfileSetup, refreshProfile } = useUserProfile();

  if (loading || isProfileLoading) {
    return <Spinner />;
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