/**
 * Cloudflare Pages Functions —— AI 聊天代理
 * 作用：把 DeepSeek API 的 Key 藏在服务器端环境变量里，
 *       浏览器只和本站 /api/chat 通信，避免 Key 泄露。
 *
 * 部署时必须先在 Cloudflare Pages 项目设置中配置环境变量：
 *   DEEPSEEK_API_KEY = sk-xxxx
 *
 * 本地联调（需 Node.js + wrangler）：
 *   npx wrangler pages dev . --binding DEEPSEEK_API_KEY=sk-xxxx
 */

export async function onRequestPost(context) {
  const { request, env } = context;
  const apiKey = env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "服务器未配置 DEEPSEEK_API_KEY，请在 Cloudflare Pages 项目 → Settings → Environment variables 中添加" },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const messages = body.messages;
  if (!Array.isArray(messages) || !messages.length) {
    return Response.json({ error: "messages 不能为空" }, { status: 400 });
  }

  const upstream = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: body.model || "deepseek-v4-flash",
      messages,
      stream: true,
      // 若你的模型/接口不支持 thinking 参数，把下面这行注释掉即可
      thinking: { type: "disabled" },
    }),
  });

  if (!upstream.ok) {
    const errText = await upstream.text();
    return Response.json({ error: `上游接口返回 ${upstream.status}: ${errText.slice(0, 500)}` }, { status: upstream.status });
  }

  // 原样转发 SSE 流给前端
  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

// 非 POST 一律 405
export async function onRequest() {
  return Response.json({ error: "仅支持 POST" }, { status: 405 });
}
