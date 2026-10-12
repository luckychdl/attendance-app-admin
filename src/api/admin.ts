import { request } from '@/api/client';
import type {
  AdminEmployee,
  AdminOverview,
  AttendanceRecord,
  Employee,
  EmployeePatch,
  LeaveRequest,
  LeaveStatus,
  NewEmployeeInput,
  Session,
  Worksite,
} from '@/api/types';

export const authApi = {
  login: (companyName: string, employeeNo: string, password: string) =>
    request<Session>('/auth/login', {
      method: 'POST',
      body: { companyName, employeeNo, password },
    }),
  me: () => request<Employee>('/auth/me'),
};

export const adminApi = {
  overview: () => request<AdminOverview>('/admin/overview'),

  /** 전 직원 (퇴사자 포함) + 그 해의 연차 현황 */
  employees: (year?: number) => request<AdminEmployee[]>('/admin/employees', { query: { year } }),
  createEmployee: (input: NewEmployeeInput) =>
    request<AdminEmployee>('/admin/employees', { method: 'POST', body: input }),
  updateEmployee: (id: string, patch: EmployeePatch) =>
    request<AdminEmployee>(`/admin/employees/${id}`, { method: 'PATCH', body: patch }),

  attendance: (from: string, to: string, employeeId?: string) =>
    request<AttendanceRecord[]>('/admin/attendance', { query: { from, to, employeeId } }),

  leaves: (filter: { from?: string; to?: string; status?: LeaveStatus } = {}) =>
    request<LeaveRequest[]>('/admin/leaves', { query: filter }),
  /** 결재는 앱과 같은 경로를 쓴다. 같은 부서의 관리자만 할 수 있다. */
  decideLeave: (id: string, decision: 'approve' | 'reject') =>
    request<LeaveRequest>(`/leave/requests/${id}/${decision}`, { method: 'POST' }),

  worksite: () => request<Worksite>('/worksite'),
  updateWorksite: (patch: Omit<Worksite, 'id'>) =>
    request<Worksite>('/worksite', { method: 'PATCH', body: patch }),
};
