import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type { RuntimeAuthUser } from "../../api/auth";
import { ROUTES } from "../../app/routes";
import { type SessionRestoreState, useAuth } from "../auth/AuthProvider";

/** Go 会话投影是身份与权限的唯一事实来源，页面只负责展示。 */
function getAccountStatusLabel(
  status: RuntimeAuthUser["accountStatus"],
): string {
  switch (status) {
    case "normal":
      return "正常";
    case "banned":
      return "已禁用";
    case "deleted":
      return "已注销";
    default:
      return "状态待确认";
  }
}

function getContentAccessLabel(
  contentAccess: RuntimeAuthUser["contentAccess"],
): string {
  switch (contentAccess) {
    case "standard":
      return "标准内容访问";
    case "review_restricted":
      return "安全内容访问";
    default:
      return "状态待确认";
  }
}

function getBindingStateLabel(user: RuntimeAuthUser): string {
  if (user.isGuest) return "游客账户";

  switch (user.bindingState) {
    case "guest":
      return "游客账户";
    case "bound":
      return "已绑定";
    default:
      return "状态待确认";
  }
}

function getSignedOutMessage(
  state: SessionRestoreState | undefined,
  restoreError: string | null,
): string {
  switch (state) {
    case "expired":
      return "登录已失效，请重新登录";
    case "failed":
      return restoreError ?? "暂时无法恢复登录状态，请稍后重试。";
    case "missing":
    case "ready":
    default:
      return "请登录后查看用户中心";
  }
}

export function AccountPage() {
  const {
    user,
    isLoading,
    sessionRestoreError,
    sessionRestoreState,
    bindGuest,
    updateDisplayName,
    revokeAllSessions,
    deleteAccount,
    changePassword,
  } = useAuth();
  const [provider, setProvider] = useState("email");
  const [credential, setCredential] = useState("");
  const [binding, setBinding] = useState(false);
  const [bindingError, setBindingError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [revokingSessions, setRevokingSessions] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <main>
        <p role="status">正在恢复登录状态…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main>
        <h1>用户中心</h1>
        <p role="alert">
          {getSignedOutMessage(sessionRestoreState, sessionRestoreError)}
        </p>
        <Link to={ROUTES.login}>前往登录</Link>
      </main>
    );
  }

  const accountLabel = getBindingStateLabel(user);
  const isGuest = user.isGuest || user.bindingState === "guest";

  async function submitBinding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBindingError(null);
    setBinding(true);
    try {
      await bindGuest({
        provider: provider.trim(),
        credential: credential.trim(),
      });
      setCredential("");
    } catch (error) {
      setBindingError(
        error instanceof Error ? error.message : "绑定失败，请稍后重试",
      );
    } finally {
      setBinding(false);
    }
  }

  /**
   * 注销目标由 Go 当前会话确定，页面仅做明确文字确认，不能传递用户标识。
   * 调用成功后 Provider 会清理本项目会话并切换为登录失效状态。
   */
  async function submitAccountDeletion() {
    setDeleteError(null);
    setDeleting(true);
    try {
      await deleteAccount();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "注销失败，请稍后重试");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main>
      <h1>用户中心</h1>
      <p>昵称：{user.displayName || "未设置昵称"}</p>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setProfileError(null);
          setProfileSaving(true);
          try {
            await updateDisplayName(displayName);
            setDisplayName("");
          } catch (error) {
            setProfileError(
              error instanceof Error ? error.message : "保存失败，请稍后重试",
            );
          } finally {
            setProfileSaving(false);
          }
        }}
      >
        <label>
          修改昵称
          <input
            value={displayName}
            maxLength={64}
            onChange={(event) => setDisplayName(event.target.value)}
            disabled={profileSaving}
          />
        </label>
        {/* 资料提交只调用 Go 的昵称合同，不能从表单扩展到安全或结算字段。 */}
        <button type="submit" disabled={profileSaving || !displayName.trim()}>
          {profileSaving ? "保存中…" : "保存昵称"}
        </button>
        {profileError ? <p role="alert">{profileError}</p> : null}
      </form>
      <p>账户：{accountLabel}</p>
      <p>账户状态：{getAccountStatusLabel(user.accountStatus)}</p>
      <p>内容访问：{getContentAccessLabel(user.contentAccess)}</p>
      <p>时区：{user.timezone}</p>
      <section>
        <h2>会话安全</h2>
        <button
          type="button"
          disabled={revokingSessions}
          onClick={async () => {
            setSessionError(null);
            setRevokingSessions(true);
            try {
              await revokeAllSessions();
            } catch (error) {
              setSessionError(
                error instanceof Error ? error.message : "操作失败，请稍后重试",
              );
            } finally {
              setRevokingSessions(false);
            }
          }}
        >
          {revokingSessions ? "退出中…" : "退出所有设备"}
        </button>
        {sessionError ? <p role="alert">{sessionError}</p> : null}
      </section>
      <section>
        <h2>注销账号</h2>
        <p>
          输入“注销”后，将使当前账号的全部登录状态立即失效。此操作不会直接删除历史订单或钱包记录。
        </p>
        <label>
          确认注销
          <input
            value={deleteConfirmation}
            onChange={(event) => setDeleteConfirmation(event.target.value)}
            disabled={deleting}
          />
        </label>
        <button
          type="button"
          disabled={deleting || deleteConfirmation !== "注销"}
          onClick={() => void submitAccountDeletion()}
        >
          {deleting ? "注销中…" : "注销账号"}
        </button>
        {deleteError ? <p role="alert">{deleteError}</p> : null}
      </section>
      <section>
        <h2>修改密码</h2>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setPasswordError(null);
            setPasswordSaving(true);
            try {
              await changePassword(currentPassword, newPassword);
            } catch (error) {
              setPasswordError(
                error instanceof Error ? error.message : "修改失败，请稍后重试",
              );
            } finally {
              setPasswordSaving(false);
            }
          }}
        >
          <label>
            当前密码
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
              disabled={passwordSaving}
            />
          </label>
          <label>
            新密码
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
              minLength={8}
              disabled={passwordSaving}
            />
          </label>
          {/* 密码只提交给 Go，前端不保存、不记录，也不接触哈希。 */}
          <button type="submit" disabled={passwordSaving}>
            {passwordSaving ? "修改中…" : "修改密码"}
          </button>
          {passwordError ? <p role="alert">{passwordError}</p> : null}
        </form>
      </section>
      {/* 日额度由服务端按会话投影时区计算，浏览器设置不能改变它。 */}
      <p>
        每日额度会按 {user.timezone} 时区重置；浏览器设置不会改变服务端时区。
      </p>
      {isGuest ? <p>绑定账号后才能生成内容。</p> : null}
      {isGuest ? (
        <form onSubmit={submitBinding}>
          <h2>绑定账号</h2>
          <label>
            验证方式
            <select
              value={provider}
              onChange={(event) => setProvider(event.target.value)}
              disabled={binding}
            >
              <option value="email">邮箱</option>
              <option value="google">Google</option>
              <option value="apple">Apple</option>
            </select>
          </label>
          <label>
            验证凭据
            <input
              value={credential}
              onChange={(event) => setCredential(event.target.value)}
              required
              disabled={binding}
              autoComplete="one-time-code"
            />
          </label>
          {/* 凭据由服务端 verifier 校验，前端不解析、不拼接外部 subject。 */}
          <button type="submit" disabled={binding || !credential.trim()}>
            {binding ? "绑定中…" : "完成绑定"}
          </button>
          {bindingError ? <p role="alert">{bindingError}</p> : null}
        </form>
      ) : null}
    </main>
  );
}
