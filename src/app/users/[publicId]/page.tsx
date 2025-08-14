'use client';

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useProfileLayout } from "@/components/profile/useProfileLayout";
import { Post } from "@/types/Post";
import { UserProfile } from "@/types/User";

// Profile Components
import { ProfileInfoSection } from "@/components/profile/ProfileInfoSection";
import { ProfileTabsSection } from "@/components/profile/ProfileTabsSection";
import { ProfileLoading, ProfileError } from "@/components/profile/ProfileStates";
import { ProfileEditModal } from "@/components/ProfileEditModal";
import { ReportUserModal } from "@/components/ui/ReportUserModal";
import { CreateUserReportRequest } from "@/types/UserReport";

interface ProfileData {
  profile: UserProfile;
  posts: Post[];
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { containerClasses, isMobile, layoutPhase } = useProfileLayout();
  const publicId = params.publicId as string;
  
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  
  const isOwnProfile = user && profileData?.profile.uid === user.uid;

  const fetchProfileData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const profileResponse = await fetch(`/api/users/profile/${publicId}`);
      
      if (!profileResponse.ok) {
        if (profileResponse.status === 404) {
          throw new Error("ユーザーが見つかりません");
        }
        throw new Error("プロフィールの取得に失敗しました");
      }
      
      const profileResult = await profileResponse.json();
      
      if (!profileResult.success || !profileResult.data) {
        throw new Error("プロフィールデータが不正です");
      }
      
      setProfileData(profileResult.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, [publicId]);

  useEffect(() => {
    if (publicId) {
      fetchProfileData();
    }
  }, [publicId, fetchProfileData]);

  // 通報処理
  const handleReportUser = async (reportData: CreateUserReportRequest) => {
    try {
      if (!user) {
        throw new Error('ログインが必要です');
      }

      const response = await fetch(`/api/users/${profileData?.profile.uid}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify(reportData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '通報の送信に失敗しました');
      }

      const result = await response.json();
      alert(result.message || '通報を受け付けました');
    } catch (error) {
      throw error; // ReportUserModalでエラーハンドリング
    }
  };

  // Loading state
  if (loading) {
    return <ProfileLoading />;
  }

  // Error state
  if (error || !profileData) {
    return (
      <ProfileError
        error={error}
        publicId={publicId}
        onGoHome={() => router.push("/")}
      />
    );
  }

  const { profile, posts } = profileData;

  return (
    <div className="min-h-screen bg-background">
      <div className={containerClasses}>
        <ProfileInfoSection
          profile={profile}
          photoURL={profile.photoURL}
          displayName={profile.displayName}
          onBack={() => router.back()}
          isOwnProfile={!!isOwnProfile}
          onEditProfile={() => setShowEditModal(true)}
          onReportUser={() => setShowReportModal(true)}
        />

        <ProfileTabsSection
          posts={posts}
          isOwnProfile={!!isOwnProfile}
          isMobile={isMobile}
          layoutPhase={layoutPhase}
          uid={profile.uid}
        />
      </div>
      
      {showEditModal && (
        <ProfileEditModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onUpdate={() => {
            setShowEditModal(false);
            fetchProfileData();
          }}
        />
      )}

      {showReportModal && (
        <ReportUserModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          targetUserId={profile.uid}
          targetUsername={profile.displayName || profile.username || 'Unknown'}
          onSubmit={handleReportUser}
        />
      )}
    </div>
  );
}
