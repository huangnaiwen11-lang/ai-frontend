# Go 独立前端基础层实现计划

> 当前实现状态：本计划中的账号、T2I、模板 I2I、模板 I2V、素材、钱包、作品、反馈和通知用户端切片已在独立 `ai-frontend-service` 与 `ai-business-service` 中落地；下方早期复选框保留为历史施工记录，不能用来判断当前代码状态。真实 OAuth/短信、PayCores、生成中台和生产灰度仍明确不在本地授权范围内。

> **面向 AI 代理的工作者：** 必需子技能：使用 `executing-plans` 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 创建不依赖 Node 后端的新 Web 前端，并完成当前已具备 Go 接口的账号、自由图片创建、创作状态读取和本地支付入口联调基础；为模板 I2I 与 I2V 保留类型化端口，但在 Go 模板与素材协议完成前保持前端封闭。

**架构：** React 页面只能调用 `src/api` 的 Go API 客户端；认证令牌、请求 ID、HTTP 错误和业务错误都在该客户端层处理。创作页面只提交业务输入与模板标识，前端不计算或裁决余额、VIP、预扣、退款或审核结果。

**技术栈：** React、TypeScript、Vite、React Router、Vitest、Testing Library。

---

## 本计划边界

- 新项目目录：`/Users/huangnaiwen/project/ai-frontend-service`。
- API 基地址只来自 `VITE_GO_API_BASE_URL`；禁止导入旧 `frontend/` 的 API、Token、钱包或上传模块。
- `ai-host-v2-platform-main` 和 `ai-business-service` 均为只读参考，不修改其中任何前端、Node、Go、配置或数据文件。
- 代码按 `app`、`api`、`features`、`components` 和 `shared` 分层；涉及业务语义、协议或安全边界的判断使用简体中文注释说明原因，禁止无意义逐行注释。
- 现有 Go Gateway 的本地精确接口是：账号 `POST /api/auth/{register,login,guest}`、`GET /api/auth/me`；图片 `POST /api/chat/image/async`、`POST /api/images/statuses`、`GET /api/images/:id`；视频 `POST /api/chat/video`、`POST /api/chat/videos/status`、`GET /api/chat/video/:id`；支付 `POST /api/wallet/{create-external-checkout,verify-purchase}`。
- 模板目录、跨端模板同步、素材上传、真实 PayCores、真实 IAP 和真实生成中台验收仍需要各自的 Go API 合同，不在本计划中伪造或回退 Node。
- 目录当前不是 Git 仓库；不执行提交命令。

## 文件结构

| 文件 | 职责 |
|---|---|
| `package.json`、`vite.config.ts`、`tsconfig*.json` | Vite、TypeScript、测试脚本与开发代理。 |
| `.env.example` | 仅声明本机 Go API 基地址，不包含密钥。 |
| `src/main.tsx`、`src/app/App.tsx`、`src/app/router.tsx` | 启动、路由和全局错误边界。 |
| `src/api/config.ts`、`src/api/http.ts`、`src/api/errors.ts` | 受控基地址、Bearer 请求、请求 ID、统一错误映射。 |
| `src/api/auth.ts`、`src/api/creations.ts`、`src/api/payments.ts` | 与 Go HTTP 合同一一对应的类型化客户端。 |
| `src/features/auth/*` | 会话存储、登录、注册、移动端游客与用户恢复。 |
| `src/features/creation/*` | T2I、模板 I2I、模板 I2V、文生视频创建状态与轮询。 |
| `src/features/payment/*` | 受控支付入口及 Go 返回结果展示。 |
| `src/test/*` | HTTP 客户端、错误映射、会话与创作页面测试。 |

### 任务 1：建立独立前端工程和安全运行配置

**文件：**

- 创建：`package.json`
- 创建：`vite.config.ts`
- 创建：`tsconfig.json`
- 创建：`index.html`
- 创建：`.env.example`
- 创建：`src/main.tsx`
- 创建：`src/app/App.tsx`
- 创建：`src/app/router.tsx`

- [ ] **步骤 1：先写环境配置测试**

