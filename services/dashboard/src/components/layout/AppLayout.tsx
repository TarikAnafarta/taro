'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from './Sidebar';
import Header from './Header';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isOnboarded, isLoading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const isAuthPage = pathname === '/login' || pathname === '/register';
  const isOnboardingPage = pathname === '/onboarding';

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated && !isAuthPage && pathname !== '/') {
      router.push('/login');
    } else if (isAuthenticated && !isOnboarded && !isOnboardingPage) {
      router.push('/onboarding');
    } else if (isAuthenticated && isOnboarded && (isAuthPage || isOnboardingPage)) {
      router.push('/');
    }
  }, [isLoading, isAuthenticated, isOnboarded, isAuthPage, isOnboardingPage, pathname, router]);

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

  // Giriş yapmamış kullanıcılar için ana sayfa (Landing Page)
  if (!isAuthenticated && pathname === '/') {
    return <>{children}</>;
  }

  // Standart kimlik doğrulamalı dashboard
  if (isAuthenticated && isOnboarded) {
    return (
      <div className="app-layout">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        {isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(2px)',
              zIndex: 999,
            }}
          />
        )}
        <div className="app-main">
          <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
          <main className="app-content">
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
