'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import styles from './Sidebar.module.css';

export default function Sidebar({ isOpen, onClose, isCollapsed }: { isOpen?: boolean; onClose?: () => void; isCollapsed?: boolean }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const menuItems = [
    { name: 'Ana Sayfa', path: '/' },
    { name: 'İlgi Alanları', path: '/interests' },
    { name: 'Günlük Özet', path: '/briefing' },
    { name: 'Asistan', path: '/chat' },
  ];

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''} ${isCollapsed ? styles.sidebarCollapsed : ''}`}>
      <div className={styles.logoContainer}>
        <span className={styles.logoText}>{isCollapsed ? 'T' : 'Taro'}</span>
        {onClose && !isCollapsed && (
          <button onClick={onClose} className={styles.closeButton} aria-label="Menüyü Kapat">
            ✕
          </button>
        )}
      </div>
      
      <nav className={styles.nav}>
        <ul className={styles.navList}>
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <li key={item.path} className={styles.navItem}>
                <Link
                  href={item.path}
                  onClick={onClose}
                  className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                  title={item.name}
                >
                  <span className={styles.itemText}>{isCollapsed ? item.name.substring(0, 1) : item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={styles.footer}>
        {!isCollapsed && (
          <div className={styles.userSection}>
            <div className={styles.avatar}>
              {user?.username?.substring(0, 2).toUpperCase() || 'TR'}
            </div>
            <div className={styles.userInfo}>
              <div className={styles.username}>{user?.username || 'Kullanıcı'}</div>
            </div>
          </div>
        )}
        <button onClick={logout} className={styles.logoutBtn} id="logout-button" title="Çıkış">
          {isCollapsed ? '🚪' : 'Çıkış'}
        </button>
      </div>
    </aside>
  );
}
