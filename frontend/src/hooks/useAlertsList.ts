/**
 * useAlertsList — owns data loading and status update logic for the Alerts admin view.
 *
 * Hides:
 *   - alerts / total / loading / statusFilter / updating state
 *   - fetch (refetches on statusFilter change)
 *   - handleStatusUpdate — marks updating, calls API, then reloads
 */
import { useState } from 'react'
import { adminGetAlerts, adminUpdateAlertStatus } from '../api/client'
import { getErrorMessage } from '../utils/errorUtils'
import { useFetchData } from './useFetchData'

export type AlertStatus = 'open' | 'resolved' | 'fixed' | 'all'

export function useAlertsList() {
  const [statusFilter, setStatusFilter] = useState<AlertStatus>('open')
  const [updating, setUpdating] = useState<number | null>(null)

  const { data, loading, reload: loadAlerts } = useFetchData(
    () => adminGetAlerts(statusFilter),
    [statusFilter],
  )

  const alerts = data?.alerts ?? []
  const total = data?.total_alerts ?? 0

  async function handleStatusUpdate(fileIndex: number, newStatus: string) {
    setUpdating(fileIndex)
    try {
      await adminUpdateAlertStatus(fileIndex, newStatus)
      loadAlerts()
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to update alert'))
    } finally {
      setUpdating(null)
    }
  }

  return { alerts, total, loading, statusFilter, setStatusFilter, updating, handleStatusUpdate }
}
