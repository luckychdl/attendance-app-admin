/** 서버(onwork-server/src/types.ts)와 1:1로 맞춘 도메인 타입 */

export type GeoPoint = {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
};

export type EmployeeRole = 'member' | 'manager';

export type Employee = {
  id: string;
  /** 사번 */
  employeeNo: string;
  name: string;
  department: string;
  position: string;
  role: EmployeeRole;
  companyName: string;
};

export type Session = {
  employee: Employee;
  token: string;
};

export type Worksite = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  /** 출퇴근 체크를 허용하는 반경(미터) */
  radiusMeters: number;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
};

export type AttendanceStatus =
  | 'working'
  | 'normal'
  | 'late'
  | 'earlyLeave'
  | 'lateAndEarlyLeave'
  | 'missingCheckOut';

export type AttendanceRecord = {
  id: string;
  employeeId: string;
  /** 근무일 (YYYY-MM-DD) */
  workDate: string;
  checkInAt: string;
  checkInLocation: GeoPoint | null;
  checkOutAt: string | null;
  checkOutLocation: GeoPoint | null;
  workedMinutes: number | null;
  status: AttendanceStatus;
  /** 반경 밖 체크 등 예외 사유 */
  note: string | null;
};

export type LeaveType = 'annual' | 'halfAm' | 'halfPm' | 'hourly';

export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type LeaveRequest = {
  id: string;
  employeeId: string;
  /** 신청 시점의 이름·부서. 결재 권한도 이 부서로 따진다. */
  employeeName: string;
  department: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  /** 시차만 (HH:mm) */
  startTime: string | null;
  endTime: string | null;
  days: number;
  reason: string | null;
  status: LeaveStatus;
  requestedAt: string;
  decidedAt: string | null;
  decidedBy: string | null;
};

export type LeaveBalance = {
  year: number;
  granted: number;
  used: number;
  pending: number;
  remaining: number;
};

export type AdminEmployee = Employee & {
  /** 입사일 (YYYY-MM-DD) */
  hiredAt: string;
  /** 따로 정한 연간 연차. null 이면 근속연수로 계산한다. */
  annualLeaveDays: number | null;
  /** false 면 퇴사 처리. 로그인이 막힌다. */
  active: boolean;
  leave: LeaveBalance;
};

export type AdminOverview = {
  /** 서버 타임존 기준 오늘 */
  date: string;
  records: AttendanceRecord[];
  /** 오늘에 걸친 승인된 휴가 */
  leaves: LeaveRequest[];
  pendingLeaves: number;
};

export type NewEmployeeInput = {
  employeeNo: string;
  name: string;
  department: string;
  position: string;
  role: EmployeeRole;
  hiredAt?: string;
  password: string;
};

export type EmployeePatch = Partial<{
  name: string;
  department: string;
  position: string;
  role: EmployeeRole;
  hiredAt: string;
  annualLeaveDays: number | null;
  active: boolean;
  password: string;
}>;
