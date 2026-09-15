# 用户端完整迁移执行台账

**目标：** 完整迁移仍使用的用户前端，保留原有业务语义、资源关系和交互；排除管理后台及已废弃 Animate。不是以接口测试通过代替全部完成。

**边界：** 新前端为 `ai-frontend-service`，Go 为 `ai-business-service`。旧项目只读；只做本地代码和受控模拟验证，不连接生产、真实支付或付费生成。不提交或推送 Git。独立审查与实现均在临时副本进行，验证后同步明确文件。

## 当前执行

- [x] 重新读取完整迁移设计、视觉校正记录和源码，确认旧台账缩小范围的结论不可作为完成依据。
- [x] 认证视觉：主站原图、品牌、关闭、协议链接、年龄确认；保留 Go 登录注册合同，修复卸载后迟到响应抢路由。OAuth 等其它登录方式仍列为全量缺口。
- [x] 模板媒体：保留展示字段、共享媒体选择、失败回退、关停、保留草稿；修复 StrictMode 自动播放被 cleanup 暂停的问题。
- [x] 以上两项独立规格与质量审查通过；上批 215 项测试、类型检查、构建、Go-only 审计通过。临时前端 9 项认证/媒体浏览器流程及 6 项创作回归通过，安装后 9 项复验通过。
- [x] 上批 24 个源代码/测试文件及原版登录背景已安装；安装前源码备份位于 `/private/tmp/ai-frontend-completion-ndyofQ/before-install-src.tar`。
- [x] 本批充值代码：移除固定商品 ID；增加 Go 自有已发布商品列表、本人订单状态、前端商品选择和支付回跳只读页。前端与 Go 规格审查通过，前端质量审查通过。
- [x] 本批前端与 Go 规格、质量审查均通过；补齐慢请求、60 次上限、错误停止/重试、请求未返回时卸载、收银台 URL 等测试。16 个前端文件和 11 个 Go 文件已同步到独立项目，未改旧项目、Git 或运行配置。

## 充值批次实现边界

原版商品入口 `/api/wallet/products` 允许匿名浏览；订单入口 `/api/payments/order-status/:orderId` 必须 Go 自有会话。商品字段为 `id/version/label/diamondAmount/amountCents/currency`，每个 ID 选择最新已发布版本后再检查可支付性，不回退旧价格。当前 PayCores 内部固定 USD，因此暂不把其它币种呈现为可购买商品。

前端新增 `api/payment-contract.ts` 负责白名单解析，`features/payment/CheckoutPanel.tsx` 负责商品选择和仅提交商品 ID，`usePaymentOrder.ts` 负责 5 秒串行只读查询（60 次上限），`PaymentResultPage.tsx` 负责结果，`PaymentReturnRoute.tsx` 承接旧充值回跳。URL 的成功状态、金额和 VIP 参数不能宣告入账；待支付不表示退款，错误也不表示支付失败。

Go 新增 `biz/payments/read.go`、`data/payment_read.go`、`transport/localpayment/query.go`，复用自有 Mongo 仓储、登录鉴权和现有支付开关。只有既有入账事务将订单置为 paid 后，查询才返回两项完成标记。读取没有结算能力，不调用 PayCores，也不接触旧钱包。

最终验证：前端 26 个测试文件、252 项全量测试通过；应用与工具 TypeScript 检查、Vite 构建（1931 modules）、5 个公共页预渲染及 Go-only 审计通过。390×844、1440×1000、844×390 的浏览器充值流程全部通过，所有 API 为明确本地 mock，外部请求为零。Go 的 payments、localpayment、gateway、cmd/api-gateway 和 data 包测试通过；payments/localpayment/gateway 的 race 检测通过。真实 Mongo 集成未执行，不宣称真实收银台或真实入账已验收。

当前运行于 18002 的旧 Go 进程尚未重新装载本批二进制和精确 GET 路由开关。安装源码不等于运行态已切换，必须另外核对本地启动方式和隔离配置，不得修改生产配置。

## 下一接力点

1. 核对并补齐本地 Gateway 运行态：进程 PID 73874（记录时）执行 `/private/tmp/ai-business-service-local-gateway`。本轮没有重启它、没有修改路由开关。可疑本地开关文件为 `/private/tmp/cling-go-gateway-frontend-routes.json` 和 `/private/tmp/cling-go-gateway-payment-routes.json`，先确认实际使用文件，不能猜。新增精确键为 `GET /api/wallet/products` 与 `GET /api/payments/order-status/:orderId`。
2. 付款这批只覆盖钻石商品与订单状态；VIP 套餐/订阅权益、支付方式选择、crypto 深链、完整 IAP UI 仍未完成。现有 PaymentProduct 不含订阅权益，不得拿钻石商品冒充 VIP。
3. 整站剩余：访客首页、原版 OAuth/magic link/回调及安全 return-to；完整账号资料/设置；作品删除/重试/下载/结果转视频；通知筛选/清已读/目标跳转；反馈匿名语义及附件；语言前缀、PWA、邀请、发现和动态 SEO。继续根据旧源码核对，不以缺少 Go 合同判为废弃。
4. 真实模板关联快照仍缺，Go 本地目录是测试数据。音频虽然 Go 请求结构有字段，但当前 handler 拒绝 true，前端不能添加无效音频开关来冒充完成。

本批文件与截图暂存：`/private/tmp/ai-frontend-completion-ndyofQ`；Go 暂存 `/private/tmp/ai-payment-read-sfPVvG`。前端安装前备份 `before-payment-src.tar`，Go 安装前备份 `before-install.tar`。未停止用户的 5176 Vite，临时 5184 Vite 已停止。整个迁移目标仍为进行中。

## 全量完成门

以下任何一项未有源码及运行证据，整体目标均保持未完成。

- [ ] 首页与认证：访客首页、年龄确认、原版登录方式、绑定同一用户、退出与恢复、原图源及原入口。
- [ ] 目录与创作：真实模板 ID/封面/示例/分类/排序/启用状态，SFW/NSFW，模板编辑、多图、视频时长/音频、VIP/每日免费提示、三类创建及文本视频编排、作品结果。
- [ ] 账号与设置：用户资料、安全、关联账号、通知/分享设置、语言选择，以及旧导航中仍使用的子页。
- [ ] 钱包权益：余额、账本、VIP、日免、充值、支付结果和商店内购入口。只认 Go 账本和回调，前端不按余额阻断生成。
- [ ] 内容互动：作品列表和详情、通知、反馈、个人主页、发现、邀请、消息。需要使用证据核对，不得用「没有 Go 合同」推断已废弃。
- [ ] 公共与分发：原始公共内容、语言前缀、模板/提示词/博客/角色 SEO、PWA 安装与更新体验；未登录静态产物不得泄露个人数据。
- [ ] 其它旧入口：逐个查旧路由、导航及本地证据；有使用入口的按原语义迁移，无证据的保留核实项，不擅自下线。
- [ ] 全面回归：路由入口、错误、空态、分页、刷新、权限与并发，以及手机/桌面截图逐项核验。模拟验收与真实外部验收分开标注。

## 已知证据约束

Go 本地视频目录目前只返回模板 ID 作为标题，没有封面与示例 URL；图片目录只有一个测试换装模板和品牌图标。旧 `frontend/public` 的图片并非动态模板目录快照，不能按名称猜测关联。需继续检查本地可用快照和目录投影，不能为了页面看起来有图而伪造业务资源。
