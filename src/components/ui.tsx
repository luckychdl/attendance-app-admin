import { type ReactNode, useEffect, useRef } from 'react';

import type { Tone } from '@/lib/format';

export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  /** 제목 오른쪽에 놓는 동작 */
  children?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children && <div className="page-actions">{children}</div>}
    </header>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

/** 읽기에 실패했을 때. 무엇이 잘못됐는지와 다시 시도할 길을 함께 준다. */
export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="note note-error" role="alert">
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="button button-quiet" onClick={onRetry}>
          다시 시도
        </button>
      )}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // 바깥(backdrop)을 누르면 닫는다.
      onMouseDown={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <div className="modal-body">
        <h2>{title}</h2>
        {children}
      </div>
    </dialog>
  );
}
