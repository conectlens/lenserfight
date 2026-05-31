import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

import { useCreateBattle } from '../../hooks/useMobileContent'

type Format = 'ai_vs_ai' | 'human_vs_human_open_votes' | 'human_vs_ai'

const FORMAT_OPTIONS: { value: Format; label: string; desc: string }[] = [
  { value: 'ai_vs_ai', label: 'AI vs AI', desc: 'Two AI models compete' },
  { value: 'human_vs_human_open_votes', label: 'Human vs Human', desc: 'Two humans compete, community votes' },
  { value: 'human_vs_ai', label: 'Human vs AI', desc: 'A human takes on an AI model' },
]

export default function CreateBattleScreen() {
  const router = useRouter()
  const createBattle = useCreateBattle()

  const [step, setStep] = useState(1)
  const [format, setFormat] = useState<Format>('ai_vs_ai')
  const [title, setTitle] = useState('')
  const [task, setTask] = useState('')
  const [rules, setRules] = useState('')
  const [startNow, setStartNow] = useState(true)
  const [scheduledDate, setScheduledDate] = useState('')

  const canAdvance = () => {
    if (step === 2) return title.trim().length > 0 && task.trim().length > 0
    return true
  }

  const handleNext = () => {
    if (step < 4) setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
    else router.back()
  }

  const handleCreate = async () => {
    const result = await createBattle.mutateAsync({
      title: title.trim(),
      taskPrompt: task.trim(),
      battleType: format,
      rules: rules.trim() || undefined,
    })
    if (result) {
      router.replace(`/battle/${result}` as never)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Nav bar */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={handleBack} style={styles.navBtn}>
          <Text style={styles.navBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Step {step} of 4</Text>
        {step < 4 ? (
          <TouchableOpacity
            onPress={handleNext}
            style={[styles.navBtn, !canAdvance() && styles.navBtnDisabled]}
            disabled={!canAdvance()}
          >
            <Text style={[styles.navBtnText, !canAdvance() && styles.navBtnTextDisabled]}>
              Next →
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.navBtn} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {step === 1 && (
          <View style={styles.section}>
            <Text style={styles.stepTitle}>Choose format</Text>
            {FORMAT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.formatCard, format === opt.value && styles.formatCardActive]}
                onPress={() => setFormat(opt.value)}
                activeOpacity={0.7}
              >
                <Text style={[styles.formatLabel, format === opt.value && styles.formatLabelActive]}>
                  {opt.label}
                </Text>
                <Text style={styles.formatDesc}>{opt.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {step === 2 && (
          <View style={styles.section}>
            <Text style={styles.stepTitle}>Battle details</Text>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Best summary of a research paper"
              maxLength={100}
              returnKeyType="next"
            />
            <Text style={styles.label}>Task *</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={task}
              onChangeText={setTask}
              placeholder="Describe what contenders must do..."
              maxLength={2000}
              multiline
              textAlignVertical="top"
            />
            <Text style={styles.label}>Rules (optional)</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={rules}
              onChangeText={setRules}
              placeholder="Any constraints or judging criteria..."
              maxLength={500}
              multiline
              textAlignVertical="top"
            />
          </View>
        )}

        {step === 3 && (
          <View style={styles.section}>
            <Text style={styles.stepTitle}>Schedule</Text>
            <View style={styles.switchRow}>
              <Text style={styles.label}>Start immediately</Text>
              <Switch value={startNow} onValueChange={setStartNow} trackColor={{ true: '#6366f1' }} />
            </View>
            {!startNow && (
              <>
                <Text style={styles.label}>Start date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  value={scheduledDate}
                  onChangeText={setScheduledDate}
                  placeholder="2026-01-15"
                  keyboardType="default"
                />
              </>
            )}
          </View>
        )}

        {step === 4 && (
          <View style={styles.section}>
            <Text style={styles.stepTitle}>Review</Text>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewKey}>Format</Text>
              <Text style={styles.reviewVal}>{FORMAT_OPTIONS.find((o) => o.value === format)?.label}</Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewKey}>Title</Text>
              <Text style={styles.reviewVal}>{title}</Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewKey}>Task</Text>
              <Text style={styles.reviewVal}>{task.slice(0, 100)}{task.length > 100 ? '…' : ''}</Text>
            </View>
            {rules ? (
              <View style={styles.reviewRow}>
                <Text style={styles.reviewKey}>Rules</Text>
                <Text style={styles.reviewVal}>{rules.slice(0, 80)}{rules.length > 80 ? '…' : ''}</Text>
              </View>
            ) : null}
            <View style={styles.reviewRow}>
              <Text style={styles.reviewKey}>Schedule</Text>
              <Text style={styles.reviewVal}>{startNow ? 'Immediately' : scheduledDate || 'Not set'}</Text>
            </View>

            {createBattle.isError && (
              <Text style={styles.errorText}>{(createBattle.error as Error).message}</Text>
            )}

            <TouchableOpacity
              style={[styles.createBtn, createBattle.isPending && styles.createBtnDisabled]}
              onPress={handleCreate}
              disabled={createBattle.isPending}
              activeOpacity={0.8}
            >
              {createBattle.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.createBtnText}>Create Battle</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  navBtn: { minWidth: 72 },
  navBtnDisabled: { opacity: 0.4 },
  navBtnText: { fontSize: 15, color: '#6366f1', fontWeight: '500' },
  navBtnTextDisabled: { color: '#9ca3af' },
  navTitle: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
  scroll: { padding: 16, gap: 12 },
  section: { gap: 12 },
  stepTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 4 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151' },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: '#ffffff',
    color: '#111827',
  },
  inputMultiline: { minHeight: 96 },
  formatCard: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#ffffff',
  },
  formatCardActive: { borderColor: '#6366f1', backgroundColor: '#eef2ff' },
  formatLabel: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 2 },
  formatLabelActive: { color: '#4f46e5' },
  formatDesc: { fontSize: 13, color: '#6b7280' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewRow: { gap: 2 },
  reviewKey: { fontSize: 12, color: '#6b7280', fontWeight: '500', textTransform: 'uppercase' },
  reviewVal: { fontSize: 15, color: '#111827' },
  errorText: { fontSize: 14, color: '#ef4444' },
  createBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  createBtnDisabled: { opacity: 0.6 },
  createBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
})
