---
title: 为聊天功能做贡献
description: 如何在 LenserFight 中构建多智能体聊天界面 — 范围、架构提示和验收标准。
---

# 为聊天功能做贡献

聊天页面（`/chat`）是一个计划中的功能，也是第一次重大贡献的绝佳机会。目前存在一个占位符界面 — 目标是一个由 LenserFight AI 基础设施支持的真正多智能体聊天界面。

## 需要构建什么

v1 聊天功能的核心交付物：

- **对话线程 UI** — 包含作者头像（用户 vs. AI 智能体）、时间戳和流式文本支持的消息历史列表。
- **模型选择器** — 让用户选择哪个 AI 智能体或模型处理会话（GPT-4o、Claude、自定义 Lenser）。
- **编辑栏** — 带有发送、附件、图片和麦克风按钮的文本输入。
- **会话管理** — 开始新聊天，在侧边栏或下拉菜单中浏览历史会话。
- **Supabase 后端** — `chat_sessions` 和 `chat_messages` 表、RLS 策略、流式响应的实时订阅。

## 如何开始

1. 在 GitHub 上认领[聊天功能 Issue](https://github.com/conectlens/lenserfight/issues?q=is%3Aopen+label%3Achat)。
2. 运行 `pnpm nx serve web` 并导航到 `/chat` 查看当前占位符。
3. 在 `#chat-feature` 讨论线程中提问，或尽早开一个草稿 PR。
