import { useMemo } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
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
import { PaymentResultPage } from "../features/payment/PaymentResultPage";
import { PaymentReturnRoute } from "../features/payment/PaymentReturnRoute";
import { WorksPage } from "../features/works/WorksPage";
import { WorkDetailPage } from "../features/works/WorkDetailPage";
import { FaqPage } from "../features/public-pages/pages/FaqPage";
import { DocumentPage } from "../features/public-pages/pages/DocumentPage";
import { PwaInstallPage } from "../features/public-pages/pages/PwaInstallPage";
import { AboutPage } from "../features/public-pages/pages/AboutPage";
import { AuthenticatedFeedbackPage } from "../features/public-pages/pages/AuthenticatedFeedbackPage";
import { NotificationsPage } from "../features/notifications/NotificationsPage";
import { PublicHomePage } from "../features/home/PublicHomePage";
import { GoApiProvider } from "./GoApiProvider";
import {
  getLegacyRouteRedirect,
  LEGACY_ROUTE_REDIRECTS,
  ROUTES,
} from "./routes";

/**
 * 首页沿用旧 HomeGate：恢复 Go 会话期间不显示访客内容；已登录直接进入视频创作，
 * 未登录才渲染带年龄门禁的公开首页。
 */
function HomeRoute() {
  const { user, isLoading, sessionRestoreError } = useAuth();
  if (isLoading) return <main role="status">正在恢复登录状态</main>;
  if (sessionRestoreError) return <main role="alert">{sessionRestoreError}</main>;
  if (user) return <Navigate to={ROUTES.studioVideo} replace />;
  return <PublicHomePage />;
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
 * 这样已下线能力的历史链接携带的模板、提示词和自动提交参数不会触发新任务。
 */
function LegacyRouteNavigate({ pathname }: { pathname: string }) {
  const redirect = getLegacyRouteRedirect(pathname);

  return <Navigate to={redirect?.target ?? ROUTES.home} replace />;
}

/**
 * 旧加密支付页只能迁移已有订单的只读结果查询，不能重新打开旧收银台。
 * 仅转交受限订单号，旧页面附带的金额、币种、跳转地址等参数一律舍弃，
 * 防止它们伪造到账状态或把用户带到外部页面。
 */
function LegacyCryptoPaymentRoute() {
  const { orderId } = useParams<{ orderId: string }>();
  const normalizedOrderID = orderId?.trim() ?? "";
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(normalizedOrderID)) {
    return <Navigate to={ROUTES.home} replace />;
  }
  return <Navigate to={`${ROUTES.paymentResult}?orderId=${encodeURIComponent(normalizedOrderID)}`} replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      {/* 法律页别名在认证 Provider 外承接，公共内容不读取任何 Go 会话。 */}
      <Route path="/legal/privacy" element={<Navigate to={ROUTES.privacy} replace />} />
      <Route path="/legal/terms" element={<Navigate to={ROUTES.terms} replace />} />
      <Route path={ROUTES.faq} element={<FaqPage />} />
      {/* 安装页是公开静态页，不能因恢复会话而读取私人数据或发起业务请求。 */}
      <Route path="/get-app" element={<PwaInstallPage />} />
      <Route path="/install" element={<PwaInstallPage />} />
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
      {/* 公开首页不应被 AppShell 的工作台导航包裹。 */}
      <Route path={ROUTES.home} element={<HomeRoute />} />
      <Route element={<AppShell />}>
        <Route path={ROUTES.studioImage} element={<ImageCreationPage />} />
        <Route path={ROUTES.studioEdit} element={<TemplateImageEditPage />} />
        <Route path={ROUTES.studioVideo} element={<VideoCreationPage />} />
        <Route path={ROUTES.works} element={<WorksPage />} />
        <Route path={`${ROUTES.works}/:workId`} element={<WorkDetailPage />} />
        <Route path={ROUTES.wallet} element={<PaymentReturnRoute />} />
        <Route path={ROUTES.paymentResult} element={<PaymentResultPage />} />
        <Route path="/pay/crypto/:orderId" element={<LegacyCryptoPaymentRoute />} />
        <Route path="/wallet/recharge" element={<PaymentReturnRoute />} />
        <Route path="/recharge" element={<PaymentReturnRoute legacy />} />
        <Route path="/payment" element={<PaymentReturnRoute legacy />} />
        <Route path={ROUTES.account} element={<AccountPage />} />
        <Route path={ROUTES.settings} element={<AccountPage />} />
        <Route path="/settings/about" element={<AboutPage />} />
        <Route path={ROUTES.feedback} element={<FeedbackRoute />} />
        <Route path={ROUTES.notifications} element={<NotificationsPage />} />
      </Route>
      {Object.keys(LEGACY_ROUTE_REDIRECTS).filter((pathname) => pathname !== '/recharge').map((pathname) => (
        <Route
          key={pathname}
          path={pathname}
          element={<LegacyRouteNavigate pathname={pathname} />}
        />
      ))}
      <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
    </Routes>
  );
}
