import { describe, expect, it, vi } from "vitest";
import { AuthApi } from "./auth";
import { isGoApiError } from "./http";

describe("AuthApi.me", () => {
  it.each([
    null,
    {},
    { user: null },
    { user: { ...validUser, id: 1 } },
    { user: { id: "user-1" } },
  ])("拒绝畸形 Go 用户投影：%j", async (data) => {
    await expect(createAuthApi(data).me()).rejects.toSatisfy(
      (error: unknown) =>
        isGoApiError(error) &&
        error.code === "INVALID_API_RESPONSE" &&
        error.status === 503,
    );
  });

  it("保留 Go 返回的未知枚举字符串供页面收敛展示", async () => {
    const user = {
      ...validUser,
      bindingState: "binding_pending",
      accountStatus: "suspended_pending",
      contentAccess: "future_access",
    };
    await expect(createAuthApi({ user }).me()).resolves.toMatchObject(user);
  });
});

describe("AuthApi.bindGuest", () => {
  it("只把服务端验证凭据提交到 Go 绑定接口", async () => {
    const post = vi.fn().mockResolvedValue({ user: validUser });
    const api = new AuthApi({ get: vi.fn(), post } as never);

    await expect(
      api.bindGuest({ provider: "email", credential: "signed-proof" }),
    ).resolves.toMatchObject({
      user: validUser,
    });
    expect(post).toHaveBeenCalledWith("/api/auth/bind", {
      provider: "email",
      credential: "signed-proof",
    });
  });
});

describe("AuthApi security methods", () => {
  it("使用固定 Go 路径提交资料和安全操作", async () => {
    const post = vi.fn().mockResolvedValue({ changed: true });
    const patch = vi.fn().mockResolvedValue({ user: validUser });
    const del = vi.fn().mockResolvedValue({ revoked: true });
    const api = new AuthApi({
      get: vi.fn(),
      post,
      patch,
      delete: del,
    } as never);

    await api.updateDisplayName("新昵称");
    await api.changePassword("old-password", "new-password");
    await api.revokeAllSessions();

    expect(patch).toHaveBeenCalledWith("/api/auth/me/profile", {
      displayName: "新昵称",
    });
    expect(post).toHaveBeenCalledWith("/api/auth/me/password", {
      currentPassword: "old-password",
      newPassword: "new-password",
    });
    expect(del).toHaveBeenCalledWith("/api/auth/me/sessions");
  });
});

describe("AuthApi.deleteAccount", () => {
  it("只向 Go 当前会话注销接口发起 DELETE，不携带可伪造的用户标识", async () => {
    const del = vi.fn().mockResolvedValue({ deleted: true });
    const api = new AuthApi({
      get: vi.fn(),
      post: vi.fn(),
      delete: del,
    } as never);

    await expect(
      (api as unknown as { deleteAccount(): Promise<{ deleted: boolean }> })
        .deleteAccount(),
    ).resolves.toEqual({ deleted: true });

    expect(del).toHaveBeenCalledWith("/api/auth/me");
  });
});

describe("AuthApi.updateProfile", () => {
  it("以一个 Go 请求同时提交昵称与简介", async () => {
    const patch = vi.fn().mockResolvedValue({ user: validUser });
    const api = new AuthApi({ get: vi.fn(), post: vi.fn(), patch } as never);

    await expect(
      (api as unknown as { updateProfile(displayName: string, bio: string): Promise<unknown> })
        .updateProfile("新昵称", "新的简介"),
    ).resolves.toEqual({ user: validUser });

    expect(patch).toHaveBeenCalledWith("/api/auth/me/profile", {
      displayName: "新昵称",
      bio: "新的简介",
    });
  });
});

const validUser = {
  id: "user-1",
  displayName: "测试用户",
  bindingState: "bound",
  accountStatus: "normal",
  contentAccess: "standard",
  timezone: "Asia/Shanghai",
  isGuest: false,
};

function createAuthApi(result: unknown) {
  return new AuthApi({
    get: vi.fn().mockResolvedValue(result),
    post: () => Promise.resolve(undefined),
  } as never);
}
