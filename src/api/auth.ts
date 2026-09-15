import type { GoApiClient } from "./http";
import { createGoApiError } from "./errors";

/** 内容访问是服务端审核访问状态，不是浏览器可选择的 SFW/NSFW 开关。 */
export type ContentAccess = "standard" | "review_restricted";

export type AuthUser = {
  id: string;
  displayName: string;
  bindingState: "guest" | "bound";
  accountStatus: "normal" | "banned" | "deleted";
  contentAccess: ContentAccess;
  timezone: string;
  isGuest: boolean;
};

/** Go 会话投影允许服务端新增枚举值，页面必须将未知值安全降级展示。 */
export type RuntimeAuthUser = Omit<
  AuthUser,
  "bindingState" | "accountStatus" | "contentAccess"
> & {
  bindingState: string;
  accountStatus: string;
  contentAccess: string;
};

export type LoginResult = {
  token: string;
  user: AuthUser;
};

export type RegisterInput = {
  email: string;
  password: string;
  timezone: string;
  displayName?: string;
};

export type GuestLoginInput = {
  platform: "ios" | "android";
  deviceId: string;
  timezone: string;
};

export type GuestBindingInput = {
  provider: string;
  credential: string;
};

/** 账号 API 与 Go Gateway 路由一一对应，不保留旧 Node 登录协议的兼容分支。 */
export class AuthApi {
  public constructor(private readonly client: GoApiClient) {}

  public register(input: RegisterInput): Promise<LoginResult> {
    return this.client.post("/api/auth/register", input);
  }

  public login(email: string, password: string): Promise<LoginResult> {
    return this.client.post("/api/auth/login", { email, password });
  }

  public loginGuest(input: GuestLoginInput): Promise<LoginResult> {
    return this.client.post("/api/auth/guest", input);
  }

  /** 游客绑定只发送服务端验证凭据，不允许浏览器直接声明 subject。 */
  public bindGuest(input: GuestBindingInput): Promise<{ user: AuthUser }> {
    return this.client.post("/api/auth/bind", input);
  }

  /** 资料接口只允许修改昵称，时区和账户安全字段由 Go 保护。 */
  public updateDisplayName(displayName: string): Promise<{ user: AuthUser }> {
    return this.client.patch("/api/auth/me/profile", { displayName });
  }

  /** 撤销用户全部 Go 会话，服务端会立即拒绝其他设备的旧会话。 */
  public revokeAllSessions(): Promise<{ revoked: boolean }> {
    return this.client.delete("/api/auth/me/sessions");
  }

  /**
   * 注销只依据当前 Go 会话判定目标用户。
   *
   * 浏览器不传用户 ID，避免篡改请求后注销其他账号。
   */
  public deleteAccount(): Promise<{ deleted: boolean }> {
    return this.client.delete("/api/auth/me");
  }

  /** 修改密码后 Go 会撤销全部会话，调用方必须重新登录。 */
  public changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<{ changed: boolean }> {
    return this.client.post("/api/auth/me/password", {
      currentPassword,
      newPassword,
    });
  }

  public async me(): Promise<RuntimeAuthUser> {
    const result = await this.client.get<{ user: unknown }>("/api/auth/me");
    if (!isRuntimeAuthUserProjection(result?.user)) {
      throw createGoApiError(
        503,
        "INVALID_API_RESPONSE",
        "Go API 返回了无效用户投影",
      );
    }
    return result.user;
  }
}

function isRuntimeAuthUserProjection(value: unknown): value is RuntimeAuthUser {
  if (typeof value !== "object" || value === null) return false;

  const user = value as Record<string, unknown>;
  return (
    typeof user.id === "string" &&
    typeof user.displayName === "string" &&
    typeof user.bindingState === "string" &&
    typeof user.accountStatus === "string" &&
    typeof user.contentAccess === "string" &&
    typeof user.timezone === "string" &&
    typeof user.isGuest === "boolean"
  );
}
