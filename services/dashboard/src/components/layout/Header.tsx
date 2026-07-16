'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import styles from './Header.module.css';
import { useTheme } from '@/contexts/ThemeContext';

export default function Header({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  const getPageTitle = () => {
    switch (pathname) {
      case '/':
        return 'Ana Sayfa';
      case '/briefing':
        return 'Günlük Özet';
      case '/chat':
        return 'Taro Asistan';
      case '/interests':
        return 'İlgi Alanları';
      default:
        return 'Ana Sayfa';
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.titleContainer}>
        <button onClick={onToggleSidebar} className={styles.menuButton} aria-label="Menüyü Aç">
          ☰
        </button>
        <h1 className={styles.title}>{getPageTitle()}</h1>
      </div>
      
      <div className={styles.meta}>
        <button onClick={toggleTheme} className={styles.themeToggle} aria-label="Temayı Değiştir">
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>
    </header>
  );
}
