import { classNames } from '@/lib/utils';
import styles from './StatusBadge.module.css';

interface StatusBadgeProps {
  status: string;
  label?: string;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, label, size = 'md' }: StatusBadgeProps) {
  const normalized = status.toLowerCase();

  const variant =
    normalized === 'healthy' || normalized === 'online' || normalized === 'active'
      ? 'success'
      : normalized === 'degraded' || normalized === 'warning'
        ? 'warning'
        : normalized === 'unhealthy' || normalized === 'error' || normalized === 'offline'
          ? 'danger'
          : 'neutral';

  const displayLabel = label || status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={classNames(
        styles.badge,
        styles[variant],
        size === 'sm' && styles.sm,
      )}
    >
      <span className={styles.dot} />
      {displayLabel}
    </span>
  );
}
