# 用户前端第一阶段：应用壳与创作入口实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将当前演示式首页替换为可扩展的用户应用壳，建立稳定的创作、账户、钱包与公共页面路由边界，同时保持所有业务请求只经 Go API。

**架构：** 使用 `app/routes.ts` 集中维护新路由和无副作用的旧 URL 兼容映射；`features/shell` 只负责页面框架与导航，不接触业务 API。创作页面仍使用现有 Go API 客户端，并作为嵌套路由渲染在应用壳的内容区中。

**技术栈：** React、React Router、TypeScript、Vitest、Testing Library、Vite。

---

## 文件结构

| 文件 | 职责 |
|---|---|
| 创建 `src/app/routes.ts` | 定义规范 URL、旧 URL 重定向映射与 Animate 安全跳转目标。 |
| 创建 `src/app/routes.test.ts` | 验证兼容映射不会引入 Animate 创建入口。 |
| 创建 `src/features/shell/AppShell.tsx` | 组合顶部导航、主内容区与当前会话状态；不处理登录或创作业务。 |
| 创建 `src/features/shell/AppShell.test.tsx` | 验证导航可访问性、退出登录和 Animate 缺席。 |
| 创建 `src/features/shell/app-shell.css` | 应用壳的响应式布局和可访问焦点样式。 |
| 修改 `src/app/router.tsx` | 使用嵌套路由组合应用壳、创作页、账户占位页与公共页。 |
| 修改 `src/app/App.test.tsx` | 从旧演示导航断言切换到规范工作室导航和兼容路由断言。 |
| 修改 `src/features/creation/ImageCreationPage.tsx` | 将余额不足提示的充值链接收敛至规范钱包路由。 |
| 修改 `src/features/creation/creation.test.tsx` | 锁定余额不足时跳往 `/wallet` 的用户行为。 |

## 任务 1：固定路由合同

**文件：**
- 创建：`src/app/routes.ts`
- 测试：`src/app/routes.test.ts`

- [x] **步骤 1：编写失败的路由合同测试**

```ts
import { describe, expect, it } from 'vitest'
import { LEGACY_ROUTE_REDIRECTS, ROUTES } from './routes'

describe('用户端路由合同', () => {
  it('将废弃 Animate 深链安全地导向视频工作室，而不是创建 Animate 任务', () => {
    expect(LEGACY_ROUTE_REDIRECTS['/create/animate']).toBe(ROUTES.studioVideo)
  })

  it('不暴露 Animate 作为规范路由', () => {
    expect(Object.values(ROUTES)).not.toContain('/create/animate')
  })
})
```

- [x] **步骤 2：运行测试并确认失败**

运行：`npm test -- src/app/routes.test.ts`

预期：FAIL，报错 `Failed to resolve import "./routes"`。

- [x] **步骤 3：实现唯一的规范路由表**

```ts
export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  studioImage: '/studio/image',
  studioEdit: '/studio/edit',
  studioVideo: '/studio/video',
  wallet: '/wallet',
  account: '/me',
  settings: '/settings',
} as const

export const LEGACY_ROUTE_REDIRECTS: Readonly<Record<string, string>> = {
  '/create/image': ROUTES.studioImage,
  '/create/template-image': ROUTES.studioEdit,
  '/create/video': ROUTES.studioVideo,
  '/create/animate': ROUTES.studioVideo,
  '/image-generator': ROUTES.studioImage,
  '/photo-to-video': ROUTES.studioVideo,
  '/undress': ROUTES.studioEdit,
  '/ai-undress': ROUTES.studioEdit,
  '/ai-clothes-off': ROUTES.studioEdit,
  '/face-swap': ROUTES.studioEdit,
  '/recharge': ROUTES.wallet,
  '/pricing': ROUTES.wallet,
}
```

注释必须说明：旧 Animate 链接只用于保持深链可达，重定向本身不携带模板、提示词或自动提交参数。

- [x] **步骤 4：运行测试并确认通过**

运行：`npm test -- src/app/routes.test.ts`

预期：PASS，2 个断言通过。

## 任务 2：先以测试定义应用壳

**文件：**
- 创建：`src/features/shell/AppShell.tsx`
- 创建：`src/features/shell/AppShell.test.tsx`
- 创建：`src/features/shell/app-shell.css`

- [x] **步骤 1：编写失败的组件测试**

```tsx
it('为三种创作能力、钱包和账户提供导航，不展示 Animate', async () => {
  render(<MemoryRouter><AuthProvider {...authContext}><AppShell /></AuthProvider></MemoryRouter>)

  expect(screen.getByRole('link', { name: '图片创作' })).toHaveAttribute('href', '/studio/image')
  expect(screen.getByRole('link', { name: '模板编辑' })).toHaveAttribute('href', '/studio/edit')
  expect(screen.getByRole('link', { name: '视频创作' })).toHaveAttribute('href', '/studio/video')
  expect(screen.queryByText('Animate')).not.toBeInTheDocument()
})
```

- [x] **步骤 2：运行测试并确认失败**

运行：`npm test -- src/features/shell/AppShell.test.tsx`

预期：FAIL，报错 `Failed to resolve import "./AppShell"`。

- [x] **步骤 3：实现无业务副作用的应用壳**

