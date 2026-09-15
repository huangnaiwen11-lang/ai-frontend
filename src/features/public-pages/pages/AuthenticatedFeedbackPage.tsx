import { useState, type FormEvent } from "react";
import { useGoApiClient } from "../../../app/GoApiProvider";
import { PublicPageLayout } from "../components/PublicPageLayout";

/** 用户反馈提交沿用旧字段语义，但请求只经过 Go 的认证客户端。 */
export function AuthenticatedFeedbackPage() {
  const client = useGoApiClient();
  const [type, setType] = useState("bug");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (message.trim().length < 10) {
      setStatus("反馈内容至少需要 10 个字符");
      return;
    }
    setSubmitting(true);
    setStatus(null);
    try {
      await client.post("/api/feedback", {
        type,
        message,
        email,
        attachments: [],
      });
      setMessage("");
      setStatus("反馈已提交，感谢你的反馈。");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "提交失败，请稍后重试",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PublicPageLayout locale="zh" title="反馈与支持">
      <form onSubmit={submit}>
        <label>
          反馈类型
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            disabled={submitting}
          >
            <option value="bug">问题反馈</option>
            <option value="content">内容审核</option>
            <option value="generation">生成质量</option>
          </select>
        </label>
        <label>
          联系邮箱
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={submitting}
          />
        </label>
        <label>
          反馈内容
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            minLength={10}
            maxLength={5000}
            required
            disabled={submitting}
          />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? "提交中…" : "提交反馈"}
        </button>
        {status ? <p role="status">{status}</p> : null}
      </form>
    </PublicPageLayout>
  );
}
