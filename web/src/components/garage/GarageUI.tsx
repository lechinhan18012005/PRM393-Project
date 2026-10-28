import React, { useEffect, useId, useRef } from 'react';
import { ArrowUpRight, Building2, Check, ChevronRight, Inbox, RefreshCw, X } from 'lucide-react';
export function GarageHeading({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="garage-heading">
      <div>
        <div className="garage-eyebrow">
          <Building2 size={13} /> ĐỐI TÁC GARA <ChevronRight size={12} /> KHÔNG GIAN QUẢN LÝ
        </div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="garage-heading-actions">{action}</div>
    </header>
  );
}
export function GarageStat({
  label,
  value,
  detail,
  icon,
  accent = 'orange'
}: {
  label: string;
  value: React.ReactNode;
  detail: string;
  icon: React.ReactNode;
  accent?: string;
}) {
  return (
    <article className="garage-stat">
      <div className="garage-stat-top">
        <span>{label}</span>
        <i className={`garage-icon ${accent}`}>{icon}</i>
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}
export function GaragePanel({
  title,
  description,
  action,
  children,
  className = ''
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`garage-panel ${className}`}>
      <div className="garage-panel-heading">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
export function GarageEmpty({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="garage-empty">
      <span>
        <Inbox size={25} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function GarageError({ message, retry }: { message: string; retry?: () => void }) {
  return message ? (
    <div className="garage-error" role="alert">
      <span>{message}</span>
      {retry && (
        <button onClick={retry}>
          <RefreshCw size={14} />
          Thử lại
        </button>
      )}
    </div>
  ) : null;
}
export function GarageBadge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: string }) {
  return (
    <span className={`garage-badge ${tone}`}>
      {tone === 'green' && <Check size={11} />} {children}
    </span>
  );
}
export function GarageDrawer({
  title,
  description,
  onClose,
  children
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => {
      document.body.style.overflow = old;
      previous?.focus();
    };
  }, []);
  function keys(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    if (e.key !== 'Tab') return;
    const nodes = ref.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]'
    );
    if (!nodes?.length) return;
    const first = nodes[0],
      last = nodes[nodes.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) {
      last.focus();
      e.preventDefault();
    } else if (!e.shiftKey && document.activeElement === last) {
      first.focus();
      e.preventDefault();
    }
  }
  return (
    <div
      className="garage-drawer-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        tabIndex={-1}
        onKeyDown={keys}
        className="garage-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="garage-drawer-heading">
          <div>
            <div className="garage-eyebrow">QUẢN LÝ GARA</div>
            <h2 id={titleId}>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button className="garage-icon-button" aria-label="Đóng" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function GarageLink({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button className="garage-text-button" onClick={onClick}>
      {children}
      <ArrowUpRight size={14} />
    </button>
  );
}