```tsx
export function AppShell() {
  const { user, logout } = useAuth()

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <Link to={ROUTES.home}>Cling AI</Link>
        <nav aria-label="主导航">
          <Link to={ROUTES.studioImage}>图片创作</Link>
          <Link to={ROUTES.studioEdit}>模板编辑</Link>
          <Link to={ROUTES.studioVideo}>视频创作</Link>
          <Link to={ROUTES.wallet}>钱包</Link>
        </nav>
        {user ? <button type="button" onClick={logout}>退出登录</button> : <Link to={ROUTES.login}>登录</Link>}
      </header>
      <main className="app-shell__content"><Outlet /></main>
    </div>
  )
}
```

在实现中使用简体中文注释解释：应用壳仅消费认证状态，不得预读余额、VIP 或模板权限，以免把创建门禁从 Go 服务端搬到浏览器。

- [x] **步骤 4：添加响应式与键盘焦点样式**

```css
.app-shell { min-height: 100dvh; }
.app-shell__header { display: flex; flex-wrap: wrap; gap: 0.75rem; }
.app-shell__content { max-width: 72rem; margin: 0 auto; padding: 1.5rem; }
.app-shell a:focus-visible, .app-shell button:focus-visible { outline: 3px solid currentColor; outline-offset: 3px; }
```

- [x] **步骤 5：运行测试并确认通过**

运行：`npm test -- src/features/shell/AppShell.test.tsx`

预期：PASS，导航、退出登录、Animate 缺席三类断言通过。

## 任务 3：迁移到嵌套路由并保留兼容入口

**文件：**
- 修改：`src/app/router.tsx`
- 修改：`src/app/App.test.tsx`
- 修改：`src/features/creation/ImageCreationPage.tsx`
- 修改：`src/features/creation/creation.test.tsx`

- [x] **步骤 1：先写失败的应用路由测试**

```tsx
it('旧 Animate 地址只显示视频工作室页面，不会出现 Animate 新建入口', () => {
  window.history.pushState({}, '', '/create/animate')
  render(<App />)

  expect(screen.getByRole('heading', { name: '视频创作' })).toBeInTheDocument()
  expect(screen.queryByText('Animate')).not.toBeInTheDocument()
})
```

- [x] **步骤 2：运行测试并确认失败**

运行：`npm test -- src/app/App.test.tsx`

预期：FAIL，当前 `/create/animate` 被兜底跳转到首页。

- [x] **步骤 3：以应用壳重写路由装配**

```tsx
<Routes>
  <Route element={<AppShell />}>
    <Route path={ROUTES.home} element={<StudioHomePage />} />
    <Route path={ROUTES.studioImage} element={<ImageCreationPage />} />
    <Route path={ROUTES.studioEdit} element={<TemplateImageEditPage />} />
    <Route path={ROUTES.studioVideo} element={<VideoCreationPage />} />
    <Route path={ROUTES.wallet} element={<PaymentPage />} />
    <Route path={ROUTES.account} element={<AccountUnavailablePage />} />
  </Route>
<Route path="/create/animate" element={<Navigate to={ROUTES.studioVideo} replace />} />
<Route path="/payment" element={<Navigate to={ROUTES.wallet} replace />} />
<Route path="*" element={<Navigate to={ROUTES.home} replace />} />
</Routes>
```

`AccountUnavailablePage` 只声明账户中心将在对应 Go 查询合同就绪后开放；不得调用旧 Node API，也不得伪造余额、作品或通知数据。

在同一任务中，先将 `creation.test.tsx` 中余额不足场景的期望链接改为 `ROUTES.wallet`，确认测试因现有 `/payment` 实现而失败；再将 `ImageCreationPage.tsx` 中的硬编码链接替换为 `Link to={ROUTES.wallet}`。该变化只统一前端导航，不会在浏览器端检查余额，也不会改变 Go 返回 HTTP 402 的处理语义。

- [x] **步骤 4：运行应用路由测试并确认通过**

运行：`npm test -- src/app/App.test.tsx`

预期：PASS，首页导航和 Animate 兼容跳转均通过。

## 任务 4：阶段回归校验

**文件：**
- 修改：无。

- [x] **步骤 1：运行全量前端测试**

运行：`npm test`

预期：PASS，所有 Vitest 用例通过。

- [x] **步骤 2：运行生产构建**

运行：`npm run build`

预期：退出码 0，生成 `dist/`。

- [x] **步骤 3：运行 Go-only 审计**

运行：`npm run verify:go-only`

预期：退出码 0，确认源码和构建路径未引用旧 Node API。

- [x] **步骤 4：记录验证结果**

在本计划「执行记录」章节写入每条命令的日期、退出码和失败原因（如有）。不得写入访问令牌、支付凭据或真实用户数据。

## 执行记录

| 日期 | 操作 | 结果 |
|---|---|---|
| 2026-09-11 | 路由合同：规范路由、12 条旧深链、Animate 丢弃查询参数 | `routes.test.ts` 6 项通过；构建通过。 |
| 2026-09-11 | 应用壳：导航、认证状态、退出登录、响应式与焦点样式 | `AppShell.test.tsx` 2 项通过；构建通过。 |
| 2026-09-11 | 路由整合：工作室、钱包、账户占位、旧 URL 跳转、402 钱包链接 | 应用与创作路由测试通过；已完成规格与代码质量复审。 |
| 2026-09-11 | 阶段回归：全量测试、构建、Go-only 审计 | 9 个测试文件、35 项测试通过；生产构建通过；Go-only API audit passed。 |
