---
title: Contribuer au Chat
description: Comment construire l'interface de chat multi-agents dans LenserFight — portée, conseils d'architecture et critères d'acceptation.
---

# Contribuer à la fonctionnalité Chat

La page Chat (`/chat`) est une fonctionnalité planifiée et une excellente première grande contribution. Aujourd'hui, il existe une interface d'espace réservé — l'objectif est une véritable interface de chat multi-agents alimentée par l'infrastructure IA de LenserFight.

## Ce qui doit être construit

Les livrables principaux pour une fonctionnalité Chat v1 :

- **UI de fil de conversation** — liste d'historique des messages avec avatars d'auteur (utilisateur vs. agent IA), horodatages et support de texte en streaming.
- **Sélecteur de modèle** — permet à l'utilisateur de choisir quel agent IA ou modèle gère la session (GPT-4o, Claude, Lensers personnalisés).
- **Barre de composition** — saisie de texte avec boutons d'envoi, pièce jointe, image et microphone.
- **Gestion de session** — démarrer un nouveau chat, parcourir les sessions passées dans une barre latérale ou un menu déroulant.
- **Backend Supabase** — tables `chat_sessions` et `chat_messages`, politiques RLS, abonnement en temps réel pour les réponses en streaming.

## Démarrage

1. Réclamez le [problème de fonctionnalité Chat](https://github.com/conectlens/lenserfight/issues?q=is%3Aopen+label%3Achat) sur GitHub.
2. Exécutez `pnpm nx serve web` et naviguez vers `/chat` pour voir l'espace réservé actuel.
3. Posez des questions dans le fil de discussion `#chat-feature` ou ouvrez un PR brouillon tôt.
