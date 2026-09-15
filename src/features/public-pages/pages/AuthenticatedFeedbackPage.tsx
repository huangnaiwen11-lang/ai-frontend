import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { MediaApi, type UploadedImage } from "../../../api/media";
import { useGoApiClient } from "../../../app/GoApiProvider";
import { PublicPageLayout } from "../components/PublicPageLayout";

/** 旧站公开的六种反馈分类；值是后端合同，文案只在浏览器展示。 */
const FEEDBACK_TYPES = [
  { value: "bug", label: "问题反馈" },
  { value: "feature", label: "功能建议" },
  { value: "content", label: "内容与审核" },
  { value: "payment", label: "支付与充值" },
  { value: "praise", label: "表扬与好评" },
  { value: "other", label: "其他问题" },
] as const;

const MAX_ATTACHMENTS = 3;
type FeedbackType = (typeof FEEDBACK_TYPES)[number]["value"];

/**
 * 用户反馈提交页。
 *
 * 页面仅上传图片并提交素材 ID；图片地址、归属和最终下载地址均由 Go 在服务端确认，
 * 因而不能通过 DevTools 把任意第三方 URL 写入反馈记录。
 */
export function AuthenticatedFeedbackPage() {
  const client = useGoApiClient();
  const mediaApi = useMemo(() => new MediaApi(client), [client]);
  const [type, setType] = useState<FeedbackType>("bug");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [attachments, setAttachments] = useState<UploadedImage[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function uploadFiles(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    // 允许用户再次选择同一张图片；否则浏览器不会触发第二次 change 事件。
    event.target.value = "";
    if (selectedFiles.length === 0 || uploading || submitting) return;

    const availableSlots = MAX_ATTACHMENTS - attachments.length;
    if (availableSlots <= 0) {
      setStatus(`最多只能上传 ${MAX_ATTACHMENTS} 张反馈截图`);
      return;
    }
    const filesToUpload = selectedFiles.slice(0, availableSlots);
    setUploading(true);
    setStatus(selectedFiles.length > availableSlots ? `最多只能上传 ${MAX_ATTACHMENTS} 张反馈截图，已忽略多余图片` : null);
    try {
      const uploaded: UploadedImage[] = [];
      // 顺序上传能使失败提示精确对应文件，并避免同一轮选择绕过三张图上限。
      for (const file of filesToUpload) uploaded.push(await mediaApi.uploadImage(file));
      setAttachments((current) => [...current, ...uploaded]);
      setStatus(`已上传 ${uploaded.length} 张反馈截图`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "图片上传失败，请稍后重试");
    } finally {
      setUploading(false);
    }
  }

  function removeAttachment(id: string) {
    setAttachments((current) => current.filter((attachment) => attachment.id !== id));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (message.trim().length < 10) {
      setStatus("反馈内容至少需要 10 个字符");
      return;
    }
    if (uploading) {
      setStatus("图片仍在上传，请稍后提交");
      return;
    }
    setSubmitting(true);
    setStatus(null);
    try {
      await client.post("/api/feedback", {
        type,
        message,
        email,
        // 不传 reference、downloadUrl 等客户端可篡改字段。
        attachments: attachments.map(({ id }) => ({ id })),
      });
      setMessage("");
      setAttachments([]);
      setStatus("反馈已提交，感谢你的反馈。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "提交失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  }

  const formBusy = submitting || uploading;
  return (
    <PublicPageLayout locale="zh" title="反馈与支持">
      <form onSubmit={submit}>
        <label>
          反馈类型
          <select value={type} onChange={(event) => setType(event.target.value as FeedbackType)} disabled={formBusy}>
            {FEEDBACK_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label>
          联系邮箱（选填）
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={formBusy} />
        </label>
        <label>
          反馈内容
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} minLength={10} maxLength={2000} required disabled={formBusy} />
        </label>
        <label>
          反馈截图
          <input aria-label="反馈截图" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={uploadFiles} disabled={formBusy || attachments.length >= MAX_ATTACHMENTS} />
          <small>最多 {MAX_ATTACHMENTS} 张，单张不超过 10MB，支持 JPG、PNG、WebP、GIF。</small>
        </label>
        {attachments.length > 0 ? (
          <ul aria-label="已上传反馈截图">
            {attachments.map((attachment) => (
              <li key={attachment.id}>
                {attachment.id}
                <button type="button" onClick={() => removeAttachment(attachment.id)} disabled={formBusy}>移除</button>
              </li>
            ))}
          </ul>
        ) : null}
        <button type="submit" disabled={formBusy}>{submitting ? "提交中…" : uploading ? "图片上传中…" : "提交反馈"}</button>
        {status ? <p role="status">{status}</p> : null}
      </form>
    </PublicPageLayout>
  );
}
