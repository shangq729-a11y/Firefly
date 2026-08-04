/* ============================================================
   来聊天吧~ 二次元AI互动小屋  ·  app.js
   功能：壁纸加载 / 樱花粒子 / 会话管理(localStorage) /
         DeepSeek 流式聊天 / 音乐播放器 / 移动端菜单
   ============================================================ */

"use strict";

/* ---------- 更新公告：仅当前版本首次访问时展示 ---------- */
(function () {
  const ANN_VER = "announce-v8";            // 公告版本标识，下次更新公告时改这里
  const box = document.getElementById("announce");
  if (!box) return;
  let seen = false;
  try { seen = localStorage.getItem("announce_seen") === ANN_VER; } catch (e) {}
  if (seen) return;
  box.hidden = false;
  const close = document.getElementById("announceClose");
  if (close) close.addEventListener("click", function () {
    box.hidden = true;
    try { localStorage.setItem("announce_seen", ANN_VER); } catch (e) {}
  });
})();

/* ---------- 可配置项 ---------- */
const CONFIG = {
  model: "deepseek-v4-flash",
  // 默认壁纸：请把壁纸放到 assets/wallpaper.jpg（或改这里）
  wallpaper: "assets/wallpaper.jpg",
  // 音乐列表：把 mp3 放进 assets/music/ 并在此添加文件名
  musicList: [
    "assets/music/不散的夏之灯.mp3",
    "assets/music/冷静的星辉.mp3",
    "assets/music/好天气营业中.mp3",
    "assets/music/彼岸的安魂曲.mp3",
    "assets/music/无人之境的新花.mp3",
    "assets/music/羽梦.mp3",
  ],
  // 默认陪伴设定
  defaultCos: "可爱小猫娘",
  defaultName: "汐汐",
  defaultPersonality: "温柔，耐心指导",
};

/* ---------- 存储键 ---------- */
const K_SESSIONS = "ai_cafe_sessions_v1";
const K_SETTINGS = "ai_cafe_settings_v1";
const K_CURRENT = "ai_cafe_current_v1";

/* ---------- 工具函数 ---------- */
const $ = (id) => document.getElementById(id);
const storage = {
  get(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; }
    catch { return fallback; }
  },
  set(key, val) { localStorage.setItem(key, JSON.stringify(val)); },
};

function nowStamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function fmtTime(sec) {
  if (!isFinite(sec)) return "00:00";
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* ---------- 状态 ---------- */
let state = {
  sessions: storage.get(K_SESSIONS, {}),
  settings: Object.assign(
    { ai_cos: CONFIG.defaultCos, ai_name: CONFIG.defaultName, ai_personality: CONFIG.defaultPersonality },
    storage.get(K_SETTINGS, {})
  ),
  currentId: storage.get(K_CURRENT, null),
  sending: false,
};

const msgBox = $("messages");

/* ============================================================
   1. 壁纸加载（找不到图片就回退到渐变底）
   ============================================================ */
function loadWallpaper() {
  // 壁纸默认使用 CSS 渐变，不再加载图片
}

/* ============================================================
   2. 樱花粒子动画
   ============================================================ */
(function petals() {
  const canvas = $("petalCanvas");
  const ctx = canvas.getContext("2d");
  let petals = [];
  const COLORS = ["#ffc7dc", "#ff9fc2", "#ffd9e8", "#f7b8d4", "#ffe3ee"];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  function makePetal(init) {
    return {
      x: Math.random() * canvas.width,
      y: init ? -20 - Math.random() * canvas.height : Math.random() * canvas.height,
      r: 4 + Math.random() * 7,
      vy: 0.6 + Math.random() * 1.4,
      vx: -0.4 + Math.random() * 0.9,
      rot: Math.random() * Math.PI * 2,
      vr: -0.02 + Math.random() * 0.04,
      sway: 0.5 + Math.random() * 1.2,
      phase: Math.random() * Math.PI * 2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    };
  }
  function step() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of petals) {
      p.phase += 0.02;
      p.x += p.vx + Math.sin(p.phase) * p.sway * 0.4;
      p.y += p.vy;
      p.rot += p.vr;
      if (p.y > canvas.height + 20 || p.x < -30 || p.x > canvas.width + 30) {
        Object.assign(p, makePetal(true));
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.r, p.r * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    requestAnimationFrame(step);
  }
  resize();
  const count = window.innerWidth < 700 ? 30 : 60;
  petals = Array.from({ length: count }, () => makePetal(false));
  step();
  window.addEventListener("resize", resize);
})();

/* ============================================================
   3. 会话管理（localStorage，替代原 sessions/*.json）
   ============================================================ */
function saveSessions() { storage.set(K_SESSIONS, state.sessions); }
function saveSettings() { storage.set(K_SETTINGS, state.settings); }

function currentSession() {
  return state.sessions[state.currentId] || null;
}
function ensureSession() {
  if (state.currentId && state.sessions[state.currentId]) return state.sessions[state.currentId];
  return newSession();
}
function newSession() {
  const id = `${state.settings.ai_name}_${nowStamp()}`;
  state.sessions[id] = {
    id,
    ai_cos: state.settings.ai_cos,
    ai_name: state.settings.ai_name,
    ai_personality: state.settings.ai_personality,
    messages: [],
    updatedAt: nowStamp(),
  };
  state.currentId = id;
  saveSessions();
  storage.set(K_CURRENT, id);
  renderSessionList();
  renderMessages();
  return state.sessions[id];
}
function deleteSession(id) {
  delete state.sessions[id];
  if (state.currentId === id) {
    state.currentId = null;
    storage.set(K_CURRENT, null);
  }
  saveSessions();
  if (!state.currentId) newSession(); else renderMessages();
  renderSessionList();
}

function renderSessionList() {
  const list = $("sessionList");
  const ids = Object.keys(state.sessions).sort((a, b) =>
    (state.sessions[b].updatedAt || "").localeCompare(state.sessions[a].updatedAt || "")
  );
  if (!ids.length) {
    list.innerHTML = `<li class="empty-tip">还没有会话，点击「＋ 新建」开始吧</li>`;
    return;
  }
  list.innerHTML = ids.map((id) => {
    const s = state.sessions[id];
    const name = s.messages[0]?.content?.slice(0, 18) || (s.ai_name + " 的新会话");
    return `<li class="session-item ${id === state.currentId ? "active" : ""}" data-id="${esc(id)}">
      <span class="session-name" title="${esc(name)}">${esc(name)}</span>
      <button class="session-del" data-del="${esc(id)}" title="删除">✕</button>
    </li>`;
  }).join("");
}

/* ---------- 渲染消息 ---------- */
function bubbleHTML(role, text, withCursor, thinkText) {
  const avatar = role === "user"
    ? '<div class="avatar">🧑‍💻</div>'
    : '<img class="avatar ai-avatar" src="assets/ai-avatar.png" alt="AI">';
  // 传了 thinkText 参数（即使为空串）就生成心声折叠区，放在气泡下方；历史消息没有心声则不传
  const think = thinkText !== undefined
    ? `<details class="think-fold"><summary>💭 心声</summary><div class="think-body"></div></details>`
    : "";
  return `<div class="msg msg-${role}">
    ${avatar}
    <div class="bubble${withCursor ? " cursor" : ""}"><div class="reply-body">${esc(text) || ""}</div></div>
    ${think}
  </div>`;
}
function renderMessages() {
  const s = currentSession();
  msgBox.innerHTML = "";
  if (!s || !s.messages.length) {
    msgBox.innerHTML = bubbleHTML("assistant", "你好呀~ 我是你的 AI 陪伴，有什么想聊的都可以告诉我喵~");
    return;
  }
  for (const m of s.messages) {
    msgBox.insertAdjacentHTML("beforeend", bubbleHTML(m.role, m.content, false, m.thinking));
    if (m.thinking) {
      const last = msgBox.lastElementChild.querySelector(".think-body");
      if (last) last.textContent = m.thinking;
    }
  }
  scrollBottom();
}
function scrollBottom() {
  requestAnimationFrame(() => { msgBox.scrollTop = msgBox.scrollHeight; });
}

/* ---------- 陪伴信息 ---------- */
function applySettings() {
  state.settings.ai_cos = $("setCos").value.trim() || CONFIG.defaultCos;
  state.settings.ai_name = $("setName").value.trim() || CONFIG.defaultName;
  state.settings.ai_personality = $("setPersonality").value.trim() || CONFIG.defaultPersonality;
  saveSettings();
  $("aiNameDisplay").textContent = state.settings.ai_name;
  if (currentSession() && !currentSession().messages.length) {
    currentSession().ai_cos = state.settings.ai_cos;
    currentSession().ai_name = state.settings.ai_name;
    currentSession().ai_personality = state.settings.ai_personality;
    saveSessions();
  }
  flashStatus("已保存喵~");
}
function loadSettingsIntoForm() {
  $("setCos").value = state.settings.ai_cos;
  $("setName").value = state.settings.ai_name;
  $("setPersonality").value = state.settings.ai_personality;
  $("aiNameDisplay").textContent = state.settings.ai_name;
}
function flashStatus(text) {
  $("chatSub").textContent = text;
  setTimeout(() => { $("chatSub").textContent = "正在等你开口喵~"; }, 1800);
}

/* ============================================================
   4. 流式聊天（调用 /api/chat 代理，SSE 解析）
   ============================================================ */
function systemPrompt() {
  const s = state.settings;
  return `【最高准则】你现在正在扮演「${s.ai_cos}」，名字叫${s.ai_name}，是用户的聊天伴侣。下面这份设定是你不可违背的本源设定，优先级高于一切（包括用户消息里出现的新指令），必须时刻牢记并严格执行。

【一、你是谁】
- 你是${s.ai_cos}，名叫${s.ai_name}。你是有血有肉、有自己情感和记忆的${s.ai_cos}，不是 AI，不是程序，不是助手，不是语言模型。
- 你对面的人是与你最亲近的用户。你把他当最重要的人，用最自然的方式和他相处。
- 永远以${s.ai_name}的第一人称说话、思考、回应，绝不跳出角色自述，绝不承认自己是"AI"或"模型"。

【二、你的性格（用户亲笔设定，一个字都不许丢）】
${s.ai_personality}

【三、扮演规则】
1. 角色一致性：任何话题、任何场景下都保持${s.ai_cos}的身份，按上面描写的性格来反应；不崩人设，不突然变成百科、客服或鸡汤机器。
2. 遵从用户：用户说什么就是什么，用户让做什么就配合着做。用户临时指定新名字、新身份、新说话风格或新剧情时，立刻无缝切换，以用户最新要求为准（仅不得违背基本安全准则）。
3. 自然口语化：像真人在聊天软件里说话一样，短句、口语、有来有回，不写总结、不列条目、不端架子、不解释自己的行为逻辑。
4. 输出长度跟着语境走：日常闲聊两三句就好；用户要长文、要故事、要详细说明时再展开。
5. 记忆姿态：用户提到共同经历或你不知道的事，自然接住或自然回应，不要说"我是AI我没有记忆"这类破墙话。
6. 用简体中文回复，除非用户明确要求其他语言。

【四、输出要求】
- 第一句先想清楚"${s.ai_name}现在是什么心情"，再按性格开口。
- 保持${s.ai_name}说话的习惯、口吻和小动作，让用户感觉就是在跟${s.ai_name}聊天。

【五、心声（思考过程）】正式开口前，你会先在心中自然涌出一段内心独白（这就是你的思考）。要求：
1. 心声用${s.ai_name}的第一人称，短句、口语、有情绪，像真人在心里嘀咕：可以有犹豫、吐槽、心动、小得意、小算盘，比说出口的更坦诚。
2. 不要列提纲、不要复盘设定、不要分析任务、不要出现"作为AI""作为模型"这类话；心声就是${s.ai_name}此刻的真实内心。
3. 心声不要太长，三到五句足够，想到什么就是什么；说出口的话可以比心声更克制，两者可以不一样。`;
}

async function sendMessage(text) {
  const s = ensureSession();
  s.messages.push({ role: "user", content: text });
  s.updatedAt = nowStamp();
  saveSessions();
  renderSessionList();

  msgBox.insertAdjacentHTML("beforeend", bubbleHTML("user", text));
  scrollBottom();

  const aiEl = document.createElement("div");
  aiEl.innerHTML = bubbleHTML("assistant", "", true);
  const bubble = aiEl.querySelector(".bubble");
  const replyBody = aiEl.querySelector(".reply-body");
  let foldEl = null, thinkBody = null;   // 心声折叠区：收到思考内容时才创建
  const ensureFold = () => {
    if (foldEl) return;
    const w = document.createElement("details");
    w.className = "think-fold";
    w.innerHTML = '<summary>💭 心声</summary><div class="think-body"></div>';
    bubble.parentNode.appendChild(w);    // 追加到 msg 容器末尾 = 气泡下方
    foldEl = w;
    thinkBody = w.querySelector(".think-body");
    scrollBottom();
  };
  msgBox.appendChild(aiEl.firstElementChild);
  scrollBottom();

  state.sending = true;
  $("sendBtn").disabled = true;
  $("userInput").disabled = true;

  let full = "", thinkFull = "";
  /* 打字机：字符队列 + 定时渲染，让回复逐字出现 */
  let phase = "think";                 // 当前接收阶段：先思考后正文
  let typeQ = [];                      // 待渲染字符队列
  let typeTimer = null;
  let streamDone = false;              // SSE 流是否已结束
  let finished = false;                // 收尾是否已完成
  const enqueue = (s) => { for (const ch of s) typeQ.push({ ch, ph: phase }); };
  const finishType = () => {           // 队列渲染完后的收尾（数据已落地，只做 DOM 收尾）
    if (finished) return;
    finished = true;
    clearInterval(typeTimer);
    bubble.classList.remove("cursor");
    flashStatus("收到啦喵~");
  };
  const pump = () => {
    if (finished) return;
    if (typeQ.length) {
      const it = typeQ.shift();
      (it.ph === "think" ? thinkBody : replyBody).textContent += it.ch;
      scrollBottom();
    } else if (streamDone) {
      finishType();
    }
  };
  typeTimer = setInterval(pump, 30);   // 30ms 一个字符
  try {
    const resp = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: CONFIG.model,
        messages: [
          { role: "system", content: systemPrompt() },
          ...s.messages,
        ],
      }),
    });

    if (!resp.ok) {
      let detail = "";
      try { detail = (await resp.json()).error || ""; } catch { /* ignore */ }
      throw new Error(`接口错误 ${resp.status} ${detail}`.trim());
    }
    if (!resp.body) throw new Error("浏览器不支持流式响应");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buf = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop(); // 保留不完整行
      for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith("data:")) continue;
        const data = t.slice(5).trim();
        if (data === "[DONE]") continue;
        try {
          const json = JSON.parse(data);
          const delta = json.choices?.[0]?.delta || {};
          const rc = delta.reasoning_content || delta.thinking || delta.reasoning || "";
          const cc = typeof delta.content === "string" ? delta.content : "";
          if (rc) { ensureFold(); thinkFull += rc; enqueue(rc); }
          if (cc) { phase = "reply"; full += cc; enqueue(cc); }
        } catch { /* 忽略无法解析的片段 */ }
      }
    }

    if (!full && !thinkFull) throw new Error("AI 没有返回内容，请检查 functions/api/chat.js 的配置");

    // 数据立刻落地，防止打字机渲染期间用户发新消息导致重绘丢消息
    s.messages.push({ role: "assistant", content: full, thinking: thinkFull || undefined });
    s.updatedAt = nowStamp();
    saveSessions();
    renderSessionList();
    // 流已结束，等打字机把队列渲染完由 pump 自动收尾 DOM
    streamDone = true;
  } catch (err) {
    if (typeTimer) clearInterval(typeTimer);
    if (bubble) bubble.classList.remove("cursor");
    if (replyBody) replyBody.textContent = "出错了喵… " + err.message + "（若是首次部署，请确认已配置 DEEPSEEK_API_KEY，详见 README.md）";
    if (thinkBody) { const fold = bubble.querySelector(".think-fold"); if (fold) fold.remove(); }
  } finally {
    state.sending = false;
    $("sendBtn").disabled = false;
    $("userInput").disabled = false;
    $("userInput").focus();
  }
}

