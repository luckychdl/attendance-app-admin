import { type FormEvent, useState } from 'react';

import { errorMessage } from '@/api/client';
import { Field } from '@/components/ui';
import { lastCompany, useAuth } from '@/hooks/use-auth';

export function LoginPage() {
  const { login } = useAuth();
  const [companyName, setCompanyName] = useState(lastCompany);
  const [employeeNo, setEmployeeNo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(companyName, employeeNo, password);
    } catch (caught) {
      setError(errorMessage(caught));
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <form className="login-card" onSubmit={submit}>
        <span className="brand-mark brand-mark-large" aria-hidden />
        <h1>출근체크 관리자</h1>
        <p>앱에서 쓰는 관리자 계정으로 로그인합니다.</p>

        <Field label="회사명">
          <input
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            autoComplete="organization"
            autoFocus={!companyName}
            required
          />
        </Field>
        <Field label="사번">
          <input
            value={employeeNo}
            onChange={(event) => setEmployeeNo(event.target.value)}
            autoComplete="username"
            autoFocus={!!companyName}
            required
          />
        </Field>
        <Field label="비밀번호">
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </Field>

        {error && (
          <div className="note note-error" role="alert">
            {error}
          </div>
        )}

        <button type="submit" className="button button-primary button-wide" disabled={busy}>
          {busy ? '로그인하는 중' : '로그인'}
        </button>
      </form>
    </div>
  );
}
