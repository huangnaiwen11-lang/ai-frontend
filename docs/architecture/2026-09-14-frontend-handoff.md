# 前端重构接续记录

日期：2026-09-14。用户要求保存上下文后暂停，等“继续”再实施。

## 项目与边界

- 新前端：`/Users/huangnaiwen/project/ai-frontend-service`。
- Go：`/Users/huangnaiwen/project/ai-business-service`。
- 旧项目：`/Users/huangnaiwen/project/ai-host-v2-platform-main`，前后端保持只读。
- 用户要求准确还原旧前端视觉、资源和业务语义，不是重新设计。Animate 和管理后台排除，其它用户入口需核实用途。
- 只做本地，不接生产、真实生成、支付或 OAuth，不提交 Git；结构清晰、中文注释。选择模板不上传、不创建任务，前端不按余额阻挡免费额度生成。

## 当前成果

本轮只改新前端。公共 TemplatePicker 支持封面、radio/select 同步、加载失败降级和提交中禁用；media.ts 保留视频 coverUrl 并校验，继续剔除技术配方；图片编辑和视频页接入，增加回归测试。

从旧 critical.css 提取品牌、字体、560px 内容框和 80px 侧栏；修正桌面侧栏、移动底栏、导航图标和选中态，移除错误全站充值背景。删除 header backdrop-filter，避免 fixed 底栏定位错误；修正桌面标签换行；补全局链接颜色，解决壳外登录页深底链接不可读。

已登录首页转视频；反馈路由先恢复会话，修复外层无条件跳登录遮挡认证表单的问题。新增 lucide-react 固定版本依赖。

本地 .env.local 的 API 基地址由 5174 改为 5176，Gateway 上游仍为 18002。5176 服务确实运行在新项目目录；此前所谓本机网络隔离的判断错误。恢复时重新检查进程，不盲目杀服务。

## 验证证据

- 最终 npm test：19 个文件、150 项测试通过。
- npm run verify:go-only 和 npm run build 通过，包含 5 个公共页预渲染。
- 模板编辑页检查 390 × 844 和 1440 × 1000 布局；桌面侧栏不换行、无横向溢出，移动底栏定位纠正。
- 登录链接对比度修复前 2.13:1，修复后浏览器实测 8.84:1。
- 图片目录仅本地换装测试项，封面是品牌图标。/legacy/cling-ai-icon.png 实际加载成功，不代表旧业务封面迁移完成。
- 视频目录实际为 11 个 local-video-5 测试模板，均无 coverUrl。不能随意配图冒充真实模板。
- 未做真实生成、支付、OAuth 或已登录反馈表单的浏览器提交；本轮没改 Go，未重跑 Go 全套。
- 浏览器 viewport 已 reset；末次页面 http://127.0.0.1:5176/studio/video。不要依赖旧标签或进程 ID。

## 继续入口

先读同目录 `2026-09-14-visual-migration-correction.md` 与 `2026-09-12-frontend-phase-status.md`，再核实运行状态。

优先追踪旧源码、本地快照中的真实模板 ID、封面、预览、分类、顺序和启用状态。缺本地数据应说明具体缺口，不擅自访问生产、不伪造资源。随后按旧页面还原首页、模板列表与弹层、素材和结果预览，同尺寸逐页验收，保留 Go API 边界。

旧站定位：frontend/src/critical.css、components/SideNav.tsx、BottomTabBar.tsx、BrandLogo.tsx、app/AppRoutes.tsx 的 HomeGate、features/videoPresets/VideoPresetsMainContent.tsx、components/home/PresetGrid.tsx、styles/content-cards.css。

## 仍未完成

未登录首页和登录注册完整旧视觉；真实模板目录和业务封面预览；模板弹层和素材预览；图片创作完整输入与结果体验；用户中心、设置、钱包、作品、通知、反馈整页对照；公共内容、语言路由、动态 SEO、PWA 和其它仍使用的旧入口核查。

不能把接口测试通过、静态资源已复制或品牌图标加载成功表述为整个前端迁移完成。当前暂停，不自动续跑。
