import { useMemo } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthApi } from "../api/auth";
import { resolveApiBaseUrl } from "../api/config";
import { GoApiClient } from "../api/http";
import { AppShell } from "../features/shell/AppShell";
import { AuthProvider, useAuth } from "../features/auth/AuthProvider";
import { BrowserSessionStore } from "../features/auth/session-store";
import { LoginPage } from "../features/auth/LoginPage";
import { RegisterPage } from "../features/auth/RegisterPage";
import { AccountPage } from "../features/account/AccountPage";
import { ImageCreationPage } from "../features/creation/ImageCreationPage";
import { TemplateImageEditPage } from "../features/creation/TemplateImageEditPage";
import { VideoCreationPage } from "../features/creation/VideoCreationPage";
import { PaymentPage } from "../features/payment/PaymentPage";
import { WorksPage } from "../features/works/WorksPage";
import { WorkDetailPage } from "../features/works/WorkDetailPage";
import { FaqPage } from "../features/public-pages/pages/FaqPage";
import { DocumentPage } from "../features/public-pages/pages/DocumentPage";
import { AuthenticatedFeedbackPage } from "../features/public-pages/pages/AuthenticatedFeedbackPage";
import { NotificationsPage } from "../features/notifications/NotificationsPage";
import { GoApiProvider } from "./GoApiProvider";
import {
  getLegacyRouteRedirect,
  LEGACY_ROUTE_REDIRECTS,
  ROUTES,
} from "./routes";

/** 已登录首页沿用旧 HomeGate 的视频入口；身份只取 Go 会话，不读取旧 Node Token。 */
function StudioHomePage() {
  const { user } = useAuth();
  if (user) return <Navigate to={ROUTES.studioVideo} replace />;
  return (
    <>
      <h1>Cling AI 工作室</h1>
      <p>新前端仅通过 Go API Gateway 提供创作能力。</p>
    </>
  );
}

/** 先恢复 Go 会话再判断反馈入口，避免外层公共路由把已登录用户也重定向出去。 */
function FeedbackRoute() {
  const { user, isLoading, sessionRestoreError } = useAuth();
  if (isLoading) return <main role="status">正在恢复登录状态</main>;
  if (sessionRestoreError) return <main role="alert">{sessionRestoreError}</main>;
  return user ? <AuthenticatedFeedbackPage /> : <Navigate to={ROUTES.login} replace />;
}

/**
 * 旧链接只负责把用户带至规范页面，特意不读取 location.search。
 * 这样 Animate 等历史链接携带的模板、提示词和自动提交参数不会触发新任务。
 */
function LegacyRouteNavigate({ pathname }: { pathname: string }) {
  const redirect = getLegacyRouteRedirect(pathname);

  return <Navigate to={redirect?.target ?? ROUTES.home} replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path={ROUTES.faq} element={<FaqPage />} />
      <Route
        path={ROUTES.privacy}
        element={<DocumentPage documentKey="privacy" />}
      />
      <Route
        path={ROUTES.terms}
        element={<DocumentPage documentKey="terms" />}
      />
      <Route
        path={ROUTES.contentPolicy}
        element={<DocumentPage documentKey="contentPolicy" />}
      />
      <Route path="*" element={<AuthenticatedApp />} />
    </Routes>
  );
}

function AuthenticatedApp() {
  const sessionStore = useMemo(() => new BrowserSessionStore(), []);
  const client = useMemo(
    () =>
      new GoApiClient({
        baseUrl: resolveApiBaseUrl(import.meta.env.VITE_GO_API_BASE_URL),
        sessionStore,
      }),
    [sessionStore],
  );
  const authApi = useMemo(() => new AuthApi(client), [client]);

  return (
    <GoApiProvider client={client}>
      <AuthProvider authApi={authApi} sessionStore={sessionStore}>
        <AuthenticatedRoutes />
      </AuthProvider>
    </GoApiProvider>
  );
}

function AuthenticatedRoutes() {
  return (
    <Routes>
      <Route path={ROUTES.login} element={<LoginPage />} />
      <Route path={ROUTES.register} element={<RegisterPage />} />
      <Route element={<AppShell />}>
        <Route path={ROUTES.home} element={<StudioHomePage />} />
        <Route path={ROUTES.studioImage} element={<ImageCreationPage />} />
        <Route path={ROUTES.studioEdit} element={<TemplateImageEditPage />} />
        <Route path={ROUTES.studioVideo} element={<VideoCreationPage />} />
        <Route path={ROUTES.works} element={<WorksPage />} />
        <Route path={`${ROUTES.works}/:workId`} element={<WorkDetailPage />} />
        <Route path={ROUTES.wallet} element={<PaymentPage />} />
        <Route path={ROUTES.account} element={<AccountPage />} />
        <Route path={ROUTES.settings} element={<AccountPage />} />
        <Route path={ROUTES.feedback} element={<FeedbackRoute />} />
        <Route path={ROUTES.notifications} element={<NotificationsPage />} />
      </Route>
      {Object.keys(LEGACY_ROUTE_REDIRECTS).map((pathname) => (
        <Route
          key={pathname}
          path={pathname}
          element={<LegacyRouteNavigate pathname={pathname} />}
        />
      ))}
      <Route
        path="/payment"
        element={<Navigate to={ROUTES.wallet} replace />}
      />
      <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
    </Routes>
  );
}
