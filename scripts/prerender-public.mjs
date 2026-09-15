import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

// 公共页不依赖 Go API，构建时生成可被搜索引擎直接读取的最小 HTML；
// 进入浏览器后仍由 React 接管完整交互，避免为登录和创作页引入 SSR 会话风险。
const pages = [
  {
    path: "faq",
    title: "常见问题 - Cling AI",
    heading: "常见问题",
    description: "了解 Cling AI 的账号、内容审核和创作流程。",
  },
  {
    path: "privacy",
    title: "隐私政策 - Cling AI",
    heading: "隐私政策",
    description: "Cling AI 的隐私保护与数据处理说明。",
  },
  {
    path: "terms",
    title: "服务条款 - Cling AI",
    heading: "服务条款",
    description: "Cling AI 用户服务条款与使用规则。",
  },
  {
    path: "content-policy",
    title: "内容政策 - Cling AI",
    heading: "内容政策",
    description: "Cling AI 的内容安全和审核政策。",
  },
  {
    path: "feedback",
    title: "反馈与支持 - Cling AI",
    heading: "反馈与支持",
    description: "联系 Cling AI 支持团队反馈账号、审核和创作问题。",
  },
];

const dist = new URL("../dist/", import.meta.url);
const template = await readFile(new URL("index.html", dist), "utf8");

for (const page of pages) {
  const html = template
    .replace('<html lang="zh-CN">', '<html lang="zh-CN">')
    .replace(
      /<meta name="description" content="[^"]*" \/>/,
      `<meta name="description" content="${page.description}" />`,
    )
    .replace(/<title>[^<]*<\/title>/, `<title>${page.title}</title>`)
    .replace(
      '<div id="root"></div>',
      `<div id="root"><main><h1>${page.heading}</h1><p>${page.description}</p></main></div>`,
    );
  const output = join(dist.pathname, page.path, "index.html");
  await mkdir(join(dist.pathname, page.path), { recursive: true });
  await writeFile(output, html, "utf8");
}

console.log(`Pre-rendered ${pages.length} public pages`);
