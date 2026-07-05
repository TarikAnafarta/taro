'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import styles from './Header.module.css';

export default function Header() {
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
      default:
        return 'Taro OS';
    }
  };

  return (
    <header className={styles.header}>
      <h1 className={styles.title}>{getPageTitle()}</h1>
    </header>
  );
}
