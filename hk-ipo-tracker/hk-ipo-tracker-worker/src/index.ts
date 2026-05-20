export interface Env {
  ASSETS: Fetcher;
  SITE_PASSWORD: string;
  /** 管理员在线编辑密码，执行 wrangler secret put EDITOR_PASSWORD */
  EDITOR_PASSWORD?: string;
  /** 绑定 KV 后在线保存才会生效；未绑定时仍可只读浏览（读 snapshot.json / 空 KV） */
  IPO_KV?: KVNamespace;
}

const COOKIE = "ipo_editor";
/** 通过网站密码（Basic）后下发，后续 fetch 可凭此 Cookie 访问 /api */
const VIEWER_COOKIE = "ipo_viewer";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 天

function passwordFromBasic(authorization: string | null): string | null {
  if (!authorization || !authorization.startsWith("Basic ")) return null;
  try {
    const b64 = authorization.slice(6).trim();
    const decoded = atob(b64);
    const colon = decoded.indexOf(":");
    if (colon === -1) return decoded;
    return decoded.slice(colon + 1);
  } catch {
    return null;
  }
}

async function timingSafeEqualString(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const ba = enc.encode(a);
  const bb = enc.encode(b);
  if (ba.length !== bb.length) return false;
  return crypto.subtle.timingSafeEqual(ba, bb);
}

function basicUnauthorized(): Response {
  return new Response(
    "需要登录。浏览器会弹出登录框：用户名可随意填写，密码请输入访问密码。",
    {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="港股打新统计"',
        "Content-Type": "text/plain; charset=utf-8",
      },
    },
  );
}

function apiUnauthorized(): Response {
  return Response.json(
    { error: "unauthorized", message: "请先打开首页并完成网站密码登录" },
    { status: 401, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } },
  );
}

async function verifyViewerCookie(request: Request, env: Env): Promise<boolean> {
  const pw = env.SITE_PASSWORD;
  if (!pw) return false;
  const raw = getCookieValue(request.headers.get("Cookie"), VIEWER_COOKIE);
  if (!raw) return false;
  const dot = raw.indexOf(".");
  if (dot < 0) return false;
  const expStr = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expect = await hmacHex(pw, `viewer|${expStr}`);
  return expect === sig;
}

/** API：已 Basic 登录，或首页下发过的 ipo_viewer Cookie 仍有效 */
async function verifySiteAccess(request: Request, env: Env): Promise<boolean> {
  if (await verifySiteBasic(request, env)) return true;
  return verifyViewerCookie(request, env);
}

async function verifySiteBasic(request: Request, env: Env): Promise<boolean> {
  const expected = env.SITE_PASSWORD;
  if (!expected) return false;
  const got = passwordFromBasic(request.headers.get("Authorization"));
  return got != null && (await timingSafeEqualString(got, expected));
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function getCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";");
  for (const p of parts) {
    const [k, ...rest] = p.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("=").trim());
  }
  return null;
}

async function verifyEditorCookie(request: Request, env: Env): Promise<boolean> {
  const ep = env.EDITOR_PASSWORD;
  if (!ep) return false;
  const raw = getCookieValue(request.headers.get("Cookie"), COOKIE);
  if (!raw) return false;
  const dot = raw.indexOf(".");
  if (dot < 0) return false;
  const expStr = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expect = await hmacHex(ep, `editor|${expStr}`);
  return expect === sig;
}

async function snapshotFromAssets(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const assetReq = new Request(new URL("/snapshot.json", url.origin).toString(), {
    method: "GET",
    headers: request.headers,
  });
  return env.ASSETS.fetch(assetReq);
}

/** Base64 编码 UTF-8（Workers 无 Buffer） */
function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]!);
  }
  return btoa(bin);
}

/** 在已通过 Basic 校验后，把 KV 快照与编辑态注入 HTML，避免 fetch /api/data 不带认证导致访客看不到数据 */
async function maybeInjectHtmlBootstrap(request: Request, env: Env, assetRes: Response): Promise<Response> {
  if (request.method !== "GET") return assetRes;
  const ct = assetRes.headers.get("content-type") || "";
  if (!ct.includes("text/html")) return assetRes;
  const html = await assetRes.text();
  const headOpen = html.indexOf("<head");
  if (headOpen < 0) return assetRes;
  const headGt = html.indexOf(">", headOpen);
  if (headGt < 0) return assetRes;
  const insertAt = headGt + 1;

  const editor = await verifyEditorCookie(request, env);
  let kvB64 = "";
  if (env.IPO_KV) {
    const raw = await env.IPO_KV.get("snapshot");
    if (raw && raw.length > 0) {
      kvB64 = utf8ToBase64(raw);
    }
  }

  const metas = `<meta name="__ipo_is_editor" content="${editor ? "1" : "0"}" /><meta name="__ipo_kv_b64" content="${kvB64}" />`;
  const newHtml = html.slice(0, insertAt) + metas + html.slice(insertAt);

  const headers = new Headers(assetRes.headers);
  headers.set("Cache-Control", "no-store");
  return new Response(newHtml, { status: assetRes.status, headers });
}

