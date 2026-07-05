'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import styles from './Header.module.css';

export default function Header() {
  const pathname = usePathname();

  // Determine page title based on path
  const getPageTitle = () => {
    switch (pathname) {
      case '/':
        return 'Dashboard Overview';
      case '/briefing':
        return 'Daily Briefing';
      case '/chat':
        return 'Taro Assistant Chat';
      case '/agents':
        return 'Agent Command Center';
      case '/system':
        return 'System Node Health';
      default:
        return 'Taro OS';
    }
  };

  return (
    <header className={styles.header}>
      <h1 className={styles.title}>{getPageTitle()}</h1>
      
      <div className={styles.meta}>
        <div className={styles.systemBadge}>
          <span className={styles.onlineDot} />
          <span>Local Area Network Node</span>
        </div>
      </div>
    </header>
  );
}
