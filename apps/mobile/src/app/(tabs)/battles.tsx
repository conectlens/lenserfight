import { useRouter } from 'expo-router'
import React, { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

import { useBattlesFeed } from '../../hooks/useMobileContent'

type FilterStatus = 'all' | 'open' | 'voting' | 'executing' | 'closed'

const FILTERS: FilterStatus[] = ['all', 'open', 'voting', 'executing', 'closed']

const STATUS_COLORS: Record<string, string> = {
  open: '#22c55e',
  voting: '#eab308',
  executing: '#3b82f6',
  closed: '#6b7280',
  draft: '#9ca3af',
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  voting: 'Voting',
  executing: 'Executing',
  closed: 'Closed',
  draft: 'Draft',
  scoring: 'Scoring',
  published: 'Published',
  archived: 'Archived',
}

const FILTER_LABELS: Record<FilterStatus, string> = {
  all: 'All',
  open: 'Open',
  voting: 'Voting',
  executing: 'Executing',
  closed: 'Closed',
}

export default function BattlesScreen() {
  const router = useRouter()
  const [filter, setFilter] = useState<FilterStatus>('all')

  const query = useBattlesFeed(filter === 'all' ? undefined : filter)

  const onRefresh = useCallback(() => {
    query.refetch()
  }, [query])

  const statusColor = (status: string) => STATUS_COLORS[status] ?? '#9ca3af'
  const statusLabel = (status: string) => STATUS_LABELS[status] ?? status

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Battles</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, filter === f ? styles.chipActive : styles.chipInactive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.chipText, filter === f ? styles.chipTextActive : styles.chipTextInactive]}>
              {FILTER_LABELS[f]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {query.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : (
        <FlatList
          data={query.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={query.isFetching && !query.isLoading} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            !query.isLoading ? (
              <View style={styles.center}>
                <Text style={styles.emptyText}>No battles found.</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/battle/${item.id}` as never)}
              activeOpacity={0.7}
            >
              <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
              <View style={styles.cardMeta}>
                <View style={[styles.statusDot, { backgroundColor: statusColor(item.status) }]} />
                <Text style={[styles.statusLabel, { color: statusColor(item.status) }]}>
                  {statusLabel(item.status)}
                </Text>
                {item.total_vote_count > 0 && (
                  <Text style={styles.voteCount}>{item.total_vote_count} votes</Text>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/battle/create' as never)}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  filterRow: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: '#6366f1',
  },
  chipInactive: {
    backgroundColor: '#e5e7eb',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  chipTextInactive: {
    color: '#374151',
  },
  list: {
    paddingBottom: 96,
  },
  card: {
    backgroundColor: '#ffffff',
    marginHorizontal: 8,
    marginVertical: 4,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  voteCount: {
    fontSize: 13,
    color: '#6b7280',
    marginLeft: 8,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 15,
    color: '#6b7280',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    fontSize: 28,
    color: '#ffffff',
    lineHeight: 32,
    fontWeight: '300',
  },
})
