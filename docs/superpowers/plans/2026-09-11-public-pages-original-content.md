# 公共页面原文平移实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）逐任务实现。步骤使用复选框（`- [ ]`）语法跟踪进度。

**目标：** 将旧站中文、英文 FAQ、隐私政策、服务条款和内容政策原文迁移到新前端的静态公共页面。

**架构：** 内容数据与渲染组件分离；静态内容不得导入旧项目或请求 API。浏览器语言仅决定中文或英文原文选择，未迁移语言回退英文。

**技术栈：** React、React Router、TypeScript、Vitest、Testing Library、Vite。

## 任务 1：建立可审计的原文内容仓库

**文件：**
- 创建：`src/features/public-pages/content/public-content.ts`
- 创建：`src/features/public-pages/content/public-content.test.ts`

- [x] **步骤 1：编写失败的原文合同测试**

测试应从唯一内容模块读取中文和英文，断言：四类页面均存在；隐私和条款保留旧站的 `2024` 更新日期及 `privacy@cling-ai.com`、`legal@cling-ai.com`；内容政策保留 `2026` 更新日期；FAQ 至少包含旧站的首个问题和完整问答数组。

- [x] **步骤 2：运行测试确认失败**

运行：`npm test -- --run src/features/public-pages/content/public-content.test.ts`

预期：失败，无法解析内容模块。

- [x] **步骤 3：逐字平移中文、英文原文**

从设计文档指定的旧站文件复制中文、英文正文，保留章节标题、顺序、更新时间、联系邮箱和换行。内容模块导出类型化 `PublicDocument`、`PublicFaq` 和 `resolvePublicLocale`；仅 `zh` 前缀选中文，其余回退英文。

- [x] **步骤 4：运行内容合同测试确认通过**

运行：`npm test -- --run src/features/public-pages/content/public-content.test.ts`

预期：通过，原文锚点、语言回退和来源边界均受测试保护。

## 任务 2：测试先行实现公共页面组件

**文件：**
- 创建：`src/features/public-pages/components/PublicPageLayout.tsx`
- 创建：`src/features/public-pages/components/FaqAccordion.tsx`
- 创建：`src/features/public-pages/pages/FaqPage.tsx`
- 创建：`src/features/public-pages/pages/DocumentPage.tsx`
- 创建：`src/features/public-pages/public-pages.test.tsx`

- [x] **步骤 1：编写失败的渲染与可访问性测试**

测试覆盖：中文 FAQ 标题与折叠按钮的 `aria-expanded`；英文回退；法律页的 `h1`、更新时间、章节与联系邮箱；页面渲染不调用 `fetch`，且不显示 Animate。

- [x] **步骤 2：运行测试确认失败**

运行：`npm test -- --run src/features/public-pages/public-pages.test.tsx`

预期：失败，无法解析页面模块。

- [x] **步骤 3：以无业务副作用组件实现渲染**

`PublicPageLayout` 只提供标题、正文区域和公共链接；`FaqAccordion` 只管理展开状态；`DocumentPage` 只按内容数据渲染章节。中文注释解释原文不可改写和公共页不读取会话的原因。

- [x] **步骤 4：运行组件测试确认通过**

运行：`npm test -- --run src/features/public-pages/public-pages.test.tsx`

预期：通过，FAQ 与三类文档可访问且无网络调用。

## 任务 3：接入公共路由与回归门禁

**文件：**
- 修改：`src/app/routes.ts`
- 修改：`src/app/router.tsx`
- 修改：`src/app/App.test.tsx`

- [x] **步骤 1：编写失败的匿名公共路由测试**

测试逐项访问 `/faq`、`/privacy`、`/terms`、`/content-policy`，断言对应 `h1` 可见、应用壳的登录态导航不出现且不发起 API 请求。

- [x] **步骤 2：运行测试确认失败**

运行：`npm test -- --run src/app/App.test.tsx`

预期：失败，当前路由会落入工作室首页。

- [x] **步骤 3：接入规范公共路由**

将四条路由登记在 `ROUTES` 并置于 `AppShell` 外；路由只传入静态内容类型，不添加 `/legal/*`、旧支付或 Animate 兼容别名。

- [x] **步骤 4：运行路由测试确认通过**

运行：`npm test -- --run src/app/App.test.tsx src/features/public-pages/public-pages.test.tsx`

预期：通过，匿名公共页没有登录态或 API 副作用。

## 任务 4：最终验证

- [x] 运行 `npm test`，预期全部通过。
- [x] 运行 `npm run build`，预期退出码为 0。
- [x] 运行 `npm run verify:go-only`，预期输出 `Go-only API audit passed`。
- [x] 在本计划追加真实测试数量与退出状态，不记录令牌、真实用户或生产地址。

## 执行记录

| 日期 | 操作 | 结果 |
|---|---|---|
| 2026-09-11 | 中英文原文内容仓库、哈希完整性门禁与深度只读约束 | 旧站原文逐项比对通过；内容合同测试通过。 |
| 2026-09-11 | FAQ 折叠、法律文档渲染、公共路由与认证隔离 | 覆盖语言选择、无障碍、带旧令牌的零请求访问、FAQ 实例隔离和原文换行。 |
| 2026-09-12 | 最终本地验收 | `npm test`：15 个文件、101 项通过；`npm run build`：退出码 0；`npm run verify:go-only`：通过。 |

## 质量复核备注

- 公共路由严格位于认证 Provider 外；其余路径继续进入 Go 会话应用，未发现认证绕过。
- FAQ 使用实例级 `useId` 和双向 ARIA 关联；当前原文 FAQ 问题唯一，按问题文本保存展开状态满足本批固定数据约束。
- 未来拆分 SSR 时需要把浏览器语言从页面内部移到上层注入；本批仍是 Vite SPA，因此不扩大范围。
