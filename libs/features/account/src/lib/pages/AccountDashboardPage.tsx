import React from 'react'
import { Link } from 'react-router-dom'
import { Swords, Monitor, ArrowRight, Zap } from 'lucide-react'
import { ScoreBar } from '@lenserfight/ui/widgets'
import { DeviceCard } from '@lenserfight/features/devices'
import { useAccountSummary } from '../hooks/useAccountSummary'

export function AccountDashboardPage() {
  const { data, isLoading } = useAccountSummary()

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="h-8 w-56 rounded bg-muted animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const { xpSummary, devices, recentBattles } = data ?? {
    xpSummary: null,
    devices: [],
    recentBattles: [],
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your LenserFight account overview.
        </p>
      </div>

      {/* XP & Level */}
      <section className="border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            <h2 className="font-semibold">XP & Level</h2>
          </div>
          <Link to="/lenserboard" className="text-xs text-muted-foreground hover:underline flex items-center gap-1">
            Leaderboard <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {xpSummary ? (
          <div className="space-y-2">
            <div className="flex items-end gap-3">
              <span className="text-4xl font-bold">{xpSummary.currentLevel}</span>
              <span className="text-sm text-muted-foreground pb-1">Level</span>
              {xpSummary.rank && (
                <span className="ml-auto text-sm text-muted-foreground pb-1">Rank #{xpSummary.rank}</span>
              )}
            </div>
            <ScoreBar
              scoreA={xpSummary.totalXp}
              scoreB={Math.max(0, (xpSummary.currentLevelMaxXp ?? xpSummary.totalXp + 500) - xpSummary.totalXp)}
              labelA={`${xpSummary.totalXp.toLocaleString()} XP`}
              labelB="Next level"
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Join a battle to start earning XP.
          </p>
        )}
      </section>

      {/* Devices */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Monitor className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-semibold">Local Devices</h2>
          </div>
          <Link to="/account/devices" className="text-xs text-muted-foreground hover:underline flex items-center gap-1">
            Manage <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {devices.length === 0 ? (
          <div className="border rounded-xl p-4 text-center space-y-2">
            <p className="text-sm text-muted-foreground">No devices registered.</p>
            <Link
              to="/account/devices"
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md border border-input bg-background hover:bg-muted transition-colors"
            >
              Register a device
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {devices.map((device) => (
              <Link key={device.id} to={`/account/devices/${device.id}`}>
                <DeviceCard device={device} />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent Battles */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-semibold">Recent Battles</h2>
          </div>
          <Link to="/battles" className="text-xs text-muted-foreground hover:underline flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {recentBattles.length === 0 ? (
          <div className="border rounded-xl p-4 text-center space-y-2">
            <p className="text-sm text-muted-foreground">No battles yet.</p>
            <Link
              to="/battles"
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md border border-input bg-background hover:bg-muted transition-colors"
            >
              Browse battles
            </Link>
          </div>
        ) : (
          <div className="border rounded-xl divide-y">
            {recentBattles.map((battle) => (
              <Link
                key={battle.id}
                to={`/battles/${battle.slug}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors"
              >
                <span className="text-sm font-medium truncate">{battle.title ?? battle.slug}</span>
                <span className="text-xs text-muted-foreground capitalize shrink-0 ml-2">{battle.status}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