创建 `src/api/config.test.ts`，固定以下行为：缺失 `VITE_GO_API_BASE_URL` 时抛出配置错误；本机 `http://127.0.0.1:18000` 可用；包含路径、查询、片段或用户名密码的 URL 被拒绝。

```ts
expect(() => resolveApiBaseUrl(undefined)).toThrow('缺少 VITE_GO_API_BASE_URL')
expect(resolveApiBaseUrl('http://127.0.0.1:18000')).toBe('http://127.0.0.1:18000')
expect(() => resolveApiBaseUrl('http://127.0.0.1:18000/api')).toThrow('必须是 Origin')
```

- [ ] **步骤 2：运行测试，确认当前不存在实现**

运行：`npm test -- config.test.ts`

预期：失败，提示无法解析 `src/api/config`。

- [ ] **步骤 3：创建工程配置和最小启动入口**

`package.json` 定义 `dev`、`build`、`test` 与 `test:watch`；测试运行 Vitest。`.env.example` 仅包含：

```dotenv
VITE_GO_API_BASE_URL=http://127.0.0.1:18000
```

`src/main.tsx` 只渲染 `<App />`。`src/app/router.tsx` 只注册 `/login`、`/register`、`/create/image`、`/create/video`、`/payment` 与 `/`; `src/app/App.tsx` 仅装配 Router、认证 Provider 和全局错误边界。不得初始化 Node SDK、旧 Analytics 客户端或钱包客户端。

- [ ] **步骤 4：实现 Origin 校验**

```ts
export function resolveApiBaseUrl(raw: string | undefined): string {
  if (!raw?.trim()) throw new Error('缺少 VITE_GO_API_BASE_URL')
  const url = new URL(raw.trim())
  if (url.origin !== url.toString().replace(/\/$/, '')) throw new Error('VITE_GO_API_BASE_URL 必须是 Origin')
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('VITE_GO_API_BASE_URL 无效')
  return url.origin
}
```

- [ ] **步骤 5：验证工程基线**

运行：`npm test -- config.test.ts && npm run build`

预期：测试通过，Vite 构建完成；输出中不含 Node 后端地址。

### 任务 2：实现唯一的 Go HTTP 客户端和错误映射

**文件：**

- 创建：`src/api/http.ts`
- 创建：`src/api/errors.ts`
- 创建：`src/api/http.test.ts`
- 创建：`src/api/errors.test.ts`

- [ ] **步骤 1：编写失败测试**

用 mock `fetch` 验证客户端会添加 `Authorization: Bearer <token>`、`X-Request-Id` 与 JSON 请求头；断言 402 映射为 `insufficient_balance`，两个不同的 403 业务码分别映射为 `phone_binding_required` 与 `vip_required`。

```ts
await expect(client.post('/api/chat/image/async', { prompt: 'cat' })).rejects.toMatchObject({ kind: 'insufficient_balance', status: 402 })
await expect(client.post('/api/chat/video', {})).rejects.toMatchObject({ kind: 'phone_binding_required', status: 403 })
```

- [ ] **步骤 2：运行测试，确认失败**

运行：`npm test -- http.test.ts errors.test.ts`

预期：失败，提示 `GoApiClient` 与 `GoApiError` 未定义。

- [ ] **步骤 3：实现 HTTP 边界**

`GoApiClient` 只接受相对路径，拒绝绝对 URL、编码路径和非 `/api/` 路径。令牌从注入的 `SessionStore` 读取；每次写请求使用 `crypto.randomUUID()` 生成 `X-Request-Id`。响应只接受 JSON，解析失败统一映射为 `system_unavailable`。

```ts
export type GoApiErrorKind = 'unauthenticated' | 'insufficient_balance' | 'phone_binding_required' | 'vip_required' | 'request_conflict' | 'system_unavailable' | 'unknown'

export type GoApiError = Error & { kind: GoApiErrorKind; status: number; code?: string }
```

- [ ] **步骤 4：实现精确错误映射**

以 HTTP 状态为第一层、Go 响应 `code` 为第二层。401 只能映射为 `unauthenticated`，402 只能映射为 `insufficient_balance`；403 必须读取业务码而不合并为一种“不能生成”；409 映射为 `request_conflict`；5xx 映射为 `system_unavailable`。

