import type { AttendanceStatus, LeaveRequest, LeaveStatus, LeaveType, Worksite } from '@/api/types';

/** 시각은 보는 사람의 기기가 아니라 회사의 타임존으로 읽는다. */
export const TIME_ZONE: string = import.meta.env.VITE_TIMEZONE || 'Asia/Seoul';

const parts = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** 실제 시각 → 회사 타임존의 날짜(YYYY-MM-DD)와 자정 기준 분 */
export function zoned(value: Date | string) {
  const map: Record<string, string> = {};
  for (const part of parts.formatToParts(new Date(value))) map[part.type] = part.value;
  return {
    dateKey: `${map.year}-${map.month}-${map.day}`,
    minutes: Number(map.hour) * 60 + Number(map.minute),
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** 자정 기준 분 → 09:05 */
export function formatClock(minutes: number) {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

export function parseClock(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

/** ISO 시각 → 09:05 */
export function formatTime(iso: string | null) {
  return iso ? formatClock(zoned(iso).minutes) : '–';
}

/** 492 → 8시간 12분 */
export function formatDuration(minutes: number | null) {
  if (minutes == null) return '–';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}분`;
  return rest === 0 ? `${hours}시간` : `${hours}시간 ${rest}분`;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function utc(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** 2026-10-06 → 10월 6일 (화) */
export function formatDate(dateKey: string) {
  const date = utc(dateKey);
  return `${date.getUTCMonth() + 1}월 ${date.getUTCDate()}일 (${WEEKDAYS[date.getUTCDay()]})`;
}

/** 2026-10-06 → 2026. 10. 6. */
export function formatFullDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return `${year}. ${month}. ${day}.`;
}

export function todayKey() {
  return zoned(new Date()).dateKey;
}

/** 2026-10 → 그 달의 1일 ~ 말일 */
export function monthRange(month: string) {
  const [year, monthNo] = month.split('-').map(Number);
  const last = new Date(Date.UTC(year, monthNo, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${pad(last)}` };
}

/** 소수는 필요한 만큼만. 1 · 0.5 · 0.25 */
export function formatDays(days: number) {
  return String(Math.round(days * 1000) / 1000);
}

export type Tone = 'accent' | 'good' | 'warn' | 'muted';

export const ATTENDANCE_STATUS: Record<AttendanceStatus, { label: string; tone: Tone }> = {
  working: { label: '근무 중', tone: 'accent' },
  normal: { label: '정상', tone: 'good' },
  late: { label: '지각', tone: 'warn' },
  earlyLeave: { label: '조기 퇴근', tone: 'warn' },
  lateAndEarlyLeave: { label: '지각 · 조기 퇴근', tone: 'warn' },
  missingCheckOut: { label: '퇴근 미체크', tone: 'muted' },
};

export const LEAVE_STATUS: Record<LeaveStatus, { label: string; tone: Tone }> = {
  pending: { label: '결재 대기', tone: 'accent' },
  approved: { label: '승인', tone: 'good' },
  rejected: { label: '반려', tone: 'warn' },
  cancelled: { label: '취소', tone: 'muted' },
};

export const LEAVE_TYPE: Record<LeaveType, string> = {
  annual: '연차',
  halfAm: '오전 반차',
  halfPm: '오후 반차',
  hourly: '시차',
};

export const isLate = (status: AttendanceStatus) =>
  status === 'late' || status === 'lateAndEarlyLeave';

/** 10월 7일 (수) ~ 10월 8일 (목) / 10월 12일 (월) 14:00–16:00 */
export function formatLeavePeriod(leave: LeaveRequest) {
  if (leave.startTime && leave.endTime) {
    return `${formatDate(leave.startDate)} ${leave.startTime}–${leave.endTime}`;
  }
  if (leave.startDate === leave.endDate) return formatDate(leave.startDate);
  return `${formatDate(leave.startDate)} ~ ${formatDate(leave.endDate)}`;
}

// ─── 근무 시간대 (서버 lib/leave-rules.ts 와 같은 규칙) ────────

const LUNCH = { start: 12 * 60, end: 13 * 60 };

export const workStart = (worksite: Worksite) => worksite.startHour * 60 + worksite.startMinute;
export const workEnd = (worksite: Worksite) => worksite.endHour * 60 + worksite.endMinute;

/** 반차의 경계. 점심을 뺀 하루 근무의 절반이 지난 시각 (09–18시면 14:00) */
function halfDaySplit(worksite: Worksite) {
  const start = workStart(worksite);
  const end = workEnd(worksite);
  const lunch = Math.max(0, Math.min(end, LUNCH.end) - Math.max(start, LUNCH.start));
  const half = (end - start - lunch) / 2;
  return start < LUNCH.start && start + half > LUNCH.start
    ? start + half + (LUNCH.end - LUNCH.start)
    : start + half;
}

/** 휴가가 하루 중 차지하는 시간대(자정 기준 분). 연차는 근무시간 전체 */
export function leaveWindow(leave: LeaveRequest, worksite: Worksite) {
  switch (leave.type) {
    case 'halfAm':
      return { start: workStart(worksite), end: halfDaySplit(worksite) };
    case 'halfPm':
      return { start: halfDaySplit(worksite), end: workEnd(worksite) };
    case 'hourly':
      return leave.startTime && leave.endTime
        ? { start: parseClock(leave.startTime), end: parseClock(leave.endTime) }
        : { start: 0, end: 0 };
    case 'annual':
      return { start: workStart(worksite), end: workEnd(worksite) };
  }
}
