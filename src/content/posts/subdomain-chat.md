---
title: 子域创建与更新内容记录
published: 2026-08-04
pinned: true
description: 记录子域 chat.7651130.xyz（AI 聊天站）的创建过程与历次内容更新：Cloudflare Pages 部署、DeepSeek API 代理、角色扮演提示词系统、音乐播放器与自动播放、音量调节等功能的迭代记录。
tags: [网站, 子域, Cloudflare, 聊天站, 记录]
category: 网站
slug: subdomain-chat
---

## 🌐 子域简介

子域 **`chat.7651130.xyz`** 是一个轻量的 AI 聊天站，部署在 Cloudflare Pages 上，通过 CNAME 解析指向 `chat-qingmeng.pages.dev`。

- **技术栈**：纯静态 HTML/CSS/JS + Cloudflare Pages Functions（API 代理）
- **模型**：DeepSeek（`deepseek-v4-flash`），由 Functions 层转发请求，隐藏 API Key
- **代码位置**：本仓库 [`chat/`](../chat) 目录，可直接部署
- **核心功能**：角色扮演聊天（可自定义身份/名字/性格）、流式回复、音乐播放器、会话历史本地存储

::github{repo="shangq729-a11y/Firefly"}

## 🚀 创建过程

1. **站点开发**：在本地完成聊天站前端（页面、样式、交互）与 Functions API 代理（`functions/api/chat.js`）
2. **部署上线**：使用 Wrangler CLI 将站点部署到 Cloudflare Pages 项目 `chat-qingmeng`
3. **域名接入**：在域名 DNS 中添加 CNAME 记录，`chat` 子域指向 `chat-qingmeng.pages.dev`
4. **环境变量**：将 DeepSeek API Key 配置到 Pages 项目的环境变量中，API 实测返回 200、流式回复正常

## 📝 内容更新记录

| 日期 | 更新内容 |
| --- | --- |
| 2026-08-04 | **进站自动播放**：《羽梦》设为进站默认曲目，被浏览器拦截时首次点击自动解锁播放 |
| 2026-08-04 | **音量调节**：播放器新增音量滑块，音量持久化保存，图标随音量变化（🔇/🔉/🔊） |
| 2026-08-04 | **资源缓存修复**：为 CSS/JS 添加版本号参数，强制访客刷新缓存，解决旧代码导致的滑块失效问题 |
| 2026-08-04 | **角色提示词优化**：重构系统提示词为四段式强约束（最高准则/身份/性格/扮演规则），让模型严格遵从用户填写的设定与临时指令 |

## 🔧 如何更新子域内容

```bash
# 修改代码后，在 chat/ 目录执行
npx wrangler pages deploy . --project-name=chat-qingmeng --branch=main --commit-dirty=true
```

更新内容后，把 `chat/` 目录的改动一并提交到本仓库，保持代码与线上一致。
