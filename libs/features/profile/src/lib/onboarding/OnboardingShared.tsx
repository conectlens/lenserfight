import {
  FileText, Github, Globe, GitBranch, Image, MapPin,
  ShieldCheck, Swords, UserCircle, UserPlus, Users, Zap,
  Check,
} from 'lucide-react'
import React from 'react'
import type { OnboardingTask } from './onboardingTypes'

const ICON_MAP: Record<string, React.FC<{ size?: number; className?: string }>> = {
  UserCircle, FileText, MapPin, Globe, Image, Zap,
  GitBranch, Swords, Users, UserPlus, ShieldCheck, Github,
}

export function TaskIcon({ name, size = 14, className }: { name: string; size?: number; className?: string }) {
  const Icon = ICON_MAP[name] ?? Zap
  return <Icon size={size} className={className} />
}

export function TaskPill({ task, onClick }: { task: OnboardingTask; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={task.completed ? `${task.label} — done` : `Start: ${task.label}`}
      className={[
        'group inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-yellow-500',
        task.completed
          ? 'border-greyscale-200 bg-greyscale-100/60 text-greyscale-400 dark:border-greyscale-700 dark:bg-greyscale-800/40 dark:text-greyscale-600 cursor-default'
          : 'border-primary-yellow-500/40 bg-primary-yellow-500/8 text-primary-yellow-700 hover:bg-primary-yellow-500/15 hover:border-primary-yellow-500/60 dark:text-primary-yellow-400 dark:bg-primary-yellow-500/5 cursor-pointer',
      ].join(' ')}
    >
      {task.completed
        ? <Check size={11} className="text-greyscale-400 dark:text-greyscale-600" />
        : <TaskIcon name={task.iconName} size={11} className="text-primary-yellow-600 dark:text-primary-yellow-500" />
      }
      {task.label}
      {!task.completed && (
        <span className="ml-0.5 text-[10px] font-semibold text-primary-yellow-600/70 dark:text-primary-yellow-500/60">
          +{task.xp}
        </span>
      )}
    </button>
  )
}

export function SegmentedProgressBar({ score, className }: { score: number; className?: string }) {
  const segments = 10
  const filled = Math.round((score / 100) * segments)
  return (
    <div className={`flex gap-0.5 ${className ?? ''}`} role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100} aria-label={`Profile ${score}% complete`}>
      {Array.from({ length: segments }).map((_, i) => (
        <div
          key={i}
          className={[
            'h-1 flex-1 rounded-full transition-all duration-500',
            i < filled
              ? 'bg-primary-yellow-500'
              : 'bg-greyscale-200 dark:bg-greyscale-700',
          ].join(' ')}
          style={{ transitionDelay: `${i * 30}ms` }}
        />
      ))}
    </div>
  )
}

export function XpBadge({ xp, total }: { xp: number; total: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary-yellow-500/10 border border-primary-yellow-500/25 px-2 py-0.5 text-[10px] font-bold text-primary-yellow-700 dark:text-primary-yellow-400 tabular-nums">
      <span className="text-primary-yellow-600">{xp}</span>
      <span className="text-primary-yellow-400/70">/ {total} XP</span>
    </span>
  )
}

export function ScoreRing({ score, size = 48 }: { score: number; size?: number }) {
  const strokeWidth = 3.5
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const isComplete = score >= 100
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="currentColor" strokeWidth={strokeWidth} fill="none"
          className="text-greyscale-200 dark:text-greyscale-700"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="currentColor" strokeWidth={strokeWidth} fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          className={isComplete ? 'text-status-green' : 'text-primary-yellow-500'}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[11px] font-bold tabular-nums text-greyscale-900 dark:text-greyscale-50">
          {score}
        </span>
      </div>
    </div>
  )
}

export function CategoryLabel({ id }: { id: string }) {
  const labels: Record<string, string> = {
    identity: 'Identity', content: 'Content', social: 'Social',
    battle: 'Battle', creator: 'Creator', agent: 'Agent',
  }
  return <span className="text-[10px] font-semibold uppercase tracking-wider text-greyscale-400 dark:text-greyscale-500">{labels[id] ?? id}</span>
}

export function DismissButton({ onDismiss, label = 'Dismiss for now' }: { onDismiss: () => void; label?: string }) {
  return (
    <button
      onClick={onDismiss}
      aria-label={label}
      className="text-xs text-greyscale-400 hover:text-greyscale-600 dark:text-greyscale-600 dark:hover:text-greyscale-400 transition-colors underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-yellow-500 rounded"
    >
      {label}
    </button>
  )
}