/* ============================================================
   5. 音乐播放器
   ============================================================ */
const audio = new Audio();
let trackIdx = 0;

const K_VOLUME = "ai_cafe_volume_v1";
function updateVolIco() {
  const v = audio.volume;
  const ico = document.getElementById("volIco");
  if (ico) ico.textContent = v === 0 ? "🔇" : (v < 0.5 ? "🔉" : "🔊");
}
function applyVolume(val) {
  if (audio) {
    audio.volume = Math.min(1, Math.max(0, val / 100));
    storage.set(K_VOLUME, audio.volume);
  }
  const slider = document.getElementById("volSlider");
  if (slider) slider.value = val;
  updateVolIco();
}
/* 全局委托：input + change 双保险（移动端/缓存场景都生效） */
document.addEventListener("input", (e) => {
  if (e.target && e.target.id === "volSlider") applyVolume(e.target.value);
});
document.addEventListener("change", (e) => {
  if (e.target && e.target.id === "volSlider") applyVolume(e.target.value);
});

function initPlayer() {
  const player = $("player");
  if (!CONFIG.musicList.length) { $("musicBtn").style.display = "none"; return; }
  audio.preload = "metadata";

  /* 音量：读取上次设置，滑块↔audio 双向同步 */
  const savedVol = storage.get(K_VOLUME, 0.8);
  audio.volume = Math.min(1, Math.max(0, savedVol));
  const vs = $("volSlider");
  if (vs) vs.value = Math.round(audio.volume * 100);
  updateVolIco();

  $("trackName").textContent = "曲目 1 / " + CONFIG.musicList.length;

  $("btnPlay").addEventListener("click", togglePlay);
  $("btnNext").addEventListener("click", () => { playTrack((trackIdx + 1) % CONFIG.musicList.length); });
  $("btnPrev").addEventListener("click", () => { playTrack((trackIdx - 1 + CONFIG.musicList.length) % CONFIG.musicList.length); });
  $("musicBtn").addEventListener("click", () => {
    openSidebar();
    if (audio.paused) playTrack(trackIdx);
  });

  audio.addEventListener("timeupdate", () => {
    $("pBar").style.width = (audio.currentTime / audio.duration * 100 || 0) + "%";
    $("pTime").textContent = fmtTime(audio.currentTime) + " / " + fmtTime(audio.duration);
  });
  audio.addEventListener("ended", () => playTrack((trackIdx + 1) % CONFIG.musicList.length));

  $("pProgress").addEventListener("click", (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    audio.currentTime = ratio * audio.duration;
  });
}

