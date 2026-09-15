# 用户中心只读身份页设计

## 目标

在独立前端项目 `ai-frontend-service` 中开放 `/me`，展示当前 Go 会话已确认的身份信息。页面只读取 `GET /api/auth/me`，不读取旧 Node 数据，也不伪造资料、余额、作品、通知或安全配置。

本批次同时修正前端与 Go 的内容访问字段合同：Go 返回的值是 `standard` 或 `review_restricted`，它表示内容审核访问状态，不是用户自行选择的 `sfw` 或 `nsfw`。

## 范围

### 本批次实现

- 用户中心的昵称、游客或已绑定状态、账号状态、内容访问状态与首次固定的时区。
- 初始加载、会话失效和通用读取失败的可访问状态。
- 复用现有 `AuthProvider` 的 `/api/auth/me` 读取链路，不引入第二套身份来源。
- 将 `AuthUser.contentAccess` 收敛为 Go 安全投影的联合类型。

### 明确不实现

- 修改昵称、时区或账户状态。时区按既有规则首次写入后不允许浏览器侧修改。
- 修改密码、找回密码、注销、绑定手机号或第三方账号、通知设置。
- 游客绑定流程。该流程需要 Go 的原子绑定写入合同，不能在前端拼接注册行为替代。
- 旧 Node 的 `/profile`、设置、钱包或通知 API。

## 合同与数据流

```text
用户访问 /me
    ↓
AuthProvider 恢复 Go 会话
    ↓
GET /api/auth/me（Bearer Go 会话）
    ↓
Go 安全用户投影
    ├── displayName
    ├── bindingState
    ├── accountStatus
    ├── contentAccess
    └── timezone
    ↓
AccountPage 只读展示
```

`id` 仍只用于前端的会话对象识别，不在页面输出。页面不以 `accountStatus` 自行做权限判断；Go 会话认证、路由门禁和生成提交仍是唯一事实来源。

## 展示规则

| Go 字段 | 页面文案 | 约束 |
|---|---|---|
| `displayName` | 昵称 | 空值时显示“未设置昵称”，不推断邮箱或用户 ID。 |
| `bindingState=guest` | 游客账户 | 仅提示需绑定后才可生成，不提供伪造绑定入口。 |
| `bindingState=bound` | 已绑定账户 | 不显示绑定提供方或外部身份标识。 |
| `accountStatus=normal` | 账户正常 | 仅描述当前投影，不在浏览器实现封禁逻辑。 |
| `contentAccess=standard` | 标准内容访问 | 不将其误译为 SFW/NSFW 开关。 |
| `contentAccess=review_restricted` | 安全内容访问 | 内容筛选继续由 Go 模板目录和生成门禁执行。 |
| `timezone` | 每日额度时区 | 说明它用于日额度切换，但不提供修改控件。 |

未知枚举值以“状态待确认”展示，避免客户端把服务端新值误判为更宽松权限。

## 错误与会话规则

- `/api/auth/me` 返回 `401`：沿用 `AuthProvider` 清理本项目 Go 会话令牌；页面显示“登录已失效，请重新登录”。
- 没有令牌：显示登录引导，不请求旧 Node，也不构造匿名用户资料。
- 网络或 `5xx`：显示可访问错误提示；不得清令牌，以免短暂网络问题将用户强制登出。
- 账号封禁或删除引发的会话失效仍由 Go 返回 `401`，浏览器不缓存为可继续使用的身份。

## 工程边界与测试

- `src/api/auth.ts` 是认证合同唯一入口，类型必须与 Go `safeUser` 投影一致。
- `src/features/account/AccountPage.tsx` 只编排显示与状态，不直接 `fetch`，不读取钱包或作品模块。
- `src/features/account/account.test.tsx` 覆盖已绑定、游客、未认证、未知内容状态与无旧 API 调用。
- 更新既有认证测试，使 `standard` 和 `review_restricted` 成为真实样本。
- 最终运行 `npm test`、`npm run build`、`npm run verify:go-only`。

## 验收标准

- `/me` 仅根据 Go 会话投影展示身份信息。
- 前端内容访问类型与 Go 真实 JSON 值一致。
- 游客、已绑定、失效会话与网络失败均有明确、可访问的状态。
- 页面不展示用户 ID、外部身份、余额、作品、支付或生成中台字段。
- 不修改旧 Node 项目，不连接生产、真实支付或生成中台。
