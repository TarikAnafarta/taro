'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import styles from './Sidebar.module.css';

export default function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const menuItems = [
    { name: 'Ana Sayfa', path: '/' },
    { name: 'İlgi Alanları', path: '/interests' },
    { name: 'Günlük Özet', path: '/briefing' },
    { name: 'Asistan', path: '/chat' },
    { name: 'Ajanlar', path: '/agents' },
    { name: 'Sistem Durumu', path: '/system' },
  ];

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
      <div className={styles.logoContainer}>
        <span className={styles.logoText}>Taro</span>
        {onClose && (
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
                >
                  <span className={styles.itemText}>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={styles.footer}>
        <div className={styles.userSection}>
          <div className={styles.avatar}>
            {user?.username?.substring(0, 2).toUpperCase() || 'TR'}
          </div>
          <div className={styles.userInfo}>
            <div className={styles.username}>{user?.username || 'Kullanıcı'}</div>
          </div>
        </div>
        <button onClick={logout} className={styles.logoutBtn} id="logout-button">
          Çıkış
        </button>
      </div>
    </aside>
  );
}
