# AI Frontend Service

这是 Cling AI 的独立 Web 前端。它只调用 Go API Gateway，不读取旧 Node 登录态、钱包、模板或上传接口。

## 当前能力

- Go 自有账号：注册、登录和会话恢复。
- 图片创作：T2I 与模板 I2I 均由 Go 完成门禁、预扣、生成回调与状态读取。
- 模板视频：模板 I2V 由 Go 完成首帧/视频编排入口、门禁、预扣、回调与状态读取。
- 用户中心：钱包、作品、通知和反馈均只调用 Go API。
- 本地支付入口：只提交商品 ID，并准确标识 `local_only` 联调收银台。
- 真实外部支付、OAuth、短信和生成中台仍保持本地封闭，不伪装成功。

Animate 不属于本项目，也没有入口或任务创建代码。

## 目录职责

| 目录 | 职责 |
| --- | --- |
| `src/app` | 应用装配、路由、全局错误边界和 Go 客户端依赖注入。 |
| `src/api` | Go HTTP 合同、鉴权、请求 ID 与错误码映射。 |
| `src/features` | 账号、创作和支付的页面与交互状态。 |
| `src/components` | 后续可复用的纯展示组件；不得直接发起请求。 |
| `scripts` | 项目级安全与依赖边界检查。 |

页面与 `features` 不直接使用 `fetch`。所有 HTTP 请求必须经过 `src/api/http.ts`，因此 Go 会话、`X-Request-Id`、JSON 合同和 401/402/403/409 错误映射保持一致。

## 本地启动

环境要求：Node.js 22 或更高版本，以及已在本机启动并开启精确路由接管的 Go API Gateway。

```bash
npm install
cp .env.example .env.local
npm run dev
```

`.env.local` 在本地浏览器联调时使用 Vite 同源 Origin，并只把 `/api` 代理到 Go Gateway：

```dotenv
VITE_GO_API_BASE_URL=http://127.0.0.1:5174
VITE_GO_GATEWAY_TARGET=http://127.0.0.1:18000
```

发布环境不使用该开发代理，`VITE_GO_API_BASE_URL` 应配置为已具备跨域策略的 Go Gateway Origin。不要将旧 Node 地址、生产地址、密钥、支付密钥或用户令牌写入环境文件。

### Go Gateway 本地联调前置条件

新前端不会修改或启动旧 Go 项目。负责启动本地 Gateway 的环境必须独立满足以下条件，否则 `/api/auth/*` 会保持 `404`，真实账号和创作闭环无法开始：

- 启用 Go 会话与账号入口：`GATEWAY_GO_SESSION_AUTH_ENABLED=true`、`GATEWAY_LOCAL_AUTH_ENTRY_ENABLED=true`。
- 启用自由文生图时额外设置：`GATEWAY_PUBLIC_T2I_ENABLED=true`。
- 启用模板 I2I/I2V 时分别打开 `GATEWAY_LOCAL_MEDIA_ENABLED=true`、`GATEWAY_PUBLIC_VIDEO_ENABLED=true`。
- 启用通知时打开 `GATEWAY_LOCAL_NOTIFICATIONS_ENABLED=true`。
- `GATEWAY_EXACT_ROUTE_SWITCH_FILE` 指向一个仅本地使用的精确路由白名单文件，例如：

```json
{
  "routes": {
    "POST /api/auth/register": true,
    "POST /api/auth/login": true,
    "GET /api/auth/me": true,
    "POST /api/chat/image/async": true,
    "POST /api/images/statuses": true,
    "GET /api/images/:id": true,
    "POST /api/chat/video": true,
    "POST /api/chat/videos/status": true,
    "GET /api/chat/video/:id": true,
    "POST /api/media/images": true,
    "GET /api/media/images/:id": true,
    "GET /api/homepage/image-templates": true,
    "GET /api/homepage/video-templates": true,
    "GET /api/wallet/summary": true,
    "GET /api/wallet/ledger": true,
    "GET /api/works": true,
    "GET /api/works/:id": true,
    "GET /api/notifications": true,
    "GET /api/notifications/unread-count": true,
    "POST /api/notifications/read-all": true,
    "POST /api/notifications/:id/read": true,
    "DELETE /api/notifications/:id": true
  }
}
```

这不是生产切流配置，也不能放行任何 Node 路由别名、编码路径或通配路径。

## 验证

```bash
npm test
npm run build
npm run verify:go-only
node --test scripts/verify-go-only-api.test.mjs
```

`verify:go-only` 会扫描交付源码，拒绝旧 Node API、旧上传接口、旧钱包客户端和 Animate API。它不是生成服务、支付服务或生产环境的替代验收。

## 业务边界

- 前端不根据余额决定能否提交生成；Go 创建接口是唯一门禁，避免并发请求出现双免。
- HTTP 402 表示余额不足；HTTP 403 会根据 Go 业务码区分「需绑定账号」和「需 VIP」；HTTP 409 表示幂等冲突。
- 前端不提交钻石、余额、VIP、模型或回调 URL。预扣、冲正、审核没收、权益和回调幂等均由 Go 服务端处理。
- 游客绑定必须升级同一个 Go 用户，不能在前端创建替代账号。
