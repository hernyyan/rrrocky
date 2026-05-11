import { useState } from 'react'
import { adminGetChangelog } from '../api/client'
import { useFetchData } from './useFetchData'

export function useChangelogList() {
  const { data, loading } = useFetchData(() => adminGetChangelog({ limit: 200 }))
  const [expandedCell, setExpandedCell] = useState<{ column: string; value: string } | null>(null)

  const entries = data?.entries ?? []
  const total = data?.total_entries ?? 0
  const columns = entries.length > 0 ? Object.keys(entries[0]) : []

  return { entries, total, loading, columns, expandedCell, setExpandedCell }
}
