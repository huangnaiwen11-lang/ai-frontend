import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PUBLIC_CONTENT } from "./content/public-content";
import { FaqAccordion } from "./components/FaqAccordion";
import { DocumentPage } from "./pages/DocumentPage";
import { FaqPage } from "./pages/FaqPage";

let navigatorLanguageDescriptor: PropertyDescriptor | undefined;

describe("公共页面", () => {
  beforeEach(() => {
    navigatorLanguageDescriptor = Object.getOwnPropertyDescriptor(
      window.navigator,
      "language",
    );
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    restoreNavigatorLanguage();
  });

  it("以中文显示 FAQ，并让问题按钮控制关联答案", async () => {
    const user = userEvent.setup();

    render(<FaqPage locale="zh" />);

    expect(
      screen.getByRole("heading", { name: "常见问题解答", level: 1 }),
    ).toBeInTheDocument();
    const question = screen.getByRole("button", {
      name: "如何创建 AI 图像或视频？",
    });
    expect(question).toHaveAttribute("aria-expanded", "false");

    question.focus();
    await user.keyboard("{Enter}");

    expect(question).toHaveAttribute("aria-expanded", "true");
    expect(question).toHaveAttribute("aria-controls");
    expect(
      screen.getByText(
        "打开“创建”，选择“图像”或“视频”，根据需要上传照片，编写提示，然后点击“生成”。生成完成后，您的结果将保存到配置文件中。",
      ),
    ).toBeVisible();
    const answerRegion = screen.getByRole("region", {
      name: question.textContent ?? "",
    });
    expect(answerRegion).toHaveAttribute(
      "id",
      question.getAttribute("aria-controls"),
    );
    expect(answerRegion).toHaveAttribute(
      "aria-labelledby",
      question.getAttribute("id"),
    );
  });

  it("通过显式英文 locale 显示英文 FAQ", () => {
    render(<FaqPage locale="en" />);

    expect(
      screen.getByRole("heading", {
        name: "Frequently Asked Questions",
        level: 1,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "What is Cling AI?" }),
    ).toBeInTheDocument();
  });

  it("将非中文浏览器语言默认回退为英文 FAQ", () => {
    setNavigatorLanguage("ja-JP");

    render(<FaqPage />);

    expect(
      screen.getByRole("heading", {
        name: "Frequently Asked Questions",
        level: 1,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "What is Cling AI?" }),
    ).toBeInTheDocument();
  });

  it("按原文显示隐私政策的标题、更新时间、章节和联系邮箱", () => {
    render(<DocumentPage documentKey="privacy" locale="en" />);

    expect(
      screen.getByRole("heading", { name: "Privacy Policy", level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Last Updated: December 30, 2024"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "1. Information We Collect",
        level: 2,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/privacy@cling-ai\.com/)).toBeInTheDocument();
  });

  it.each(["privacy", "terms", "contentPolicy"] as const)(
    "按原文顺序显示 %s 的章节，并保留正文换行样式",
    (documentKey) => {
      const document = PUBLIC_CONTENT.zh[documentKey];

      render(<DocumentPage documentKey={documentKey} locale="zh" />);

      expect(
        screen
          .getAllByRole("heading", { level: 2 })
          .map((heading) => heading.textContent),
      ).toEqual(document.sections.map((section) => section.title));
      const firstSectionContent = screen.getByText(
        (_content, element) =>
          element?.tagName === "P" &&
          element.textContent === document.sections[0].content,
      );
      expect(firstSectionContent.textContent).toBe(
        document.sections[0].content,
      );
      expect(firstSectionContent).toHaveStyle({ whiteSpace: "pre-wrap" });
    },
  );

  it("为每个 FAQ 实例生成独立的按钮和答案区域 ID", () => {
    render(
      <>
        <FaqAccordion items={PUBLIC_CONTENT.zh.faq.items} />
        <FaqAccordion items={PUBLIC_CONTENT.zh.faq.items} />
      </>,
    );

    const questions = screen.getAllByRole("button", {
      name: "如何创建 AI 图像或视频？",
    });
    const questionIds = questions.map((question) => question.id);
    const answerIds = questions.map((question) =>
      question.getAttribute("aria-controls"),
    );

    expect(new Set(questionIds).size).toBe(questions.length);
    expect(new Set(answerIds).size).toBe(questions.length);
  });

  it("切换语言后不保留同一索引问题的展开状态", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<FaqPage locale="zh" />);
    const ChineseQuestion = screen.getByRole("button", {
      name: "如何创建 AI 图像或视频？",
    });

    await user.click(ChineseQuestion);
    rerender(<FaqPage locale="en" />);

    expect(
      screen
        .getAllByRole("button")
        .every(
          (question) => question.getAttribute("aria-expanded") === "false",
        ),
    ).toBe(true);
  });

  it("显示公共路由链接，且页面不请求网络或展示 Animate", () => {
    render(<DocumentPage documentKey="terms" locale="zh" />);

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(5);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/faq",
      "/privacy",
      "/terms",
      "/content-policy",
      "/feedback",
    ]);
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.queryByText(/Animate/i)).not.toBeInTheDocument();
  });
});

function setNavigatorLanguage(language: string) {
  Object.defineProperty(window.navigator, "language", {
    configurable: true,
    value: language,
  });
}

function restoreNavigatorLanguage() {
  if (navigatorLanguageDescriptor) {
    Object.defineProperty(
      window.navigator,
      "language",
      navigatorLanguageDescriptor,
    );
    return;
  }
  Reflect.deleteProperty(window.navigator, "language");
}
