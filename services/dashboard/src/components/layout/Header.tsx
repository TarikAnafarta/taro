'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import styles from './Header.module.css';

export default function Header({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
  const pathname = usePathname();

  // Sayfa başlığını yola göre belirle
  const getPageTitle = () => {
    switch (pathname) {
      case '/':
        return 'Kontrol Paneli';
      case '/briefing':
        return 'Günlük Özet';
      case '/chat':
        return 'Taro Asistan';
      case '/agents':
        return 'Ajan Merkezi';
      case '/system':
        return 'Sistem Durumu';
      case '/interests':
        return 'İlgi Alanları';
      default:
        return 'Taro OS';
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
    </header>
  );
}
