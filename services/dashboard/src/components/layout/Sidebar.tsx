'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const menuItems = [
    { name: 'Home', path: '/', icon: '🏠' },
    { name: 'Daily Briefing', path: '/briefing', icon: '📋' },
    { name: 'Chat Assistant', path: '/chat', icon: '💬' },
    { name: 'Agents', path: '/agents', icon: '🤖' },
    { name: 'System status', path: '/system', icon: '⚙️' },
  ];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoContainer}>
        <span className={styles.logoIcon}>🌿</span>
        <span className={styles.logoText}>Taro</span>
      </div>
      
      <nav className={styles.nav}>
        <ul className={styles.navList}>
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <li key={item.path} className={styles.navItem}>
                <Link
                  href={item.path}
                  className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                >
                  <span className={styles.itemIcon}>{item.icon}</span>
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
            {user?.username?.substring(0, 2).toUpperCase() || 'TA'}
          </div>
          <div className={styles.userInfo}>
            <div className={styles.username}>{user?.username || 'User'}</div>
            <div className={styles.userRole}>Operator</div>
          </div>
        </div>
        <button onClick={logout} className={styles.logoutBtn} id="logout-button">
          Sign Out
        </button>
      </div>
    </aside>
  );
}
