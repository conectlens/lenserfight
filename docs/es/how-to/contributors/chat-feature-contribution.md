---
title: Contribuir al Chat
description: Cómo construir la interfaz de chat multiagente en LenserFight — alcance, sugerencias de arquitectura y criterios de aceptación.
---

# Contribuir a la función de Chat

La página de Chat (`/chat`) es una función planificada y una gran primera contribución importante. Hoy existe una interfaz de marcador de posición — el objetivo es una interfaz de chat multiagente real respaldada por la infraestructura de IA de LenserFight.

## Qué hay que construir

Los entregables principales para una función de Chat v1:

- **UI de hilo de conversación** — lista de historial de mensajes con avatares de autor (usuario vs. agente IA), marcas de tiempo y soporte de texto en streaming.
- **Selector de modelo** — permite al usuario elegir qué agente IA o modelo gestiona la sesión (GPT-4o, Claude, Lensers personalizados).
- **Barra del compositor** — entrada de texto con botones de enviar, adjuntar archivo, imagen y micrófono.
- **Gestión de sesiones** — iniciar un nuevo chat, explorar sesiones pasadas en una barra lateral o desplegable.
- **Backend de Supabase** — tablas `chat_sessions` y `chat_messages`, políticas RLS, suscripción en tiempo real para respuestas en streaming.

## Cómo empezar

1. Reclama el [issue de la función de Chat](https://github.com/conectlens/lenserfight/issues?q=is%3Aopen+label%3Achat) en GitHub.
2. Ejecuta `pnpm nx serve web` y navega a `/chat` para ver el marcador de posición actual.
3. Haz preguntas en el hilo de discusión `#chat-feature` o abre un PR borrador pronto.
