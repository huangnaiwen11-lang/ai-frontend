# 公共页面原文平移设计

## 目标

在 `ai-frontend-service` 迁移 FAQ、隐私政策、服务条款和内容政策四类公共页面，仅提供中文与英文。正文逐字取自旧站当前页面的对应语言版本，不擅自改写法律、支付、账户删除、内容审核或联系方式表述。

## 来源与语言范围

| 页面 | 旧站原文来源 | 本批语言 |
|---|---|---|
| FAQ | `frontend/src/i18n/locales/zh.json`、`en.json` 的 `faq` 内容 | 中文、英文 |
| 隐私政策 | `frontend/src/pages/PrivacyPolicyPage.tsx` 的内置内容 | 中文、英文 |
| 服务条款 | `frontend/src/features/termsOfService/TermsOfServicePageImpl.tsx` 的内置内容 | 中文、英文 |
| 内容政策 | `frontend/src/pages/ContentPolicyPage.tsx` 的内置内容 | 中文、英文 |

旧站文件只作为迁移时的只读来源；新应用构建产物不能导入旧项目文件或请求旧 Node API。

## 架构

```text
浏览器语言
    ↓（zh 开头选中文，其余选英文）
静态内容仓库 public-content.ts
    ↓
PublicPageLayout + LegalPage / FaqPage
    ↓
/faq /privacy /terms /content-policy
```

- `features/public-pages/content/` 只保存不可变原文和来源说明。
- `features/public-pages/components/` 只负责结构化渲染、语言选择和可访问性。
- `features/public-pages/pages/` 只编排对应页面，不访问网络。
- 公共页不包进登录态应用壳，因此不会预读认证、钱包、模板或作品数据。

## 展示与可访问性

- FAQ 使用原生 `button` 与 `aria-expanded` 控制单项展开，支持键盘操作。
- 政策页以 `h1`、更新时间和有序章节呈现；换行保持原文语义。
- 浏览器语言以 `zh` 前缀选择中文，其他值回退英文。页面不提供伪翻译或切换到未迁移语言的入口。
- 页脚只链接本批四个规范公共路由，不恢复 Animate、旧工具或旧支付入口。

## 不可改变的边界

- 不更改原文、更新时间、章节次序、联系邮箱或政策承诺。
- 不以页面文案实现浏览器端内容门禁、VIP 判定、退款、账户删除或生成规则；这些仍以 Go 返回的业务事实为准。
- 不迁移旧 SEO/SSR、营销埋点、旧 i18n 基础设施和其他语言。
- 不连接旧 Node、Go、支付、生成中台或生产环境。

## 验收

- 四个路由均可匿名访问且没有 API 请求。
- 中文与英文标题、更新时间、章节数、联系邮箱和 FAQ 问答与指定旧站原文一致。
- FAQ 折叠具备 `aria-expanded`；法律正文具备正确的标题层级。
- 源码和构建路径继续通过 Go-only 静态审计。
