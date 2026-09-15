import { createGoApiError, type GoApiError } from "./errors";

export type SessionReader = {
  getToken(): string | null;
};

type FetchLike = typeof fetch;

type GoApiClientOptions = {
  baseUrl: string;
  sessionStore: SessionReader;
  fetchFn?: FetchLike;
};

/** GET 查询参数仅支持服务端合同中的标量值，省去各页面自行拼接 URL 的风险。 */
export type GoApiQuery = Readonly<Record<string, string | number | undefined>>;

export type GoStreamEvent = Readonly<{ id?: string; event: string; data: unknown }>;

type GoSuccessEnvelope<T> = {
  success: true;
  data: T;
};

type GoErrorEnvelope = {
  success: false;
  code?: string;
  message?: string;
};

/**
 * 唯一允许页面访问网络的 Go API 边界。
 * feature 不能直接使用 fetch，以防新页面悄悄接回 Node 地址、旧登录态或旧钱包协议。
 */
export class GoApiClient {
  private readonly baseUrl: string;
  private readonly sessionStore: SessionReader;
  private readonly fetchFn: FetchLike;

  public constructor({ baseUrl, sessionStore, fetchFn }: GoApiClientOptions) {
    this.baseUrl = baseUrl;
    this.sessionStore = sessionStore;
    // 浏览器原生 fetch 在部分实现中要求 this 为 globalThis；绑定后才能安全作为客户端依赖保存。
    this.fetchFn = (fetchFn ?? globalThis.fetch).bind(globalThis);
  }

  public get<T>(path: string, query?: GoApiQuery): Promise<T> {
    return this.request<T>(path, { method: "GET" }, query);
  }

  public post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Go 以此键保证重复点击或网络重试不会造成二次预扣。
        "X-Request-Id": crypto.randomUUID(),
      },
      body: JSON.stringify(body),
    });
  }

  /** PATCH 仅用于 Go 已冻结的部分更新合同。 */
  public patch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Request-Id": crypto.randomUUID(),
      },
      body: JSON.stringify(body),
    });
  }

  /** DELETE 仅用于 Go 已冻结的会话撤销等无请求体合同。 */
  public delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: "DELETE" });
  }

  /**
   * 读取 Go SSE 状态流。使用 fetch 是因为浏览器 EventSource 无法携带 Bearer 会话头。
   * 解析器按空行提交事件，兼容网络分片恰好落在任意字节边界的情况。
   */
  public async stream(
    path: string,
    onEvent: (event: GoStreamEvent) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const headers = new Headers({ Accept: "text/event-stream" });
    const token = this.sessionStore.getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    let response: Response;
    try {
      response = await this.fetchFn(this.resolvePath(path), { method: "GET", headers, signal });
    } catch {
      throw createGoApiError(503, "NETWORK_UNAVAILABLE", "无法连接 Go API 服务");
    }
    if (!response.ok || !response.body) {
      throw createGoApiError(response.status, "STREAM_UNAVAILABLE", "生成状态流不可用");
    }
    await readSSE(response.body, onEvent);
  }

  /**
   * 素材上传复用唯一 Go API 边界，但不手写 multipart Content-Type；
   * 浏览器会携带带 boundary 的正确头部，服务端仍会按文件字节再次检测类型。
   */
  public postForm<T>(path: string, body: FormData): Promise<T> {
    return this.request<T>(path, {
      method: "POST",
      headers: { "X-Request-Id": crypto.randomUUID() },
      body,
    });
  }

  private async request<T>(
    path: string,
    init: RequestInit,
    query?: GoApiQuery,
  ): Promise<T> {
    const url = this.resolvePath(path, query);
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");

    const token = this.sessionStore.getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    let response: Response;
    try {
      response = await this.fetchFn(url, { ...init, headers });
    } catch {
      throw createGoApiError(
        503,
        "NETWORK_UNAVAILABLE",
        "无法连接 Go API 服务",
      );
    }

    const payload = await this.parseJson(response);
    if (!response.ok || !isSuccessEnvelope<T>(payload)) {
      const failure = isErrorEnvelope(payload) ? payload : undefined;
      throw createGoApiError(response.status, failure?.code, failure?.message);
    }

    return payload.data;
  }

  private resolvePath(path: string, query?: GoApiQuery): string {
    // 只接受固定的 Gateway 相对路径，禁止调用方借参数切换到 Node 或第三方域名。
    if (!path.startsWith("/api/") || /[%?#\\]/.test(path)) {
      throw new Error("只允许调用 /api/ 相对路径");
    }
    const url = new URL(path, this.baseUrl);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  private async parseJson(response: Response): Promise<unknown> {
    const contentType = response.headers.get("Content-Type") || "";
    if (!contentType.includes("application/json")) {
      throw createGoApiError(
        503,
        "INVALID_API_RESPONSE",
        "Go API 返回了非 JSON 响应",
      );
    }
    try {
      return await response.json();
    } catch {
      throw createGoApiError(
        503,
        "INVALID_API_RESPONSE",
        "Go API 返回了无法解析的响应",
      );
    }
  }
}

async function readSSE(body: ReadableStream<Uint8Array>, onEvent: (event: GoStreamEvent) => void): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let current: { id?: string; event?: string; data: string[] } = { data: [] };
  const flush = () => {
    if (current.data.length === 0) {
      current = { data: [] };
      return;
    }
    const rawData = current.data.join("\n");
    // 原始帧始终是字符串，JSON 解析结果保持 unknown，由业务层校验具体结构。
    let data: unknown = rawData;
    try { data = JSON.parse(rawData); } catch { /* 保留原始字符串，交由业务层决定是否接受。 */ }
    onEvent({ id: current.id, event: current.event || "message", data });
    current = { data: [] };
  };
  while (true) {
    const chunk = await reader.read();
    buffer += decoder.decode(chunk.value || new Uint8Array(), { stream: !chunk.done });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (line === "") flush();
      else if (line.startsWith(":")) continue;
      else if (line.startsWith("id:")) current.id = line.slice(3).trim();
      else if (line.startsWith("event:")) current.event = line.slice(6).trim();
      else if (line.startsWith("data:")) current.data.push(line.slice(5).trimStart());
    }
    if (chunk.done) {
      if (buffer !== "") { if (buffer.startsWith("data:")) current.data.push(buffer.slice(5).trimStart()); }
      flush();
      return;
    }
  }
}

function isSuccessEnvelope<T>(value: unknown): value is GoSuccessEnvelope<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    value.success === true &&
    "data" in value
  );
}

function isErrorEnvelope(value: unknown): value is GoErrorEnvelope {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    value.success === false
  );
}

export function isGoApiError(error: unknown): error is GoApiError {
  return error instanceof Error && error.name === "GoApiError";
}
