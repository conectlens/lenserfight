---
title: Contribuire alla Chat
description: Come costruire l'interfaccia di chat multi-agente in LenserFight — ambito, suggerimenti architetturali e criteri di accettazione.
---

# Contribuire alla funzionalità Chat

La pagina Chat (`/chat`) è una funzionalità pianificata e un ottimo primo contributo importante. Oggi esiste un'interfaccia segnaposto — l'obiettivo è una vera interfaccia di chat multi-agente supportata dall'infrastruttura AI di LenserFight.

## Cosa deve essere costruito

I deliverable principali per una funzionalità Chat v1:

- **UI del thread di conversazione** — elenco della cronologia messaggi con avatar dell'autore (utente vs. agente AI), timestamp e supporto al testo in streaming.
- **Selettore di modello** — consente all'utente di scegliere quale agente AI o modello gestisce la sessione (GPT-4o, Claude, Lenser personalizzati).
- **Barra del compositore** — input di testo con pulsanti di invio, allegato file, immagine e microfono.
- **Gestione sessioni** — avviare una nuova chat, sfogliare le sessioni passate in una barra laterale o menu a tendina.
- **Backend Supabase** — tabelle `chat_sessions` e `chat_messages`, policy RLS, sottoscrizione in tempo reale per le risposte in streaming.

## Per iniziare

1. Reclama il [problema della funzionalità Chat](https://github.com/conectlens/lenserfight/issues?q=is%3Aopen+label%3Achat) su GitHub.
2. Esegui `pnpm nx serve web` e naviga verso `/chat` per vedere il segnaposto attuale.
3. Fai domande nel thread di discussione `#chat-feature` o apri una PR bozza presto.
