# 用户中心只读身份页实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 在新前端以 Go 会话安全投影实现只读 `/me`，并让内容访问字段与 Go 合同一致。

**架构：** `src/api/auth.ts` 维护 Go `safeUser` 投影的唯一类型边界；`features/account` 仅展示认证 Provider 已恢复的身份事实。路由仅接入页面，不发起额外身份请求；没有会话或会话失效时沿用 Provider 的清理策略。

**技术栈：** React、React Router、TypeScript、Vitest、Testing Library、现有 Go API Gateway 客户端。

---

## 文件结构

| 文件 | 职责 |
|---|---|
| 修改 `src/api/auth.ts` | 将 `contentAccess` 定义为 Go 投影实际允许的值。 |
| 修改 `src/features/auth/auth.test.tsx` | 锁定认证会话读取使用真实 Go 内容访问值。 |
| 创建 `src/features/account/AccountPage.tsx` | 只读编排 `/me` 的身份、游客和错误状态。 |
| 创建 `src/features/account/account.test.tsx` | 验证身份展示、游客、未认证、未知状态与无业务网络请求。 |
| 修改 `src/app/router.tsx` | 以 `AccountPage` 替换 `/me` 占位页。 |
| 修改 `src/app/App.test.tsx` | 以应用路由测试锁定 `/me` 的 Go-only 行为。 |

## 任务 1：先锁定 Go 内容访问合同

**文件：**
- 修改：`src/api/auth.ts`
- 修改：`src/features/auth/auth.test.tsx`

- [x] **步骤 1：将认证测试样本改为真实 Go 投影值**

```ts
const sampleUser = {
  id: 'user-1',
  displayName: '测试用户',
  bindingState: 'bound',
  accountStatus: 'normal',
  contentAccess: 'standard',
  timezone: 'Asia/Shanghai',
  isGuest: false,
}
```

- [x] **步骤 2：运行认证测试并确认类型检查失败**

运行：`npm run build`

预期：失败，TypeScript 指出 `'standard'` 不能赋给当前错误的 `'sfw' | 'nsfw'` 合同。

- [x] **步骤 3：将 API 类型与 Go `safeUser` 投影对齐**

```ts
export type ContentAccess = 'standard' | 'review_restricted'

export type AuthUser = {
  id: string
  displayName: string
  bindingState: 'guest' | 'bound'
  accountStatus: 'normal' | 'banned' | 'deleted'
  contentAccess: ContentAccess
  timezone: string
  isGuest: boolean
}
```

保留中文注释，说明此字段表达审核访问状态而非浏览器可选择的 SFW/NSFW 开关。

- [x] **步骤 4：运行认证测试和构建确认通过**

运行：`npm test -- --run src/features/auth/auth.test.tsx && npm run build`

预期：认证测试通过；TypeScript 构建成功。

## 任务 2：测试先行实现只读用户中心

**文件：**
- 创建：`src/features/account/AccountPage.tsx`
- 创建：`src/features/account/account.test.tsx`

- [x] **步骤 1：编写失败的账户页行为测试**

```tsx
it('只展示 Go 会话投影允许的已绑定账户事实，不请求钱包、作品或旧 Node', () => {
  renderAccountPage(boundUser)

  expect(screen.getByRole('heading', { name: '用户中心' })).toBeInTheDocument()
  expect(screen.getByText('昵称：测试用户')).toBeInTheDocument()
  expect(screen.getByText('账户：已绑定')).toBeInTheDocument()
  expect(screen.getByText('内容访问：标准内容访问')).toBeInTheDocument()
  expect(screen.queryByText(/user-1|余额|外部身份/)).not.toBeInTheDocument()
  expect(fetchMock).not.toHaveBeenCalled()
})
```

同一文件再添加：游客显示绑定前提示但不提供绑定提交；无会话显示登录链接；未知内容访问值显示“状态待确认”；加载态用 `role="status"`。

- [x] **步骤 2：运行测试并确认失败**

运行：`npm test -- --run src/features/account/account.test.tsx`

预期：失败，报错无法解析 `./AccountPage`。

- [x] **步骤 3：以认证 Provider 为唯一身份来源实现页面**

