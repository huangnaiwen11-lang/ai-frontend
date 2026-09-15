import { PublicPageLayout } from "../components/PublicPageLayout";

/**
 * 未登录用户只看到支持入口；登录后由路由进入认证反馈表单，写入请求统一经过 Go。
 * 这样不会把匿名反馈误写到用户账号，也不会绕过 Go 的身份边界。
 */
export function FeedbackPage() {
  return (
    <PublicPageLayout locale="zh" title="反馈与支持">
      <p>如果你遇到账号、内容审核或创作问题，请通过支持邮箱联系我们。</p>
      <p>
        <a href="mailto:support@cling-ai.com">support@cling-ai.com</a>
      </p>
    </PublicPageLayout>
  );
}
