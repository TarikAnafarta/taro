'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from './Sidebar';
import Header from './Header';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isOnboarded, isLoading } = useAuth();

  const isAuthPage = pathname === '/login' || pathname === '/register';
  const isOnboardingPage = pathname === '/onboarding';

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated && !isAuthPage) {
      router.push('/login');
    } else if (isAuthenticated && !isOnboarded && !isOnboardingPage) {
      router.push('/onboarding');
    } else if (isAuthenticated && isOnboarded && (isAuthPage || isOnboardingPage)) {
      router.push('/');
    }
  }, [isLoading, isAuthenticated, isOnboarded, isAuthPage, isOnboardingPage, router]);

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0e1a'
      }}>
        <LoadingSpinner />
      </div>
    );
  }

  // Auth sayfaları (giriş, kayıt)
  if (isAuthPage) {
    return <>{children}</>;
  }

  // Onboarding sihirbazı
  if (isOnboardingPage) {
    return <>{children}</>;
  }

  // Standart kimlik doğrulamalı dashboard
  if (isAuthenticated && isOnboarded) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0e1a' }}>
        <Sidebar />
        <div style={{ flex: 1, paddingLeft: '260px', display: 'flex', flexDirection: 'column' }}>
          <Header />
          <main style={{ flex: 1, padding: '2rem', boxSizing: 'border-box' }}>
            {children}
          </main>
        </div>
      </div>
    );
  }

  // Yönlendirme beklenirken göster
  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0e1a'
    }}>
      <LoadingSpinner />
    </div>
  );
}
