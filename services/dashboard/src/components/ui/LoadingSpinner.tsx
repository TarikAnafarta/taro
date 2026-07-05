import styles from './LoadingSpinner.module.css';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  label?: string;
}

export default function LoadingSpinner({
  size = 'md',
  color,
  label,
}: LoadingSpinnerProps) {
  const sizeMap = { sm: 20, md: 32, lg: 48 };
  const px = sizeMap[size];

  return (
    <div className={styles.wrapper} role="status" aria-label={label || 'Loading'}>
      <svg
        className={styles.spinner}
        width={px}
        height={px}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          className={styles.track}
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle
          className={styles.arc}
          cx="12"
          cy="12"
          r="10"
          stroke={color || 'var(--color-primary)'}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="31.4 31.4"
        />
      </svg>
      {label && <span className={styles.label}>{label}</span>}
    </div>
  );
}