/** 任意 HTML 响应都刷新 ipo_viewer，便于后续 fetch(/api) 不带 Basic 也能通过 */
async function sealHtmlWithViewerCookie(res: Response, env: Env): Promise<Response> {
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("text/html")) return res;
  const body = await res.arrayBuffer();
  const headers = new Headers(res.headers);
  headers.set("Cache-Control", "no-store");
  const exp = Date.now() + COOKIE_MAX_AGE * 1000;
  const sig = await hmacHex(env.SITE_PASSWORD!, `viewer|${String(exp)}`);
  const val = `${exp}.${sig}`;
  headers.append(
    "Set-Cookie",
    `${VIEWER_COOKIE}=${encodeURIComponent(val)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${COOKIE_MAX_AGE}`,
  );
  return new Response(body, { status: res.status, headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (!env.SITE_PASSWORD) {
      return new Response("未配置 SITE_PASSWORD", {
        status: 500,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    if (path.startsWith("/api/")) {
      if (!(await verifySiteAccess(request, env))) {
        return apiUnauthorized();
      }

      const jsonHeaders: HeadersInit = {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      };

      if (path === "/api/editor-status" && request.method === "GET") {
        const editor = await verifyEditorCookie(request, env);
        return Response.json({ editor }, { headers: jsonHeaders });
      }

      if (path === "/api/editor-login" && request.method === "POST") {
        const ep = env.EDITOR_PASSWORD;
        if (!ep) {
          return Response.json(
            { error: "未配置 EDITOR_PASSWORD，请执行 wrangler secret put EDITOR_PASSWORD" },
            { status: 503, headers: jsonHeaders },
          );
        }
        let body: { password?: string };
        try {
          body = (await request.json()) as { password?: string };
        } catch {
          return Response.json({ error: "invalid_json" }, { status: 400, headers: jsonHeaders });
        }
        const pw = body.password ?? "";
        if (!(await timingSafeEqualString(pw, ep))) {
          return Response.json({ error: "wrong_password" }, { status: 403, headers: jsonHeaders });
        }
        const exp = Date.now() + COOKIE_MAX_AGE * 1000;
        const sig = await hmacHex(ep, `editor|${String(exp)}`);
        const val = `${exp}.${sig}`;
        return Response.json(
          { ok: true },
          {
            status: 200,
            headers: {
              ...jsonHeaders,
              "Set-Cookie": `${COOKIE}=${encodeURIComponent(val)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${COOKIE_MAX_AGE}`,
            },
          },
        );
      }

      if (path === "/api/editor-logout" && request.method === "POST") {
        return Response.json(
          { ok: true },
          {
            status: 200,
            headers: {
              ...jsonHeaders,
              "Set-Cookie": `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`,
            },
          },
        );
      }

      if (path === "/api/data" && request.method === "GET") {
        if (env.IPO_KV) {
          const raw = await env.IPO_KV.get("snapshot");
          if (raw) {
            return new Response(raw, { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
          }
        }
        const r = await snapshotFromAssets(request, env);
        if (!r.ok) {
          return Response.json(
            { version: 1, exportedAt: "", ipos: [], details: [], funders: [], persons: [], capitalStats: [] },
            { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } },
          );
        }
        const text = await r.text();
        return new Response(text, {
          status: 200,
          headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
        });
      }

      if (path === "/api/data" && request.method === "POST") {
        if (!env.IPO_KV) {
          return Response.json(
            {
              error: "no_kv",
              message: "未绑定 KV：请执行 npx wrangler kv namespace create IPO_KV，将 id 写入 wrangler.toml 后重新 deploy",
            },
            { status: 503, headers: jsonHeaders },
          );
        }
        if (!(await verifyEditorCookie(request, env))) {
          return Response.json({ error: "editor_required" }, { status: 403, headers: jsonHeaders });
        }
        const text = await request.text();
        if (!text || text.length > 24 * 1024 * 1024) {
          return Response.json({ error: "body_too_large_or_empty" }, { status: 400, headers: jsonHeaders });
        }
        try {
          JSON.parse(text);
        } catch {
          return Response.json({ error: "invalid_json" }, { status: 400, headers: jsonHeaders });
        }
        await env.IPO_KV.put("snapshot", text);
        return Response.json({ ok: true }, { headers: jsonHeaders });
      }

      return Response.json({ error: "not_found" }, { status: 404, headers: jsonHeaders });
    }

    if (!(await verifySiteBasic(request, env))) {
      return basicUnauthorized();
    }

    const assetRes = await env.ASSETS.fetch(request);
    return sealHtmlWithViewerCookie(await maybeInjectHtmlBootstrap(request, env, assetRes), env);
  },
};
