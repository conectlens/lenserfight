<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { supabase } from './supabaseClient'

const COOLDOWN_KEY = 'lf_feedback_cooldown'
const COOLDOWN_MS = 10 * 60 * 1000 // 10 minutes

const isOpen = ref(false)
const topic = ref<string>('general')
const message = ref<string>('')
const submitting = ref(false)
const submitError = ref<string | null>(null)
const success = ref(false)
const cooldownRemaining = ref(0)

const charCount = computed(() => message.value.length)
const isValid = computed(() => message.value.trim().length >= 10 && cooldownRemaining.value === 0)

function checkCooldown() {
  if (typeof localStorage === 'undefined') return
  const last = parseInt(localStorage.getItem(COOLDOWN_KEY) ?? '0', 10)
  const diff = Date.now() - last
  cooldownRemaining.value = diff < COOLDOWN_MS ? Math.ceil((COOLDOWN_MS - diff) / 60000) : 0
}

function setCooldown() {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(COOLDOWN_KEY, String(Date.now()))
  }
  cooldownRemaining.value = Math.ceil(COOLDOWN_MS / 60000)
}

onMounted(checkCooldown)

function openModal() {
  checkCooldown()
  isOpen.value = true
  submitError.value = null
  success.value = false
}

function closeModal() {
  isOpen.value = false
  topic.value = 'general'
  message.value = ''
  submitError.value = null
  success.value = false
}

async function handleSubmit() {
  if (!isValid.value) return
  checkCooldown()
  if (cooldownRemaining.value > 0) {
    submitError.value = `Please wait ${cooldownRemaining.value} min before sending another message.`
    return
  }
  submitting.value = true
  submitError.value = null

  try {
    const { error } = await supabase.rpc('fn_analytics_submit_feedback_public', {
      p_product_tag: topic.value,
      p_message: message.value.trim(),
      p_page: typeof window !== 'undefined' ? window.location.pathname : '',
      p_start_date: null,
      p_end_date: null,
    })

    if (error) {
      submitError.value = error.message
    } else {
      setCooldown()
      success.value = true
      setTimeout(() => {
        closeModal()
      }, 2000)
    }
  } catch (e: any) {
    submitError.value = e?.message ?? 'Something went wrong. Please try again.'
  } finally {
    submitting.value = false
  }
}

function handleBackdropClick(e: MouseEvent) {
  if ((e.target as HTMLElement).classList.contains('fb-backdrop')) {
    closeModal()
  }
}
</script>

<template>
  <!-- Trigger button -->
  <button class="fb-trigger" aria-label="Send feedback" @click="openModal">
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M14 1H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3l3 3 3-3h3a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    </svg>
    Feedback
  </button>

  <!-- Modal overlay -->
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fb-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fb-modal-title"
      @click="handleBackdropClick"
    >
      <div class="fb-panel">
        <!-- Header -->
        <div class="fb-header">
          <h3 id="fb-modal-title" class="fb-title">Send Feedback</h3>
          <button class="fb-close" aria-label="Close" @click="closeModal">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </button>
        </div>

        <!-- Success state -->
        <div v-if="success" class="fb-success">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <circle cx="16" cy="16" r="15" stroke="#16a34a" stroke-width="2"/>
            <path d="M9 16l5 5 9-9" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <p>Thank you! Feedback received.</p>
        </div>

        <!-- Form -->
        <form v-else @submit.prevent="handleSubmit" class="fb-form">
          <!-- Topic -->
          <div class="fb-field">
            <label class="fb-label" for="fb-topic">Topic</label>
            <select id="fb-topic" v-model="topic" class="fb-select">
              <option value="bug">Bug Report</option>
              <option value="feature">Feature Request</option>
              <option value="ui_ux">UI/UX</option>
              <option value="general">General</option>
              <option value="other">Other</option>
            </select>
          </div>

          <!-- Message -->
          <div class="fb-field">
            <label class="fb-label" for="fb-message">
              Message
              <span class="fb-char-counter">{{ charCount }} / 2000</span>
            </label>
            <textarea
              id="fb-message"
              v-model="message"
              class="fb-textarea"
              rows="4"
              maxlength="2000"
              placeholder="Describe your feedback..."
              required
            />
          </div>

          <!-- Error -->
          <p v-if="submitError" class="fb-error">{{ submitError }}</p>

          <!-- Actions -->
          <div class="fb-actions">
            <button type="button" class="fb-btn fb-btn-cancel" @click="closeModal">Cancel</button>
            <button
              type="submit"
              class="fb-btn fb-btn-submit"
              :disabled="!isValid || submitting || cooldownRemaining > 0"
            >
              {{ submitting ? 'Sending…' : cooldownRemaining > 0 ? `Wait ${cooldownRemaining}m` : 'Submit' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.fb-trigger {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 1.1rem;
  background: #ffde59;
  color: #1a1a1a;
  font-size: 0.85rem;
  font-weight: 600;
  border: none;
  border-radius: 9999px;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
  transition: opacity 0.15s, transform 0.1s;
}

.fb-trigger:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* Backdrop */
.fb-backdrop {
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
.fb-panel {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-border);
  border-radius: 14px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.24);
  overflow: hidden;
}

.fb-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.1rem 1.25rem 0.9rem;
  border-bottom: 1px solid var(--vp-c-divider);
}

.fb-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin: 0;
}

.fb-close {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--vp-c-text-2);
  padding: 0.25rem;
  border-radius: 6px;
  display: flex;
  transition: color 0.15s;
}

.fb-close:hover {
  color: var(--vp-c-text-1);
}

/* Form */
.fb-form {
  padding: 1.1rem 1.25rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.fb-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.fb-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--vp-c-text-2);
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.fb-char-counter {
  font-size: 0.72rem;
  font-weight: 400;
  color: var(--vp-c-text-3, var(--vp-c-text-2));
}

.fb-select,
.fb-textarea {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  color: var(--vp-c-text-1);
  font-size: 0.88rem;
  padding: 0.5rem 0.75rem;
  width: 100%;
  transition: border-color 0.15s;
  font-family: inherit;
}

.fb-select:focus,
.fb-textarea:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
}

.fb-textarea {
  resize: vertical;
  min-height: 90px;
}

.fb-error {
  font-size: 0.82rem;
  color: #dc2626;
  margin: 0;
}

.fb-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  margin-top: 0.25rem;
}

.fb-btn {
  padding: 0.5rem 1.1rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: opacity 0.15s;
}

.fb-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.fb-btn-cancel {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  border: 1px solid var(--vp-c-border);
}

.fb-btn-cancel:hover:not(:disabled) {
  color: var(--vp-c-text-1);
}

.fb-btn-submit {
  background: #ffde59;
  color: #1a1a1a;
}

.fb-btn-submit:hover:not(:disabled) {
  opacity: 0.88;
}

/* Success */
.fb-success {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2rem 1.25rem;
  text-align: center;
  color: var(--vp-c-text-1);
  font-weight: 500;
}

.fb-success p {
  margin: 0;
}
</style>
