import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AuthUser, RuntimeAuthUser } from "../../api/auth";

const useAuthMock = vi.hoisted(() => vi.fn());

vi.mock("../auth/AuthProvider", () => ({
  useAuth: useAuthMock,
}));

import { AccountPage } from "./AccountPage";

describe("AccountPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    useAuthMock.mockReset();
  });

  it("只展示 Go 会话投影允许的已绑定账户事实，不请求钱包、作品或旧 Node", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    useAuthMock.mockReturnValue({ user: boundUser, isLoading: false });

    renderAccountPage();

    expect(
      screen.getByRole("heading", { name: "用户中心" }),
    ).toBeInTheDocument();
    expect(screen.getByText("昵称：测试用户")).toBeInTheDocument();
    expect(screen.getByText("账户：已绑定")).toBeInTheDocument();
    expect(screen.getByText("账户状态：正常")).toBeInTheDocument();
    expect(screen.getByText("内容访问：标准内容访问")).toBeInTheDocument();
    expect(screen.getByText("时区：Asia/Shanghai")).toBeInTheDocument();
    expect(
      screen.getByText(
        "每日额度会按 Asia/Shanghai 时区重置；浏览器设置不会改变服务端时区。",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/user-1|余额|外部身份|支付|生成/),
    ).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("昵称为空时显示未设置昵称，并显示安全内容访问", () => {
    useAuthMock.mockReturnValue({
      user: {
        ...boundUser,
        displayName: "",
        contentAccess: "review_restricted",
      },
      isLoading: false,
    });

    renderAccountPage();

    expect(screen.getByText("昵称：未设置昵称")).toBeInTheDocument();
    expect(screen.getByText("内容访问：安全内容访问")).toBeInTheDocument();
  });

  it("游客显示绑定前提示和安全绑定表单", () => {
    useAuthMock.mockReturnValue({ user: guestUser, isLoading: false });

    renderAccountPage();

    expect(screen.getByText("账户：游客账户")).toBeInTheDocument();
    expect(screen.getByText("绑定账号后才能生成内容。")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "绑定账号" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "完成绑定" })).toBeDisabled();
  });

  it("无令牌时显示未登录引导和登录链接", () => {
    useAuthMock.mockReturnValue({
      user: null,
      isLoading: false,
      sessionRestoreState: "missing",
    });

    renderAccountPage();

    expect(
      screen.getByRole("heading", { name: "用户中心" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("请登录后查看用户中心");
    expect(screen.getByRole("link", { name: "前往登录" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("Go 401 时显示会话失效提示和登录链接", () => {
    useAuthMock.mockReturnValue({
      user: null,
      isLoading: false,
      sessionRestoreState: "expired",
    });

    renderAccountPage();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "登录已失效，请重新登录",
    );
    expect(screen.getByRole("link", { name: "前往登录" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("恢复会话时显示状态提示", () => {
    useAuthMock.mockReturnValue({ user: null, isLoading: true });

    renderAccountPage();

    expect(screen.getByRole("status")).toHaveTextContent("正在恢复登录状态…");
  });

  it("会话恢复失败时展示失败提示，不误报登录失效", () => {
    useAuthMock.mockReturnValue({
      user: null,
      isLoading: false,
      sessionRestoreState: "failed",
      sessionRestoreError: "暂时无法恢复登录状态，请稍后重试。",
    });

    renderAccountPage();

    expect(
      screen.getByRole("heading", { name: "用户中心" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "暂时无法恢复登录状态，请稍后重试。",
    );
    expect(
      screen.queryByText("登录已失效，请重新登录"),
    ).not.toBeInTheDocument();
  });

  it("未知账户和内容访问状态一律显示状态待确认", () => {
    useAuthMock.mockReturnValue({
      user: {
        ...boundUser,
        accountStatus: "pending_review",
        contentAccess: "unexpected",
      } satisfies RuntimeAuthUser,
      isLoading: false,
    });

    renderAccountPage();

    expect(screen.getAllByText("状态待确认", { exact: false })).toHaveLength(2);
  });

  it("未知绑定状态显示状态待确认，不默认视为已绑定", () => {
    useAuthMock.mockReturnValue({
      user: {
        ...boundUser,
        bindingState: "binding_pending",
      } satisfies RuntimeAuthUser,
      isLoading: false,
    });

    renderAccountPage();

    expect(screen.getByText("账户：状态待确认")).toBeInTheDocument();
    expect(screen.queryByText("账户：已绑定")).not.toBeInTheDocument();
  });
});

function renderAccountPage() {
  return render(
    <MemoryRouter>
      <AccountPage />
    </MemoryRouter>,
  );
}

const boundUser: AuthUser = {
  id: "user-1",
  displayName: "测试用户",
  bindingState: "bound",
  accountStatus: "normal",
  contentAccess: "standard",
  timezone: "Asia/Shanghai",
  isGuest: false,
};

const guestUser: AuthUser = {
  ...boundUser,
  bindingState: "guest",
  isGuest: true,
};
