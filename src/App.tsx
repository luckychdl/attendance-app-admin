import { Navigate, Route, Routes } from 'react-router-dom';

import { Layout } from '@/components/layout';
import { useAuth } from '@/hooks/use-auth';
import { AttendancePage } from '@/pages/attendance';
import { EmployeesPage } from '@/pages/employees';
import { LeavesPage } from '@/pages/leaves';
import { LoginPage } from '@/pages/login';
import { TodayPage } from '@/pages/today';
import { WorksitePage } from '@/pages/worksite';

export function App() {
  const { session } = useAuth();

  // 저장된 세션을 확인하는 동안에는 로그인 화면이 깜빡이지 않게 비워 둔다.
  if (session === undefined) return null;
  if (session === null) return <LoginPage />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<TodayPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="leaves" element={<LeavesPage />} />
        <Route path="worksite" element={<WorksitePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
