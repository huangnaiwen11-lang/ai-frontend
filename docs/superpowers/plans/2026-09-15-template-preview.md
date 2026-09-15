# 模板封面预览实施计划

目标：在新前端保留已有选择与提交逻辑，迁移旧版独立预览入口和底部弹层的基础展示。

架构：TemplatePicker 负责候选模板与选择；TemplatePreviewDialog 只展示当前目录允许访问的封面。使用浏览器原生 dialog 管理模态焦点。模板资源路径只进行已核实的品牌图标重映射，不拼接 CDN 或补造视频地址。

技术：React、TypeScript、原生 dialog、Lucide、Vitest、Playwright。沿用现有深色品牌令牌和 560px 内容宽度，不改旧项目、Go、依赖或环境配置，不使用 Git。

- [x] 核对旧 PresetGrid / TemplateDetailSheet 与当前 Go 目录：旧弹层包含生成设置；本次只迁移封面预览部分，生成设置仍在现有表单。
- [x] 在 TemplatePicker.test.tsx 添加失败测试：预览不选择、确认选择一次、关闭释放锁、加载失败与无封面、目录撤销、提交中禁止打开。
- [x] 抽出 template-media.ts 的封面路径解析；增加 TemplatePreviewDialog.tsx 和对应样式；修改 TemplatePicker 的入口，不把按钮嵌入 label。
- [x] 运行全套 Vitest、TypeScript、Go-only 审计、临时构建与预渲染。
- [x] Playwright 在 390 × 844、1440 × 1000 及 844 × 390 验证预览解码、焦点、Esc、遮罩关闭、选择一致性、无自动 POST、无溢出。
- [x] 独立审查，核对文件差异并同步到新前端，记录真实目录与预览视频尚未迁移的限制。安装目录全套 172 项测试通过，5176 三种尺寸浏览器复验通过。