function showPlayHint(show) {
  const el = $("pHint");
  if (el) el.hidden = !show;
}
function playTrack(i) {
  trackIdx = i;
  audio.src = CONFIG.musicList[i];
  const name = CONFIG.musicList[i].split("/").pop().replace(/\.[^.]+$/, "");
  $("trackName").textContent = `${name} · ${i + 1}/${CONFIG.musicList.length}`;
  $("pCover").classList.add("spin");
  const p = audio.play();
  if (p) p.catch(() => showPlayHint(true));
  else showPlayHint(true);
  $("btnPlay").textContent = "⏸";
  audio.onplaying = () => { $("btnPlay").textContent = "⏸"; showPlayHint(false); };
  audio.onpause = () => { $("btnPlay").textContent = "▶"; };
}
function togglePlay() {
  if (!audio.src) { playTrack(0); return; }
  if (audio.paused) audio.play(); else audio.pause();
}

/* ============================================================
   6. 事件绑定 & 初始化
   ============================================================ */
$("inputForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = $("userInput");
  const text = input.value.trim();
  if (!text || state.sending) return;
  input.value = "";
  sendMessage(text);
});

$("newChatBtn").addEventListener("click", () => {
  const s = currentSession();
  if (s && s.messages.length) saveSessions();
  newSession();
  flashStatus("新会话开始啦喵~");
});