- [ ] **步骤 5：运行测试验证通过**

运行：`npm test -- http.test.ts errors.test.ts`

预期：所有错误码和请求头断言通过。

### 任务 3：实现 Go 自有会话与账号页面

**文件：**

- 创建：`src/features/auth/session-store.ts`
- 创建：`src/api/auth.ts`
- 创建：`src/features/auth/AuthProvider.tsx`
- 创建：`src/features/auth/LoginPage.tsx`
- 创建：`src/features/auth/RegisterPage.tsx`
- 创建：`src/features/auth/auth.test.tsx`

- [ ] **步骤 1：编写失败测试**

测试注册和登录只调用 Go 路径；认证成功后用 `GET /api/auth/me` 恢复用户；401 清理会话。游客入口仅在移动端适配层可见，Web 页面不制造游客身份绕过绑定。

```tsx
await user.click(screen.getByRole('button', { name: '登录' }))
expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/auth/login'), expect.any(Object))
expect(sessionStore.getToken()).toBe('go-session-token')
```

- [ ] **步骤 2：运行测试，确认失败**

运行：`npm test -- auth.test.tsx`

预期：失败，提示认证 API 或 Provider 未定义。

- [ ] **步骤 3：实现认证端口与会话恢复**

认证 API 只能调用 `/api/auth/register`、`/api/auth/login`、`/api/auth/guest`、`/api/auth/me`。Token 仅保存在浏览器会话存储；不读取旧项目 localStorage 的用户或 JWT 键。`AuthProvider` 在应用启动时调用 `me`，并只在 401 时清除本项目 token。

- [ ] **步骤 4：实现登录和注册表单**

注册要求邮箱、密码和首次写入的 IANA 时区；登录只提交邮箱和密码。错误 UI 基于 `GoApiError.kind` 显示，不解析 Node 错误文案。

- [ ] **步骤 5：运行认证回归**

运行：`npm test -- auth.test.tsx && npm run build`

预期：注册、登录、会话恢复和 401 清理全部通过。

### 任务 4：实现创作 API、状态轮询与页面状态机

**文件：**

- 创建：`src/api/creations.ts`
- 创建：`src/features/creation/useCreationStatus.ts`
- 创建：`src/features/creation/ImageCreationPage.tsx`
- 创建：`src/features/creation/VideoCreationPage.tsx`
- 创建：`src/features/creation/creation.test.tsx`

- [ ] **步骤 1：编写失败测试**

覆盖图片提交、模板图编辑提交、视频提交及其状态读取；验证前端即使当前显示余额为零也会提交请求，并由 Go 的 402 决定提示。验证视频文本入口提交的是产品模板请求，不写入技术原子字段。

```tsx
await user.click(screen.getByRole('button', { name: '开始生成' }))
expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/chat/image/async'), expect.any(Object))
expect(screen.queryByText('余额不足，无法提交')).not.toBeInTheDocument()
```

- [ ] **步骤 2：运行测试，确认失败**

运行：`npm test -- creation.test.tsx`

预期：失败，提示创作客户端或页面未定义。

- [ ] **步骤 3：实现创作 API 端口**

`src/api/creations.ts` 仅封装 6 个现有 Go 创作与状态路径。图片创建只传 `prompt`、`negativePrompt`、`aspectRatio` 和服务端模板认可的产品字段；模板图编辑只传 `templateId`、`inputImages` 与允许的产品字段；视频只传 `templateId`、首帧引用、时长及允许的产品字段。禁止发送钻石、余额、VIP、技术模型、回调地址或 Node `messageId`。

- [ ] **步骤 4：实现状态机与错误 UI**

轮询 hook 每次仅查询当前创作 ID，成功、失败和审核终态立即停止；指数退避上限为 10 秒，页面卸载时取消。402 保留表单并显示充值入口；未绑号 403 导向绑定提示；VIP 403 显示 VIP 入口；409 显示同一请求已存在，禁止再次创建第二笔预扣。

- [ ] **步骤 5：运行创作回归**

