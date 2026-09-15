/**
 * 用户端唯一的规范路由表。
 *
 * 页面和导航只能使用这里的地址，避免新旧链接在业务代码中分散。
 */
export const ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  studioImage: "/studio/image",
  studioEdit: "/studio/edit",
  studioVideo: "/studio/video",
  works: "/works",
  wallet: "/wallet",
  paymentResult: "/payment/result",
  account: "/me",
  settings: "/settings",
  faq: "/faq",
  privacy: "/privacy",
  terms: "/terms",
  contentPolicy: "/content-policy",
  feedback: "/feedback",
  notifications: "/notifications",
} as const;

/**
 * 旧前端公开过的深链兼容规则。
 *
 * 保留路径兼容能防止书签、搜索引擎收录和旧客户端链接直接失效；但绝不继承
 * 查询参数，避免历史链接中的模板、提示词或自动提交参数绕过用户主动选择，
 * 或意外触发新的生成任务。
 */
export interface LegacyRouteRedirect {
  /** 兼容链接最终进入的规范页面。 */
  readonly target: (typeof ROUTES)[keyof typeof ROUTES];
  /** 是否允许把旧链接的查询参数传递给新页面。 */
  readonly preserveSearch: false;
}

const discardSearchRedirect = (
  target: LegacyRouteRedirect["target"],
): LegacyRouteRedirect => ({ target, preserveSearch: false });

/**
 * 旧 URL 到规范路由的唯一映射。
 * 已下线能力不登记映射，确保历史深链不会变相落入其它可创建任务的页面。
 */
export const LEGACY_ROUTE_REDIRECTS: Readonly<
  Partial<Record<string, LegacyRouteRedirect>>
> = {
  "/video": discardSearchRedirect(ROUTES.studioVideo),
  // 旧 /image 挂载 ImageModesPage（模板库），不是 /create/image 的文生图表单。
  "/image": discardSearchRedirect(ROUTES.studioEdit),
  "/faceswap": discardSearchRedirect(ROUTES.studioEdit),
  "/create/faceswap": discardSearchRedirect(ROUTES.studioEdit),
  "/create/undress": discardSearchRedirect(ROUTES.studioEdit),
  "/dress-up": discardSearchRedirect(ROUTES.studioImage),
  "/legal/privacy": discardSearchRedirect(ROUTES.privacy),
  "/legal/terms": discardSearchRedirect(ROUTES.terms),
  "/create/image": discardSearchRedirect(ROUTES.studioImage),
  "/image-generator": discardSearchRedirect(ROUTES.studioImage),

  "/create/template-image": discardSearchRedirect(ROUTES.studioEdit),
  "/undress": discardSearchRedirect(ROUTES.studioEdit),
  "/ai-undress": discardSearchRedirect(ROUTES.studioEdit),
  "/ai-clothes-off": discardSearchRedirect(ROUTES.studioEdit),
  "/face-swap": discardSearchRedirect(ROUTES.studioEdit),

  "/create/video": discardSearchRedirect(ROUTES.studioVideo),
  "/photo-to-video": discardSearchRedirect(ROUTES.studioVideo),

  "/recharge": discardSearchRedirect(ROUTES.wallet),
  "/pricing": discardSearchRedirect(ROUTES.wallet),
  "/profile": discardSearchRedirect(ROUTES.account),
  "/settings/profile": discardSearchRedirect(ROUTES.account),
  "/settings/account": discardSearchRedirect(ROUTES.account),
  // 这三条旧设置页均已有对应的 Go 自有用户域能力：安全与绑定收敛到用户中心，
  // 通知设置收敛到通知中心。统一丢弃旧查询参数，避免携带 Node 页面状态。
  "/settings/security": discardSearchRedirect(ROUTES.account),
  "/settings/link-accounts": discardSearchRedirect(ROUTES.account),
  "/settings/notifications": discardSearchRedirect(ROUTES.notifications),
};

/**
 * 查询旧深链的兼容规则。
 * 未登记的地址必须明确返回 undefined，调用方据此进入普通 404 或兜底处理，
 * 不能把任意地址误判成可跳转的旧业务入口。
 */
export function getLegacyRouteRedirect(
  pathname: string,
): LegacyRouteRedirect | undefined {
  return LEGACY_ROUTE_REDIRECTS[pathname];
}
