import { useEffect } from 'react';
import { NavLink, Outlet, useLocation, useOutletContext } from 'react-router-dom';

import { adminApi } from '@/api/admin';
import { useAuth, useMe } from '@/hooks/use-auth';
import { useQuery } from '@/hooks/use-query';

type LayoutContext = {
  /** 결재를 처리한 뒤 메뉴의 대기 건수를 다시 센다. */
  refreshPending: () => void;
};

export const useLayout = () => useOutletContext<LayoutContext>();

const NAV = [
  { to: '/', label: '오늘 현황', end: true },
  { to: '/attendance', label: '근태 기록' },
  { to: '/leaves', label: '휴가' },
  { to: '/employees', label: '직원' },
  { to: '/worksite', label: '근무지' },
];

export function Layout() {
  const me = useMe();
  const { logout } = useAuth();
  const { pathname } = useLocation();
  const overview = useQuery(() => adminApi.overview(), []);
  const { reload } = overview;

  // 화면을 옮길 때마다 대기 건수를 새로 읽는다.
  useEffect(() => {
    void reload();
  }, [pathname, reload]);

  const pending = overview.data?.pendingLeaves ?? 0;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark" aria-hidden />
          <div>
            <strong>{me.companyName}</strong>
            <span>오늘근무 관리자</span>
          </div>
        </div>

        <nav className="nav" aria-label="주 메뉴">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="nav-link">
              {item.label}
              {item.to === '/leaves' && pending > 0 && (
                <span className="nav-count" aria-label={`결재 대기 ${pending}건`}>
                  {pending}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="account">
          <div>
            <strong>{me.name}</strong>
            <span>
              {me.department} {me.position}
            </span>
          </div>
          <button type="button" className="button button-quiet" onClick={logout}>
            로그아웃
          </button>
        </div>
      </aside>

      <main className="main">
        <Outlet context={{ refreshPending: reload } satisfies LayoutContext} />
      </main>
    </div>
  );
}
