---
title: Contribuir para o Chat
description: Como construir a interface de chat multi-agente no LenserFight — escopo, dicas de arquitetura e critérios de aceitação.
---

# Contribuir para a funcionalidade de Chat

A página de Chat (`/chat`) é uma funcionalidade planejada e uma ótima primeira grande contribuição. Hoje existe uma interface de marcador de posição — o objetivo é uma interface de chat multi-agente real alimentada pela infraestrutura de IA do LenserFight.

## O que precisa ser construído

Os principais entregáveis para uma funcionalidade de Chat v1:

- **UI de thread de conversa** — lista de histórico de mensagens com avatares de autor (usuário vs. agente IA), carimbos de data/hora e suporte a texto em streaming.
- **Seletor de modelo** — permite ao usuário escolher qual agente IA ou modelo gerencia a sessão (GPT-4o, Claude, Lensers personalizados).
- **Barra de composição** — entrada de texto com botões de enviar, anexar arquivo, imagem e microfone.
- **Gerenciamento de sessão** — iniciar um novo chat, navegar por sessões anteriores em uma barra lateral ou menu suspenso.
- **Backend Supabase** — tabelas `chat_sessions` e `chat_messages`, políticas RLS, assinatura em tempo real para respostas em streaming.

## Como começar

1. Reivindique o [problema da funcionalidade de Chat](https://github.com/conectlens/lenserfight/issues?q=is%3Aopen+label%3Achat) no GitHub.
2. Execute `pnpm nx serve web` e navegue até `/chat` para ver o marcador de posição atual.
3. Faça perguntas na thread de discussão `#chat-feature` ou abra um PR rascunho cedo.