```tsx
export function AccountPage() {
  const { user, isLoading } = useAuth()

  if (isLoading) return <main><p role="status">正在恢复登录状态…</p></main>
  if (!user) return <main><h1>用户中心</h1><p role="alert">登录已失效，请重新登录</p><Link to={ROUTES.login}>前往登录</Link></main>

  return <main>{/* 仅展示安全用户投影 */}</main>
}
```

抽出仅处理展示的 `getContentAccessLabel`、`getAccountStatusLabel`，未知枚举一律返回“状态待确认”。游客提示解释“绑定需使用后续 Go 原子接口”，不放置假绑定表单。不得在该 feature 调用 `fetch`、钱包、作品或旧 Node API。

- [x] **步骤 4：运行账户页测试确认通过**

运行：`npm test -- --run src/features/account/account.test.tsx`

预期：通过，覆盖已绑定、游客、未认证、加载和未知内容访问状态。

## 任务 3：接入规范路由并保留 Go-only 边界

**文件：**
- 修改：`src/app/router.tsx`
- 修改：`src/app/App.test.tsx`

- [x] **步骤 1：编写失败的应用路由测试**

```tsx
it('用户中心仅渲染 Go 会话身份页，不以占位文案或旧 API 回退', () => {
  window.history.pushState({}, '', ROUTES.account)
  render(<App />)

  expect(screen.getByRole('heading', { name: '用户中心' })).toBeInTheDocument()
  expect(screen.queryByText('账户中心暂不可用。')).not.toBeInTheDocument()
})
```

- [x] **步骤 2：运行测试并确认失败**

运行：`npm test -- --run src/app/App.test.tsx`

预期：失败，当前 `/me` 仍渲染“账户中心暂不可用”。

- [x] **步骤 3：替换 `/me` 路由占位页**

```tsx
<Route path={ROUTES.account} element={<AccountPage />} />
```

删除只为旧占位页服务的 `AccountUnavailablePage`。不添加 `/profile` 兼容或设置路由，因为它们尚无 Go 合同。

- [x] **步骤 4：运行路由与账户相关测试确认通过**

运行：`npm test -- --run src/app/App.test.tsx src/features/account/account.test.tsx`

预期：通过，`/me` 显示用户中心且没有旧占位或 Node 网络调用。

## 任务 4：批次回归验证

**文件：**
- 修改：无。

- [x] **步骤 1：运行完整单元测试**

运行：`npm test`

预期：所有 Vitest 测试通过。

- [x] **步骤 2：运行生产构建**

运行：`npm run build`

预期：退出码为 0。

- [x] **步骤 3：运行 Go-only 审计**

运行：`npm run verify:go-only`

预期：输出 `Go-only API audit passed`。

- [x] **步骤 4：记录结果**

在本计划底部补充测试文件数、测试项数和三条命令的退出状态。不得写入令牌、真实账户数据或生产地址。

## 自检

- 覆盖了内容访问合同、页面状态、路由和最终验证。
- 不包含待定步骤、旧 Node 回退、资料编辑、游客绑定写入或生产依赖。
- API 类型、展示文案和测试样本均以 Go `safeUser` 投影为唯一来源。

## 执行记录

| 日期 | 操作 | 结果 |
|---|---|---|
| 2026-09-11 | 认证合同与运行时投影：精确枚举守卫、畸形响应校验、未知枚举安全降级 | TDD 红绿完成；认证与账户相关测试通过。 |
| 2026-09-11 | `/me`：身份展示、游客提示、会话恢复状态、路由接入 | 覆盖无令牌、401、网络/5xx、登录和注册后 401、延迟旧请求、StrictMode 与未知枚举。 |
| 2026-09-11 | 最终本地验收 | `npm test`：13 个文件、79 项通过；`npm run build`：退出码 0；`npm run verify:go-only`：通过。 |

## 审查后的实现补充

- 初始恢复、登录、注册与退出共享请求世代保护，迟到的 `/api/auth/me` 响应不能覆盖新会话或在卸载后更新页面。
- 精确 `AuthUser` 合同用于编译期约束；`RuntimeAuthUser` 仅承接已通过基础结构校验、但可能含服务端新增枚举的响应。页面将未知枚举展示为“状态待确认”，不推断为更宽松权限。
