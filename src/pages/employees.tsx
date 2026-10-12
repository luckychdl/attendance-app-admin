import { type FormEvent, useState } from 'react';

import { adminApi } from '@/api/admin';
import { errorMessage } from '@/api/client';
import type { AdminEmployee, EmployeePatch, EmployeeRole } from '@/api/types';
import { Empty, ErrorNote, Field, Modal, PageHeader, Pill } from '@/components/ui';
import { useMe } from '@/hooks/use-auth';
import { useQuery } from '@/hooks/use-query';
import { formatDays, formatFullDate, todayKey } from '@/lib/format';

const ROLE_LABEL: Record<EmployeeRole, string> = { manager: '관리자', member: '팀원' };

type Draft = {
  employeeNo: string;
  name: string;
  department: string;
  position: string;
  role: EmployeeRole;
  hiredAt: string;
  /** 비워 두면 근속연수로 계산한다. */
  annualLeaveDays: string;
  active: boolean;
  password: string;
};

function toDraft(employee: AdminEmployee | null): Draft {
  return {
    employeeNo: employee?.employeeNo ?? '',
    name: employee?.name ?? '',
    department: employee?.department ?? '',
    position: employee?.position ?? '',
    role: employee?.role ?? 'member',
    hiredAt: employee?.hiredAt ?? todayKey(),
    annualLeaveDays: employee?.annualLeaveDays == null ? '' : String(employee.annualLeaveDays),
    active: employee?.active ?? true,
    password: '',
  };
}

