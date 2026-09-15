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
 * 查询参数。特别是已废弃的 Animate 链接中的模板、提示词或自动提交参数，不能
 * 被带到新页面，以免绕过用户主动选择或意外触发生成。
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
 * Animate 已移除，仍只兼容其页面级入口，不转移任何旧任务配置。
 */
export const LEGACY_ROUTE_REDIRECTS: Readonly<
  Partial<Record<string, LegacyRouteRedirect>>
> = {
  "/create/image": discardSearchRedirect(ROUTES.studioImage),
  "/image-generator": discardSearchRedirect(ROUTES.studioImage),

  "/create/template-image": discardSearchRedirect(ROUTES.studioEdit),
  "/undress": discardSearchRedirect(ROUTES.studioEdit),
  "/ai-undress": discardSearchRedirect(ROUTES.studioEdit),
  "/ai-clothes-off": discardSearchRedirect(ROUTES.studioEdit),
  "/face-swap": discardSearchRedirect(ROUTES.studioEdit),

  "/create/video": discardSearchRedirect(ROUTES.studioVideo),
  "/create/animate": discardSearchRedirect(ROUTES.studioVideo),
  "/photo-to-video": discardSearchRedirect(ROUTES.studioVideo),

  "/recharge": discardSearchRedirect(ROUTES.wallet),
  "/pricing": discardSearchRedirect(ROUTES.wallet),
  "/profile": discardSearchRedirect(ROUTES.account),
  "/settings/profile": discardSearchRedirect(ROUTES.account),
  "/settings/account": discardSearchRedirect(ROUTES.account),
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
