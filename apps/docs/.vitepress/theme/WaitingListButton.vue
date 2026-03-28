<script setup lang="ts">
import { ref } from 'vue'

const forumUrl = import.meta.env.VITE_FORUM_URL ?? 'https://lenserfight.com'
const isOpen = ref(false)

function openModal() {
  isOpen.value = true
}

function closeModal() {
  isOpen.value = false
}

function handleBackdropClick(e: MouseEvent) {
  if ((e.target as HTMLElement).classList.contains('wl-backdrop')) {
    closeModal()
  }
}
</script>

<template>
  <!-- Trigger button -->
  <button class="wl-trigger" aria-label="Early Access" @click="openModal">
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 1l1.6 3.4 3.7.5-2.7 2.6.6 3.7L8 9.4l-3.3 1.8.6-3.7L2.7 5l3.7-.5L8 1z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
    </svg>
    Early Access
  </button>

  <!-- Modal -->
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="wl-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wl-modal-title"
      @click="handleBackdropClick"
    >
      <div class="wl-panel">
        <!-- Header -->
        <div class="wl-header">
          <div class="wl-header-text">
            <h3 id="wl-modal-title" class="wl-title">Early Access</h3>
            <p class="wl-subtitle">Join the waitlist for upcoming features.</p>
          </div>
          <button class="wl-close" aria-label="Close" @click="closeModal">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="wl-body">
          <p class="wl-description">
            Sign in or create a Lenser account to join the waitlist and get early access to upcoming features and agentic workflows.
          </p>

          <div class="wl-actions">
            <a
              :href="`${forumUrl}/auth/login`"
              class="wl-btn wl-btn-outline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Sign In
            </a>
            <a
              :href="`${forumUrl}/register`"
              class="wl-btn wl-btn-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              Join Now
            </a>
          </div>

          <p class="wl-note">
            A Lenser account is required to join the waitlist.
          </p>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.wl-trigger {
  position: fixed;
  bottom: 80px;
  right: 24px;
  z-index: 9999;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 1.1rem;
  background: #1f2937;
  color: #ffffff;
  font-size: 0.85rem;
  font-weight: 600;
  border: none;
  border-radius: 9999px;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.22);
  transition: opacity 0.15s, transform 0.1s;
}

.wl-trigger:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* Backdrop */
.wl-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

/* Panel */
.wl-panel {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-border);
  border-radius: 14px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.24);
  overflow: hidden;
}

/* Header */
.wl-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 1.25rem 1.25rem 1rem;
  border-bottom: 1px solid var(--vp-c-divider);
}

.wl-header-text {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.wl-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin: 0;
}

.wl-subtitle {
  font-size: 0.83rem;
  color: var(--vp-c-text-2);
  margin: 0;
}

.wl-close {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--vp-c-text-2);
  padding: 0.25rem;
  border-radius: 6px;
  display: flex;
  flex-shrink: 0;
  transition: color 0.15s;
}

.wl-close:hover {
  color: var(--vp-c-text-1);
}

/* Body */
.wl-body {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.wl-description {
  font-size: 0.88rem;
  color: var(--vp-c-text-2);
  line-height: 1.6;
  margin: 0;
}

.wl-actions {
  display: flex;
  gap: 0.75rem;
}

.wl-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.6rem 1rem;
  border-radius: 8px;
  font-size: 0.88rem;
  font-weight: 600;
  text-decoration: none;
  transition: opacity 0.15s;
}

.wl-btn:hover {
  opacity: 0.88;
}

.wl-btn-outline {
  border: 1.5px solid var(--vp-c-border);
  color: var(--vp-c-text-1);
  background: transparent;
}

.wl-btn-primary {
  background: #1f2937;
  color: #ffffff;
  border: none;
}

/* Note */
.wl-note {
  font-size: 0.76rem;
  color: var(--vp-c-text-2);
  margin: 0;
  text-align: center;
}
</style>