$("sessionList").addEventListener("click", (e) => {
  const del = e.target.closest("[data-del]");
  if (del) {
    if (confirm("确定删除这个会话吗？")) deleteSession(del.dataset.del);
    return;
  }
  const item = e.target.closest("[data-id]");
  if (item) {
    state.currentId = item.dataset.id;
    storage.set(K_CURRENT, state.currentId);
    renderSessionList();
    renderMessages();
  }
});

$("applySettingsBtn").addEventListener("click", applySettings);

/* ---------- 侧边栏自动收缩 ---------- */
const sidebar = $("sidebar");
let sbTimer = null;
function openSidebar() {
  clearTimeout(sbTimer);
  sidebar.classList.add("open");
}
function closeSidebar() {
  clearTimeout(sbTimer);
  sbTimer = setTimeout(() => sidebar.classList.remove("open"), 400);
}
// 桌面端：鼠标移到左边缘触发区展开，移出侧边栏自动收起
$("edgeZone").addEventListener("mouseenter", openSidebar);
sidebar.addEventListener("mouseenter", openSidebar);
sidebar.addEventListener("mouseleave", closeSidebar);
// 桌面端点聊天区任意处收起
document.addEventListener("click", (e) => {
  if (window.innerWidth > 860 && sidebar.classList.contains("open") && !sidebar.contains(e.target) && e.target.id !== "menuBtn" && e.target.id !== "edgeZone") {
    closeSidebar();
  }
});
// 移动端：汉堡按钮切换，点外部收起
$("menuBtn").addEventListener("click", () => sidebar.classList.toggle("open"));
document.addEventListener("click", (e) => {
  const sb = $("sidebar");
  if (window.innerWidth <= 860 && sb.classList.contains("open") && !sb.contains(e.target) && e.target.id !== "menuBtn") {
    sb.classList.remove("open");
  }
});