function EmployeeForm({
  employee,
  departments,
  onSaved,
  onClose,
}: {
  /** null 이면 새 직원 */
  employee: AdminEmployee | null;
  departments: string[];
  onSaved: (saved: AdminEmployee) => void;
  onClose: () => void;
}) {
  const me = useMe();
  const isSelf = employee?.id === me.id;
  const [draft, setDraft] = useState(() => toDraft(employee));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (!employee) {
        onSaved(
          await adminApi.createEmployee({
            employeeNo: draft.employeeNo,
            name: draft.name,
            department: draft.department,
            position: draft.position,
            role: draft.role,
            hiredAt: draft.hiredAt,
            password: draft.password,
          }),
        );
        return;
      }

      const patch: EmployeePatch = {
        name: draft.name,
        department: draft.department,
        position: draft.position,
        hiredAt: draft.hiredAt,
        annualLeaveDays: draft.annualLeaveDays === '' ? null : Number(draft.annualLeaveDays),
      };
      // 본인의 권한과 재직 상태는 서버가 받지 않는다.
      if (!isSelf) {
        patch.role = draft.role;
        patch.active = draft.active;
      }
      if (draft.password) patch.password = draft.password;
      onSaved(await adminApi.updateEmployee(employee.id, patch));
    } catch (caught) {
      setError(errorMessage(caught));
      setBusy(false);
    }
  }

  return (
    <Modal title={employee ? `${employee.name} 정보 수정` : '직원 추가'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <div className="form-grid">
          <Field label="사번" hint={employee ? '사번은 바꿀 수 없습니다.' : '로그인할 때 씁니다.'}>
            <input
              value={draft.employeeNo}
              onChange={(event) => set('employeeNo', event.target.value)}
              disabled={!!employee}
              maxLength={32}
              required
            />
          </Field>
          <Field label="이름">
            <input
              value={draft.name}
              onChange={(event) => set('name', event.target.value)}
              maxLength={30}
              required
            />
          </Field>
          <Field label="부서">
            <input
              value={draft.department}
              onChange={(event) => set('department', event.target.value)}
              list="departments"
              maxLength={30}
              required
            />
            <datalist id="departments">
              {departments.map((department) => (
                <option key={department} value={department} />
              ))}
            </datalist>
          </Field>
          <Field label="직급">
            <input
              value={draft.position}
              onChange={(event) => set('position', event.target.value)}
              maxLength={30}
              required
            />
          </Field>
          <Field
            label="권한"
            hint={
              isSelf
                ? '본인의 권한은 바꿀 수 없습니다.'
                : '관리자는 같은 부서의 휴가를 결재하고 이 페이지를 씁니다.'
            }
          >
            <select
              value={draft.role}
              onChange={(event) => set('role', event.target.value as EmployeeRole)}
              disabled={isSelf}
            >
              <option value="member">팀원</option>
              <option value="manager">관리자</option>
            </select>
          </Field>
          <Field label="입사일" hint="연차 부여 일수의 기준입니다.">
            <input
              type="date"
              value={draft.hiredAt}
              onChange={(event) => set('hiredAt', event.target.value)}
              required
            />
          </Field>
          {employee && (
            <Field label="연간 연차" hint="비워 두면 입사일로 계산합니다.">
              <input
                type="number"
                value={draft.annualLeaveDays}
                onChange={(event) => set('annualLeaveDays', event.target.value)}
                min={0}
                max={60}
                step={0.5}
                placeholder={`자동 (올해 ${formatDays(employee.leave.granted)}일)`}
              />
            </Field>
          )}
          <Field
            label={employee ? '새 비밀번호' : '비밀번호'}
            hint={employee ? '바꿀 때만 입력합니다. 4자 이상' : '4자 이상'}
          >
            <input
              type="password"
              value={draft.password}
              onChange={(event) => set('password', event.target.value)}
              autoComplete="new-password"
              minLength={4}
              maxLength={128}
              required={!employee}
            />
          </Field>
        </div>

        {employee && !isSelf && (
          <label className="check">
            <input
              type="checkbox"
              checked={!draft.active}
              onChange={(event) => set('active', !event.target.checked)}
            />
            <span>
              퇴사 처리
              <small>로그인이 바로 막힙니다. 근태와 휴가 기록은 남습니다.</small>
            </span>
          </label>
        )}

        {error && (
          <div className="note note-error" role="alert">
            {error}
          </div>
        )}

        <div className="form-actions">
          <button type="button" className="button button-quiet" onClick={onClose}>
            취소
          </button>
          <button type="submit" className="button button-primary" disabled={busy}>
            {employee ? '변경 내용 저장' : '직원 추가'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function EmployeesPage() {
  const me = useMe();
  const query = useQuery(() => adminApi.employees(), []);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  /** 'new' 는 추가, 직원이면 수정 */
  const [editing, setEditing] = useState<AdminEmployee | 'new' | null>(null);

  const all = query.data ?? [];
  const inactiveCount = all.filter((employee) => !employee.active).length;
  const keyword = search.trim().toLowerCase();
  const rows = all.filter(
    (employee) =>
      (showInactive || employee.active) &&
      (!keyword ||
        [employee.name, employee.employeeNo, employee.department, employee.position].some((text) =>
          text.toLowerCase().includes(keyword),
        )),
  );
  const departments = [...new Set(all.map((employee) => employee.department))].sort((a, b) =>
    a.localeCompare(b, 'ko'),
  );

  return (
    <>
      <PageHeader
        title="직원"
        description={`재직 ${all.length - inactiveCount}명${inactiveCount ? `, 퇴사 ${inactiveCount}명` : ''}`}
      >
        <button type="button" className="button button-primary" onClick={() => setEditing('new')}>
          직원 추가
        </button>
      </PageHeader>

      <div className="toolbar">
        <input
          type="search"
          className="search"
          placeholder="이름, 사번, 부서로 찾기"
          aria-label="직원 찾기"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        {inactiveCount > 0 && (
          <label className="check check-inline">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(event) => setShowInactive(event.target.checked)}
            />
            <span>퇴사자 포함</span>
          </label>
        )}
      </div>

      {query.error && <ErrorNote message={query.error} onRetry={query.reload} />}

      {rows.length === 0 ? (
        !query.error && (
          <Empty>
            {query.loading ? '직원 목록을 불러오는 중입니다.' : '조건에 맞는 직원이 없습니다.'}
          </Empty>
        )
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>사번</th>
                <th>이름</th>
                <th>부서</th>
                <th>권한</th>
                <th>입사일</th>
                <th>올해 연차</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((employee) => {
                const { granted, used, pending, remaining } = employee.leave;
                const share = (days: number) => `${granted > 0 ? (days / granted) * 100 : 0}%`;
                return (
                  <tr key={employee.id} className={employee.active ? '' : 'row-inactive'}>
                    <td className="figure">{employee.employeeNo}</td>
                    <td>
                      <strong>{employee.name}</strong>
                      <span className="sub">{employee.position}</span>
                      {employee.id === me.id && <span className="sub">나</span>}
                    </td>
                    <td>{employee.department}</td>
                    <td>
                      {!employee.active ? (
                        <Pill tone="muted">퇴사</Pill>
                      ) : employee.role === 'manager' ? (
                        <Pill tone="accent">{ROLE_LABEL.manager}</Pill>
                      ) : (
                        ROLE_LABEL.member
                      )}
                    </td>
                    <td className="nowrap">{formatFullDate(employee.hiredAt)}</td>
                    <td>
                      <div className="leave-meter">
                        <span className="leave-text">
                          <strong className="figure">{formatDays(remaining)}</strong>일 남음
                          <span className="sub">
                            {formatDays(granted)}일 중 {formatDays(used)}일 사용
                            {pending > 0 ? `, ${formatDays(pending)}일 대기` : ''}
                          </span>
                        </span>
                        <span className="meter" aria-hidden>
                          <span className="meter-used" style={{ width: share(used) }} />
                          <span className="meter-pending" style={{ width: share(pending) }} />
                        </span>
                      </div>
                    </td>
                    <td className="num">
                      <button
                        type="button"
                        className="button button-quiet"
                        onClick={() => setEditing(employee)}
                      >
                        수정
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <EmployeeForm
          employee={editing === 'new' ? null : editing}
          departments={departments}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void query.reload();
          }}
        />
      )}
    </>
  );
}
