---
title: Zum Chat beitragen
description: So wird die Multi-Agenten-Chat-Oberfläche in LenserFight entwickelt — Umfang, Architekturhinweise und Akzeptanzkriterien.
---

# Zum Chat-Feature beitragen

Die Chat-Seite (`/chat`) ist ein geplantes Feature und eine großartige erste große Contribution. Heute gibt es eine Platzhalter-Benutzeroberfläche — das Ziel ist eine echte Multi-Agenten-Chat-Oberfläche, die von LenserFights KI-Infrastruktur unterstützt wird.

## Was gebaut werden muss

Die Kernlieferables für eine v1-Chat-Funktion:

- **Konversations-Thread-UI** — Nachrichtenverlaufsliste mit Autoravataren (Benutzer vs. KI-Agent), Zeitstempeln und Streaming-Textunterstützung.
- **Modellauswahl** — Benutzer kann wählen, welcher KI-Agent oder welches Modell die Sitzung verwaltet (GPT-4o, Claude, benutzerdefinierte Lenser).
- **Composer-Leiste** — Texteingabe mit Senden, Datei anhängen, Bild und Mikrofon-Schaltflächen.
- **Sitzungsverwaltung** — neuen Chat starten, vergangene Sitzungen in einer Seitenleiste oder Dropdown anzeigen.
- **Supabase-Backend** — `chat_sessions`- und `chat_messages`-Tabellen, RLS-Richtlinien, Echtzeit-Abonnement für gestreamte Antworten.

## Einstieg

1. Fordere das [Chat-Feature-Issue](https://github.com/conectlens/lenserfight/issues?q=is%3Aopen+label%3Achat) auf GitHub an.
2. Führe `pnpm nx serve web` aus und navigiere zu `/chat`, um den aktuellen Platzhalter zu sehen.
3. Stelle Fragen im `#chat-feature`-Diskussions-Thread oder öffne frühzeitig einen Draft-PR.
