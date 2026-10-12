import { useMemo, useState } from 'react';

import { adminApi } from '@/api/admin';
import type { AttendanceStatus } from '@/api/types';
import { Empty, ErrorNote, PageHeader, Pill } from '@/components/ui';
import { useQuery } from '@/hooks/use-query';
import { downloadCsv } from '@/lib/csv';
import {
  ATTENDANCE_STATUS,
  formatDate,
  formatDuration,
  formatTime,
  isLate,
  monthRange,
  todayKey,
} from '@/lib/format';

type StatusFilter = 'all' | 'late' | 'earlyLeave' | 'missingCheckOut' | 'noted';

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'late', label: '지각' },
  { value: 'earlyLeave', label: '조기 퇴근' },
  { value: 'missingCheckOut', label: '퇴근 미체크' },
  { value: 'noted', label: '사유 있음' },
];

const isEarlyLeave = (status: AttendanceStatus) =>
  status === 'earlyLeave' || status === 'lateAndEarlyLeave';

export function AttendancePage() {
  const [month, setMonth] = useState(() => todayKey().slice(0, 7));
  const [employeeId, setEmployeeId] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');

  const employees = useQuery(() => adminApi.employees(), []);
  const records = useQuery(() => {
    const { from, to } = monthRange(month);
    return adminApi.attendance(from, to, employeeId || undefined);
  }, [month, employeeId]);

  const byId = useMemo(
    () => new Map((employees.data ?? []).map((employee) => [employee.id, employee])),
    [employees.data],
  );

  const all = records.data ?? [];
  const rows = all.filter((record) => {
    if (filter === 'late') return isLate(record.status);
    if (filter === 'earlyLeave') return isEarlyLeave(record.status);
    if (filter === 'missingCheckOut') return record.status === 'missingCheckOut';
    if (filter === 'noted') return !!record.note;
    return true;
  });
  const worked = all.reduce((sum, record) => sum + (record.workedMinutes ?? 0), 0);

  function exportCsv() {
    downloadCsv(`근태기록-${month}.csv`, [
      ['근무일', '사번', '이름', '부서', '출근', '퇴근', '근무시간(분)', '상태', '사유'],
      ...rows.map((record) => {
        const employee = byId.get(record.employeeId);
        return [
          record.workDate,
          employee?.employeeNo ?? '',
          employee?.name ?? '',
          employee?.department ?? '',
          formatTime(record.checkInAt),
          record.checkOutAt ? formatTime(record.checkOutAt) : '',
          record.workedMinutes,
          ATTENDANCE_STATUS[record.status].label,
          record.note,
        ];
      }),
    ]);
  }

  const error = records.error ?? employees.error;

  return (
    <>
      <PageHeader title="근태 기록" description="한 달 동안의 출퇴근 기록을 직원별로 확인합니다.">
        <button
          type="button"
          className="button"
          onClick={exportCsv}
          disabled={rows.length === 0}
        >
          CSV로 내려받기
        </button>
      </PageHeader>

      <div className="toolbar">
        <label className="inline-field">
          <span>월</span>
          <input
            type="month"
            value={month}
            max={todayKey().slice(0, 7)}
            onChange={(event) => event.target.value && setMonth(event.target.value)}
          />
        </label>
        <label className="inline-field">
          <span>직원</span>
          <select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
            <option value="">전체 직원</option>
            {(employees.data ?? []).map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name} ({employee.employeeNo}){employee.active ? '' : ' 퇴사'}
              </option>
            ))}
          </select>
        </label>
        <div className="segmented" role="group" aria-label="상태로 거르기">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={filter === item.value}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorNote message={error} onRetry={records.reload} />}

      {records.data && (
        <p className="summary-line">
          기록 <strong className="figure">{all.length}</strong>건, 지각{' '}
          <strong className="figure">{all.filter((r) => isLate(r.status)).length}</strong>건, 조기
          퇴근 <strong className="figure">{all.filter((r) => isEarlyLeave(r.status)).length}</strong>
          건, 총 근무 <strong>{formatDuration(worked)}</strong>
        </p>
      )}

      {rows.length === 0 ? (
        !error && (
          <Empty>
            {records.loading
              ? '기록을 불러오는 중입니다.'
              : all.length === 0
                ? '이 달에는 출퇴근 기록이 없습니다.'
                : '조건에 맞는 기록이 없습니다.'}
          </Empty>
        )
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>근무일</th>
                <th>직원</th>
                <th className="num">출근</th>
                <th className="num">퇴근</th>
                <th className="num">근무시간</th>
                <th>상태</th>
                <th>사유</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((record) => {
                const employee = byId.get(record.employeeId);
                const status = ATTENDANCE_STATUS[record.status];
                return (
                  <tr key={record.id}>
                    <td className="nowrap">{formatDate(record.workDate)}</td>
                    <td>
                      <strong>{employee?.name ?? '알 수 없음'}</strong>
                      <span className="sub">{employee?.department}</span>
                    </td>
                    <td className="num figure">{formatTime(record.checkInAt)}</td>
                    <td className="num figure">{formatTime(record.checkOutAt)}</td>
                    <td className="num">{formatDuration(record.workedMinutes)}</td>
                    <td>
                      <Pill tone={status.tone}>{status.label}</Pill>
                    </td>
                    <td className="wrap">{record.note}</td>
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
