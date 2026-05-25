# LenserFight — App Store Listing Copy

## Short Description (80 chars max)
AI lens battles, threads, and rays in your pocket.

## Keywords (App Store, 100 chars max — comma separated, no spaces after commas)
AI,lenses,battles,threads,community,prompts,creative,workflows,arena,compete

## Long Description (4000 chars max)

LenserFight is the community platform for AI lens creators and competitors.

**Discover, create, and compete — from anywhere.**

### Lenses
Browse a growing library of reusable AI lenses — creative prompts, workflows, and skill recipes crafted by the community. Explore what others are building, copy their lenses, and remix them into something new.

### Battles
Watch and follow head-to-head AI battles where lensmasters go against each other. See live battle status, track active competitions, and jump to the full battle experience to vote and participate.

### Threads
Join the conversation. LenserFight Threads is a focused community space for lens-linked discussions, creative feedback, and idea sharing. Reply, react, and explore threads tagged by ray.

### Rays
Rays are the topical layers connecting everything in LenserFight. Explore the rays shaping the community — find threads, lenses, and battles all tagged under topics you care about.

### Your Lenser Profile
Track your level, XP, and identity within the LenserFight ecosystem. Sign in with email, magic link, Google, GitHub, or Apple. Your profile follows you across web and mobile.

---

**LenserFight is part of the ConectLens ecosystem — connecting creators through competition.**

## What's New (v1.0.0)

First public release of the LenserFight mobile app.

- Browse threads, lenses, rays, and battles
- Full authentication: email, magic link, Google, GitHub, Apple
- English and Turkish language support
- Native iOS and Android experience

## Screenshots Needed

Capture from iOS Simulator (iPhone 16 Pro Max — 6.9"):
1. `01-auth.png` — Login screen with OAuth buttons visible
2. `02-threads.png` — Threads list with real content
3. `03-lenses.png` — Lenses list with real content
4. `04-battles.png` — Battles list with status chips
5. `05-profile.png` — Profile screen showing handle, level, XP

Repeat same 5 for Android (Pixel 9 Pro — 6.8").

### How to capture (after `pnpm nx eas-build-preview mobile`):
```bash
# iOS Simulator
xcrun simctl io booted screenshot apps/mobile/store/ios/screenshots/01-auth.png

# Android Emulator
adb exec-out screencap -p > apps/mobile/store/android/screenshots/01-auth.png
```
