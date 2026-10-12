import { useState } from 'react';

import { adminApi } from '@/api/admin';
import { errorMessage } from '@/api/client';
import type { LeaveRequest } from '@/api/types';
import { useLayout } from '@/components/layout';
import { Empty, ErrorNote, PageHeader, Pill } from '@/components/ui';
import { useMe } from '@/hooks/use-auth';
import { useQuery } from '@/hooks/use-query';
import {
  formatDays,
  formatFullDate,
  formatLeavePeriod,
  LEAVE_STATUS,
  LEAVE_TYPE,
  todayKey,
  zoned,
} from '@/lib/format';

type Tab = 'pending' | 'all';

export function LeavesPage() {
  const me = useMe();
  const { refreshPending } = useLayout();
  const [tab, setTab] = useState<Tab>('pending');
  const [year, setYear] = useState(() => Number(todayKey().slice(0, 4)));
  /** 결재 요청을 보내는 중인 신청 */
  const [busyId, setBusyId] = useState<string | null>(null);
  /** 반려는 되돌릴 수 없으니 한 번 더 누르게 한다. */
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const query = useQuery(
    () =>
      tab === 'pending'
        ? adminApi.leaves({ status: 'pending' })
        : adminApi.leaves({ from: `${year}-01-01`, to: `${year}-12-31` }),
    [tab, year],
  );

  // 대기함은 시작일이 가까운 순으로 본다.
  const rows =
    tab === 'pending'
      ? [...(query.data ?? [])].sort((a, b) => a.startDate.localeCompare(b.startDate))
      : (query.data ?? []);

  async function decide(leave: LeaveRequest, decision: 'approve' | 'reject') {
    setBusyId(leave.id);
    setActionError(null);
    try {
      await adminApi.decideLeave(leave.id, decision);
    } catch (caught) {
      setActionError(errorMessage(caught));
    } finally {
      setBusyId(null);
      setConfirmId(null);
      // 실패했더라도 그 사이 다른 사람이 처리했을 수 있으니 목록을 새로 읽는다.
      await query.reload();
      refreshPending();
    }
  }

  /** 서버 규칙: 같은 부서의 관리자가 결재하고, 본인 신청은 결재하지 않는다. */
  function action(leave: LeaveRequest) {
    if (leave.status !== 'pending') {
      return leave.decidedBy ? <span className="sub">{leave.decidedBy} 결재</span> : null;
    }
    if (leave.employeeId === me.id) return <span className="sub">본인 신청</span>;
    if (leave.department !== me.department) {
      return <span className="sub">{leave.department} 관리자 결재</span>;
    }

    const busy = busyId === leave.id;
    if (confirmId === leave.id) {
      return (
        <div className="row-actions">
          <button
            type="button"
            className="button button-danger"
            disabled={busy}
            onClick={() => decide(leave, 'reject')}
          >
            반려 확정
          </button>
          <button type="button" className="button button-quiet" onClick={() => setConfirmId(null)}>
            취소
          </button>
        </div>
      );
    }
    return (
      <div className="row-actions">
        <button
          type="button"
          className="button button-primary"
          disabled={busy}
          onClick={() => decide(leave, 'approve')}
        >
          승인
        </button>
        <button
          type="button"
          className="button"
          disabled={busy}
          onClick={() => setConfirmId(leave.id)}
        >
          반려
        </button>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="휴가"
        description="회사 전체의 휴가 신청을 확인합니다. 결재는 신청자와 같은 부서의 관리자가 합니다."
      />

      <div className="toolbar">
        <div className="segmented" role="group" aria-label="보기">
          <button type="button" aria-pressed={tab === 'pending'} onClick={() => setTab('pending')}>
            결재 대기
          </button>
          <button type="button" aria-pressed={tab === 'all'} onClick={() => setTab('all')}>
            전체 내역
          </button>
        </div>
        {tab === 'all' && (
          <label className="inline-field">
            <span>연도</span>
            <input
              type="number"
              value={year}
              min={2000}
              max={2100}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (next >= 2000 && next <= 2100) setYear(next);
              }}
            />
          </label>
        )}
      </div>

      {actionError && <ErrorNote message={actionError} />}
      {query.error && <ErrorNote message={query.error} onRetry={query.reload} />}

      {rows.length === 0 ? (
        !query.error && (
          <Empty>
            {query.loading
              ? '신청 내역을 불러오는 중입니다.'
              : tab === 'pending'
                ? '결재를 기다리는 신청이 없습니다.'
                : `${year}년에는 휴가 신청이 없습니다.`}
          </Empty>
        )
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>신청자</th>
                <th>종류</th>
                <th>기간</th>
                <th className="num">일수</th>
                <th>사유</th>
                <th>상태</th>
                <th>신청일</th>
                <th>결재</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((leave) => {
                const status = LEAVE_STATUS[leave.status];
                return (
                  <tr key={leave.id}>
                    <td>
                      <strong>{leave.employeeName}</strong>
                      <span className="sub">{leave.department}</span>
                    </td>
                    <td className="nowrap">{LEAVE_TYPE[leave.type]}</td>
                    <td className="nowrap">{formatLeavePeriod(leave)}</td>
                    <td className="num figure">{formatDays(leave.days)}</td>
                    <td className="wrap">{leave.reason}</td>
                    <td>
                      <Pill tone={status.tone}>{status.label}</Pill>
                    </td>
                    <td className="nowrap">{formatFullDate(zoned(leave.requestedAt).dateKey)}</td>
                    <td>{action(leave)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