运行：`npm test -- creation.test.tsx && npm run build`

预期：三种提交、轮询停止和 401/402/403/409 错误呈现通过。

### 任务 5：接入受控本地支付入口并封闭未完成能力

**文件：**

- 创建：`src/api/payments.ts`
- 创建：`src/features/payment/PaymentPage.tsx`
- 创建：`src/features/payment/payment.test.tsx`
- 修改：`src/app/router.tsx`

- [ ] **步骤 1：编写失败测试**

断言支付页面仅请求 Go `/api/wallet/create-external-checkout` 与 `/api/wallet/verify-purchase`；未知商品、回执重放和 401 显示相应状态，不导入旧钱包客户端。

```ts
await paymentApi.createCheckout({ productId: 'coins_100' })
expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/wallet/create-external-checkout'), expect.any(Object))
```

- [ ] **步骤 2：运行测试，确认失败**

运行：`npm test -- payment.test.tsx`

预期：失败，提示支付 API 未定义。

- [ ] **步骤 3：实现支付端口与页面**

只传 `productId` 或已获得的商店回执；禁止向 Go 客户端传入或展示客户端指定的钻石数量。将当前 `local_only` 响应明确展示为“本地联调收银台”，不伪装为真实支付成功。

- [ ] **步骤 4：实现未完成能力的显式封闭页面**

模板目录和素材上传没有 Go 最终公开合同前，I2I/I2V 页面必须显示“该能力等待 Go 模板/素材接口”，并禁用提交；不得请求 Node `/api/homepage/*` 或 `/api/upload/*` 作为临时替代。

- [ ] **步骤 5：运行支付和路由回归**

运行：`npm test -- payment.test.tsx && npm run build`

预期：支付请求只到 Go，未完成能力不回退 Node。

### 任务 6：完成项目级反 Node 审计和本地浏览器验收

**文件：**

- 创建：`scripts/verify-go-only-api.mjs`
- 创建：`README.md`
- 修改：`docs/architecture/2026-09-10-go-only-frontend-design.md`

- [ ] **步骤 1：编写失败测试**

给审计脚本提供含 `api.cling-ai.com`、`/api/upload/` 或旧前端导入路径的临时文件，断言脚本返回非零并指出文件名；只含 `src/api` Go 路径的临时文件通过。

- [ ] **步骤 2：运行测试，确认失败**

运行：`node --test scripts/verify-go-only-api.test.mjs`

预期：失败，提示审计脚本未定义。

- [ ] **步骤 3：实现静态审计与本地运行说明**

脚本仅扫描 `src/`，拒绝旧前端目录导入、Node API 基地址、`/api/upload/`、旧钱包客户端名称和 Animate API 名称。README 说明必须先启动带本地 Go 路由开关的 Gateway，再启动 Vite；不包含生产地址、密钥或部署命令。

- [ ] **步骤 4：执行完整验证**

运行：

```bash
npm test
npm run build
node scripts/verify-go-only-api.mjs
```

预期：所有测试和构建通过；审计输出 `Go-only API audit passed`。

- [ ] **步骤 5：执行本地浏览器冒烟验收**

使用新的测试账号验证：注册 → 登录 → T2I 提交 → 状态读取；模拟 402、两类 403 和 409，确认 UI 保留输入且未发送第二次创建请求。I2I/I2V、模板和素材页面在 Go 合同缺失时保持封闭，不调用 Node。

## 后续独立计划

以下工作依赖尚不存在的 Go 公开合同，必须分别完成设计、实现和回归后才能解除前端封闭状态：

1. Go 模板目录：跨 Web/iOS/Android 统一的 SFW/NSFW 模板读取、版本冻结与发布机制。
2. Go 素材资产：上传、权限校验、可用资产 URL 与 I2I/I2V 引用。
3. Go 账号绑定：游客升级同一用户的公开绑定入口。
4. Go 权益读取：账户余额、VIP、每日免费额度与时区信息。
5. 真实 PayCores 与 Apple/Google 测试环境适配。
6. 生成中台测试金丝雀、真实回调验收与最终前端灰度切换。
