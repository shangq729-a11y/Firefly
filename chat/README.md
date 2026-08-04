# 来聊天吧~ · 二次元AI互动小屋

把原来的 Streamlit 版 AI 陪伴聊天，改造成**纯静态前端 + Cloudflare Pages Functions** 的方案。
不依赖 Python，可以免费部署到 Cloudflare Pages（自带 `*.pages.dev` 域名，可绑自己的域名）。

## 目录结构

```
myself/
├── index.html              # 主页面（聊天界面）
├── css/style.css           # 二次元美化样式（毛玻璃/樱花/全屏壁纸）
├── js/app.js               # 前端逻辑（会话/流式聊天/音乐/粒子）
├── functions/api/chat.js   # Cloudflare Pages Functions：DeepSeek API 代理（隐藏 Key）
└── assets/                 # ★ 素材目录，替换成你自己的素材
    ├── wallpaper.png       #   全屏壁纸（默认用原项目 01.png，可换成任意 jpg/png）
    ├── logo.png            #   网站图标（留空，可自行放一个）
    └── music/              #   音乐目录，放 mp3 后去 js/app.js 里登记
        └── track01.mp3     #   默认曲目（原项目自带那首）
```

## 功能对照（原 Streamlit 版 → 新版）

| 原功能 | 新版实现 |
|---|---|
| 聊天（DeepSeek 流式输出） | 前端 fetch → `/api/chat` 代理 → DeepSeek SSE 流式，打字机效果 |
| 会话保存/加载/删除/新建 | localStorage 存储（浏览器本地，无需服务器文件系统） |
| 陪伴信息（身份/名字/性格） | 左侧「陪伴信息」表单，自动保存 |
| 页面美化 | 全屏壁纸 + 毛玻璃面板 + 樱花飘落动态 + 音乐播放器 |

## 替换素材（你来操作的部分）

1. **壁纸**：把喜欢的图存为 `assets/wallpaper.jpg`（或改 `js/app.js` 里 `CONFIG.wallpaper` 的路径）。找不到图片时自动回退成粉色渐变。
2. **音乐**：把 mp3 放进 `assets/music/`，然后在 `js/app.js` 顶部 `CONFIG.musicList` 数组里加一行，例如：
   ```js
   musicList: ["assets/music/track01.mp3", "assets/music/我的歌.mp3"],
   ```
3. **图标**：放一个 `assets/logo.png`（网站 favicon）。
4. **模型/人设**：`js/app.js` 的 `CONFIG` 里可改 `model`（默认 deepseek-v4-flash）和默认陪伴设定。

## 部署到 GitHub + Cloudflare Pages

### 1. 推到 GitHub
```bash
cd E:\WEB\myself
git init
git add .
git commit -m "二次元AI互动小屋"
# 在 GitHub 网页上新建一个空仓库，然后：
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

### 2. 接入 Cloudflare Pages
1. 注册/登录 [Cloudflare](https://dash.cloudflare.com/)，左侧菜单进入 **Workers & Pages** → **Create** → **Pages** → **Connect to Git**。
2. 授权 GitHub，选刚才的仓库。
3. 构建设置：**Framework preset 选 None**，**Build command 留空**，**Build output directory 留空**（纯静态，无需构建）。
4. 点 **Save and Deploy**，等一两分钟，会得到一个 `https://xxxx.pages.dev` 地址。

### 3. 配置 API Key（关键步骤）
部署后进入该项目 → **Settings → Environment variables**，添加：
```
DEEPSEEK_API_KEY = sk-你的DeepSeek密钥
```
然后 **Redeploy** 一次让变量生效（Deployments → 三点菜单 → Retry deployment）。

### 4. 绑定自己的域名（可选）
Pages 项目 → **Custom domains** → 输入你的域名，按提示在域名商处加一条 CNAME 指向 `xxxx.pages.dev`，等 SSL 自动签发即可。

## 本地预览

直接双击 `index.html` 能看到界面，但 AI 聊天需要后端代理。联调方式（需要 Node.js）：
```bash
cd E:\WEB\myself
npx wrangler pages dev . --binding DEEPSEEK_API_KEY=sk-xxxx
```
浏览器打开提示的本地地址即可完整测试。

## 常见问题

- **页面打开但聊天报「接口错误 500」**：没配 `DEEPSEEK_API_KEY`，看上面第 3 步。
- **报「上游接口返回 400」**：多半是 `thinking` 参数不被当前模型接受，注释掉 `functions/api/chat.js` 里的 `thinking` 行再部署。
- **音乐点不了/不响**：浏览器自动播放限制，点一下「播放音乐」按钮通常即可；确认 mp3 路径已登记进 `musicList`。
- **想换回原来的流式体验**：默认就是流式，无需改动。
