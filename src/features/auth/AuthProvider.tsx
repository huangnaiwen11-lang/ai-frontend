import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type AuthApi,
  type GuestBindingInput,
  type RegisterInput,
  type RuntimeAuthUser,
} from "../../api/auth";
import { isGoApiError } from "../../api/http";
import { BrowserSessionStore } from "./session-store";

export type SessionRestoreState = "ready" | "missing" | "expired" | "failed";

type AuthContextValue = {
  user: RuntimeAuthUser | null;
  isLoading: boolean;
  sessionRestoreState: SessionRestoreState;
  sessionRestoreError: string | null;
  login(email: string, password: string): Promise<void>;
  register(input: RegisterInput): Promise<void>;
  bindGuest(input: GuestBindingInput): Promise<void>;
  updateDisplayName(displayName: string): Promise<void>;
  revokeAllSessions(): Promise<void>;
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
  logout(): void;
};

type AuthProviderProps = {
  authApi: AuthApi;
  sessionStore: BrowserSessionStore;
  children: ReactNode;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_RESTORE_FAILED_MESSAGE = "暂时无法恢复登录状态，请稍后重试。";

export function AuthProvider({
  authApi,
  sessionStore,
  children,
}: AuthProviderProps) {
  const [user, setUser] = useState<RuntimeAuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionRestoreState, setSessionRestoreState] =
    useState<SessionRestoreState>("ready");
  const [sessionRestoreError, setSessionRestoreError] = useState<string | null>(
    null,
  );
  const isMountedRef = useRef(true);
  const sessionRequestGenerationRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      sessionRequestGenerationRef.current += 1;
    };
  }, []);

  const restoreCurrentUser = useCallback(
    async (rejectUnauthenticated = false): Promise<void> => {
      const requestGeneration = ++sessionRequestGenerationRef.current;
      const isCurrentRequest = () =>
        isMountedRef.current &&
        requestGeneration === sessionRequestGenerationRef.current;

      if (!sessionStore.getToken()) {
        if (isCurrentRequest()) {
          setUser(null);
          setSessionRestoreState("missing");
          setSessionRestoreError(null);
        }
        return;
      }

      try {
        const restoredUser = await authApi.me();
        if (!isCurrentRequest()) return;
        setUser(restoredUser);
        setSessionRestoreState("ready");
        setSessionRestoreError(null);
      } catch (error) {
        if (!isCurrentRequest()) return;
        // 只有 Go 明确判定会话无效才清令牌，网络波动不能把用户强制登出。
        if (isGoApiError(error) && error.kind === "unauthenticated") {
          sessionStore.clear();
          setUser(null);
          setSessionRestoreState("expired");
          setSessionRestoreError(null);
          if (rejectUnauthenticated) throw error;
          return;
        }
        setUser(null);
        setSessionRestoreState("failed");
        setSessionRestoreError(SESSION_RESTORE_FAILED_MESSAGE);
        throw error;
      }
    },
    [authApi, sessionStore],
  );

  useEffect(() => {
    let active = true;
    void restoreCurrentUser()
      .catch(() => undefined)
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [restoreCurrentUser]);

  const completeSession = useCallback(
    async (loginResult: Awaited<ReturnType<AuthApi["login"]>>) => {
      sessionStore.setToken(loginResult.token);
      // 不信任登录响应里的用户快照，统一以 /me 的服务端投影恢复页面状态。
      await restoreCurrentUser(true);
    },
    [restoreCurrentUser, sessionStore],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      sessionRestoreState,
      sessionRestoreError,
      login: async (email, password) =>
        completeSession(await authApi.login(email, password)),
      register: async (input) => completeSession(await authApi.register(input)),
      // 绑定后重新请求 /me，确保页面只使用 Go 返回的最新账户状态。
      bindGuest: async (input) => {
        await authApi.bindGuest(input);
        await restoreCurrentUser(true);
      },
      updateDisplayName: async (displayName) => {
        await authApi.updateDisplayName(displayName);
        await restoreCurrentUser(true);
      },
      revokeAllSessions: async () => {
        await authApi.revokeAllSessions();
        sessionRequestGenerationRef.current += 1;
        sessionStore.clear();
        setUser(null);
        setSessionRestoreState("missing");
        setSessionRestoreError(null);
      },
      changePassword: async (currentPassword, newPassword) => {
        await authApi.changePassword(currentPassword, newPassword);
        sessionRequestGenerationRef.current += 1;
        sessionStore.clear();
        setUser(null);
        setSessionRestoreState("missing");
        setSessionRestoreError(null);
      },
      logout: () => {
        sessionRequestGenerationRef.current += 1;
        sessionStore.clear();
        setUser(null);
        setSessionRestoreState("missing");
        setSessionRestoreError(null);
      },
    }),
    [
      authApi,
      completeSession,
      isLoading,
      sessionRestoreError,
      sessionRestoreState,
      sessionStore,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth 必须在 AuthProvider 内使用");
  }
  return context;
}
