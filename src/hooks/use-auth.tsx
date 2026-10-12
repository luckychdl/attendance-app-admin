import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import { authApi } from '@/api/admin';
import { ApiError, setAuthToken, setUnauthorizedHandler } from '@/api/client';
import type { Employee, Session } from '@/api/types';

const SESSION_KEY = 'attendance-admin.session';
const COMPANY_KEY = 'attendance-admin.last-company';

type AuthValue = {
  /** 세션 확인이 끝나기 전에는 undefined */
  session: Session | null | undefined;
  login: (companyName: string, employeeNo: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthValue | null>(null);

function readSession(): Session | null {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null');
  } catch {
    return null;
  }
}

function assertManager(employee: Employee) {
  if (employee.role !== 'manager') {
    throw new ApiError('관리자 계정만 로그인할 수 있습니다.', 403);
  }
}

export const lastCompany = () => localStorage.getItem(COMPANY_KEY) ?? '';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    const clear = () => {
      setAuthToken(null);
      localStorage.removeItem(SESSION_KEY);
      setSession(null);
    };
    setUnauthorizedHandler(clear);

    // 저장된 토큰이 아직 유효한지, 여전히 관리자인지 확인하고 인사 정보를 새로 받는다.
    const saved = readSession();
    if (!saved) {
      setSession(null);
      return;
    }
    setAuthToken(saved.token);
    authApi
      .me()
      .then((employee) => {
        assertManager(employee);
        const refreshed = { ...saved, employee };
        localStorage.setItem(SESSION_KEY, JSON.stringify(refreshed));
        setSession(refreshed);
      })
      .catch((error) => {
        // 서버에 닿지 못했을 뿐이면 저장된 세션으로 들어간다. 화면의 요청이 실패 사유를 보여 준다.
        if (error instanceof ApiError && (error.status === 0 || error.status === 408)) {
          setSession(saved);
        } else {
          clear();
        }
      });

    return () => setUnauthorizedHandler(null);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      session,
      async login(companyName, employeeNo, password) {
        const next = await authApi.login(companyName, employeeNo, password);
        assertManager(next.employee);
        setAuthToken(next.token);
        localStorage.setItem(SESSION_KEY, JSON.stringify(next));
        localStorage.setItem(COMPANY_KEY, next.employee.companyName);
        setSession(next);
      },
      logout() {
        setAuthToken(null);
        localStorage.removeItem(SESSION_KEY);
        setSession(null);
      },
    }),
    [session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider 밖에서 useAuth 를 불렀습니다.');
  return value;
}

/** 로그인한 관리자. 로그인 뒤의 화면에서만 쓴다. */
export function useMe() {
  const { session } = useAuth();
  if (!session) throw new Error('로그인이 필요합니다.');
  return session.employee;
}
