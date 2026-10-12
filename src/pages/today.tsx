import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { adminApi } from '@/api/admin';
import type { AdminEmployee, AttendanceRecord, LeaveRequest, Worksite } from '@/api/types';
import { Empty, ErrorNote, PageHeader, Pill } from '@/components/ui';
import { useQuery } from '@/hooks/use-query';
import {
  ATTENDANCE_STATUS,
  formatClock,
  formatDate,
  formatTime,
  isLate,
  LEAVE_TYPE,
  leaveWindow,
  type Tone,
  workEnd,
  workStart,
  zoned,
} from '@/lib/format';

/** 출근 시각을 이만큼 넘기도록 기록이 없으면 "미출근"으로 강조한다. 서버의 지각 여유와 같다. */
const GRACE_MINUTES = 5;
const REFRESH_MS = 60_000;

type Row = {
  employee: AdminEmployee;
  record: AttendanceRecord | null;
  leaves: LeaveRequest[];
  label: string;
  tone: Tone;
  /** 요약 숫자에서 어디에 세는지 */
  bucket: 'present' | 'leave' | 'absent';
};

function buildRow(
  employee: AdminEmployee,
  record: AttendanceRecord | null,
  leaves: LeaveRequest[],
  worksite: Worksite,
  nowMinutes: number,
): Row {
  const base = { employee, record, leaves };
  if (record) return { ...base, ...ATTENDANCE_STATUS[record.status], bucket: 'present' };

  // 지금 시각이 휴가 시간대 안이거나 하루를 통째로 쉬면 휴가로 센다.
  const current =
    leaves.find((leave) => leave.type === 'annual') ??
    leaves.find((leave) => {
      const window = leaveWindow(leave, worksite);
      const begun = nowMinutes >= window.start || window.start <= workStart(worksite);
      return begun && nowMinutes < window.end;
    });
  if (current) return { ...base, label: LEAVE_TYPE[current.type], tone: 'muted', bucket: 'leave' };

  const overdue = nowMinutes > workStart(worksite) + GRACE_MINUTES;
  return {
    ...base,
    label: overdue ? '미출근' : '출근 전',
    tone: overdue ? 'warn' : 'muted',
    bucket: 'absent',
  };
}