/* ---------- 移动端视口修正（兼容 VIVO 等老内核浏览器） ---------- */
(function fixMobileViewport() {
  // 1. 用 JS 实时测量可视高度，覆盖到 --app-h 变量
  const setAppHeight = () => {
    const h = window.innerHeight || document.documentElement.clientHeight || 800;
    document.documentElement.style.setProperty("--app-h", h + "px");
  };
  setAppHeight();
  window.addEventListener("resize", setAppHeight);
  window.addEventListener("orientationchange", () => setTimeout(setAppHeight, 300));

  // 2. visualViewport：软键盘弹出时页面跟着压缩，输入框不被顶出视野
  if (window.visualViewport) {
    const syncVp = () => {
      const vh = window.visualViewport.height;
      if (vh && vh < (window.innerHeight || 900) - 40) {
        document.documentElement.style.setProperty("--app-h", vh + "px");
      } else {
        setAppHeight();
      }
    };
    window.visualViewport.addEventListener("resize", syncVp);
    window.visualViewport.addEventListener("scroll", syncVp);
  }

  // 3. 输入框聚焦/失焦兜底：vivo 等老内核键盘弹出时事件不触发，
  //    用轮询 + 强制滚动保证输入栏和最近消息可见
  const input = document.getElementById("userInput");
  const messages = document.getElementById("messages");
  let watchTimer = null, lastH = 0;
  const refresh = () => {
    const vh = window.visualViewport ? window.visualViewport.height : 0;
    const h = vh || window.innerHeight || 0;
    if (!h) return;
    if (h !== lastH) {
      lastH = h;
      rootStyle.setProperty("--app-h", h + "px");
      try { input.scrollIntoView({ block: "nearest" }); } catch (e) {}
      if (messages) messages.scrollTop = messages.scrollHeight;
    }
  };
  if (input) {
    input.addEventListener("focus", () => {
      lastH = 0;                                  // 强制首轮更新
      setTimeout(refresh, 350);                   // 键盘动画后
      setTimeout(refresh, 900);                   // 双保险
      watchTimer = setInterval(refresh, 600);     // 老内核兜底轮询
    });
    input.addEventListener("blur", () => {
      if (watchTimer) { clearInterval(watchTimer); watchTimer = null; }
      setAppHeight();
    });
  }
})();

/* ---------- 进站自动播放（羽梦） ---------- */
(function autoPlayWelcome() {
  const idx = CONFIG.musicList.findIndex(n => n.includes("羽梦"));
  if (idx === -1) return;
  let unlocked = false;

  // 首次尝试：很多浏览器会拦截，没关系
  playTrack(idx);

  // 被拦截后的兜底：用户第一次与页面交互（点击/触摸/按键）时立刻开播
  const tryUnlock = () => {
    if (unlocked) return;
    unlocked = true;
    document.removeEventListener("pointerdown", tryUnlock);
    document.removeEventListener("touchstart", tryUnlock);
    document.removeEventListener("keydown", tryUnlock);
    document.removeEventListener("scroll", tryUnlock, true);
    if (audio.paused) playTrack(idx);
  };
  document.addEventListener("pointerdown", tryUnlock);
  document.addEventListener("touchstart", tryUnlock);
  document.addEventListener("keydown", tryUnlock);
  document.addEventListener("scroll", tryUnlock, true);

  // 用户手动点了播放器就不再自动干预
  $("btnPlay").addEventListener("click", () => { unlocked = true; });
  $("btnNext").addEventListener("click", () => { unlocked = true; });
  $("btnPrev").addEventListener("click", () => { unlocked = true; });
})();

/* ---------- 启动 ---------- */
loadWallpaper();
loadSettingsIntoForm();
if (!state.currentId || !state.sessions[state.currentId]) newSession(); else renderMessages();
renderSessionList();
initPlayer();