export function TodayPage() {
  const query = useQuery(
    () => Promise.all([adminApi.overview(), adminApi.employees(), adminApi.worksite()]),
    [],
  );
  const { reload } = query;

  // 현황판은 켜 두고 보는 화면이라 1분마다 새로 읽는다.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
      void reload();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [reload]);

  const view = useMemo(() => {
    if (!query.data) return null;
    const [overview, employees, worksite] = query.data;
    const at = zoned(now);
    // 서버 날짜가 넘어갔는데 화면이 아직 어제 데이터를 들고 있으면 하루가 끝난 것으로 그린다.
    const nowMinutes = at.dateKey === overview.date ? at.minutes : 24 * 60;

    const rows = employees
      .filter((employee) => employee.active)
      .map((employee) =>
        buildRow(
          employee,
          overview.records.find((record) => record.employeeId === employee.id) ?? null,
          overview.leaves.filter((leave) => leave.employeeId === employee.id),
          worksite,
          nowMinutes,
        ),
      )
      .sort(
        (a, b) =>
          a.employee.department.localeCompare(b.employee.department, 'ko') ||
          a.employee.employeeNo.localeCompare(b.employee.employeeNo),
      );

    // 축은 근무시간 앞뒤로 여유를 두되, 그 밖에서 찍힌 기록이 있으면 거기까지 넓힌다.
    let start = Math.max(0, Math.floor(workStart(worksite) / 60) - 2) * 60;
    let end = Math.min(24, Math.ceil(workEnd(worksite) / 60) + 3) * 60;
    for (const record of overview.records) {
      start = Math.min(start, Math.floor(zoned(record.checkInAt).minutes / 60) * 60);
      const out = record.checkOutAt ? zoned(record.checkOutAt) : null;
      const until = !out ? nowMinutes : out.dateKey === overview.date ? out.minutes : 24 * 60;
      end = Math.max(end, Math.min(24, Math.ceil(until / 60)) * 60);
    }
    const overdue = nowMinutes > workStart(worksite) + GRACE_MINUTES;
    return { overview, worksite, rows, nowMinutes, overdue, axis: { start, end } };
  }, [query.data, now]);

  if (!view) {
    return (
      <>
        <PageHeader title="오늘 현황" />
        {query.error ? (
          <ErrorNote message={query.error} onRetry={reload} />
        ) : (
          <Empty>현황을 불러오는 중입니다.</Empty>
        )}
      </>
    );
  }

  const { overview, worksite, rows, nowMinutes, overdue, axis } = view;
  const count = (test: (row: Row) => boolean) => rows.filter(test).length;
  const present = count((row) => row.bucket === 'present');
  const late = count((row) => !!row.record && isLate(row.record.status));
  const position = (minutes: number) =>
    `${(Math.min(Math.max(minutes, axis.start), axis.end) - axis.start) / (axis.end - axis.start) * 100}%`;
  const hours: number[] = [];
  for (let minutes = axis.start; minutes <= axis.end; minutes += 120) hours.push(minutes);

  return (
    <>
      <PageHeader
        title="오늘 현황"
        description={`${formatDate(overview.date)}, ${worksite.name} ${formatClock(workStart(worksite))}–${formatClock(workEnd(worksite))} 근무`}
      />
      {query.error && <ErrorNote message={query.error} onRetry={reload} />}

      <section className="tally" aria-label="오늘 요약">
        <div className="tally-lead">
          <span className="figure figure-hero">{present}</span>
          <span className="tally-of">/ {rows.length}명 출근</span>
        </div>
        <dl className="tally-rest">
          <div>
            <dt>지각</dt>
            <dd className={`figure ${late > 0 ? 'tone-warn' : ''}`}>{late}</dd>
          </div>
          <div>
            <dt>휴가</dt>
            <dd className="figure">{count((row) => row.bucket === 'leave')}</dd>
          </div>
          <div>
            <dt>{overdue ? '미출근' : '출근 전'}</dt>
            <dd className="figure">{count((row) => row.bucket === 'absent')}</dd>
          </div>
        </dl>
        {overview.pendingLeaves > 0 && (
          <Link to="/leaves" className="tally-link">
            결재를 기다리는 휴가 {overview.pendingLeaves}건 보기
          </Link>
        )}
      </section>

      {rows.length === 0 ? (
        <Empty>재직 중인 직원이 없습니다.</Empty>
      ) : (
        <section className="board" aria-label="직원별 근무 시간">
          <div className="board-row board-head" aria-hidden>
            <span />
            <span />
            <div className="axis">
              {hours.map((minutes) => (
                <span key={minutes} style={{ left: position(minutes) }}>
                  {minutes / 60}시
                </span>
              ))}
            </div>
          </div>

          {rows.map(({ employee, record, leaves, label, tone }) => {
            const from = record ? zoned(record.checkInAt).minutes : 0;
            const checkOut = record?.checkOutAt ? zoned(record.checkOutAt) : null;
            // 자정을 넘겨 퇴근했으면 축의 끝까지 그린다.
            const to = checkOut
              ? checkOut.dateKey === overview.date
                ? checkOut.minutes
                : axis.end
              : nowMinutes;

            return (
              <div className="board-row" key={employee.id}>
                <div className="board-who">
                  <strong>{employee.name}</strong>
                  <span>
                    {employee.department} {employee.position}
                  </span>
                </div>
                <div className="board-state">
                  <Pill tone={tone}>{label}</Pill>
                  <span className="board-times">
                    {record
                      ? `${formatTime(record.checkInAt)} – ${record.checkOutAt ? formatTime(record.checkOutAt) : ''}`
                      : ''}
                  </span>
                </div>
                <div className="track">
                  <span
                    className="track-shift"
                    style={{
                      left: position(workStart(worksite)),
                      right: `calc(100% - ${position(workEnd(worksite))})`,
                    }}
                  />
                  {leaves.map((leave) => {
                    const window = leaveWindow(leave, worksite);
                    return (
                      <span
                        key={leave.id}
                        className="track-leave"
                        title={LEAVE_TYPE[leave.type]}
                        style={{
                          left: position(window.start),
                          right: `calc(100% - ${position(window.end)})`,
                        }}
                      />
                    );
                  })}
                  {record && (
                    <span
                      className={`track-span tone-bg-${tone} ${record.checkOutAt ? '' : 'track-span-open'}`}
                      style={{ left: position(from), right: `calc(100% - ${position(to)})` }}
                    />
                  )}
                  {nowMinutes >= axis.start && nowMinutes <= axis.end && (
                    <span className="track-now" style={{ left: position(nowMinutes) }} />
                  )}
                </div>
                {record?.note && <p className="board-note">사유: {record.note}</p>}
              </div>
            );
          })}
        </section>
      )}
    </>
  );
}
