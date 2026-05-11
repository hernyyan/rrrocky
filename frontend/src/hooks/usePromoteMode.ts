/**
 * usePromoteMode — manages the multi-select promote/demote workflow for TemplateTreeEditor.
 *
 * "Promote" = convert an IND row into a SUM by selecting sibling rows as its children.
 * "Demote"  = convert a SUM back to IND, clearing its children and removing it from the waterfall.
 *
 * Hides: promoteMode state, all tree-mutation helpers (buildMap, cloneRows, setNodeType),
 * sibling-reordering logic in confirmPromote, and waterfall mutation for IS.
 *
 * Caller receives: promoteMode (for row-level highlight/selection styling),
 * promoteParentLabel (for the banner), and the four action handlers.
 */
import { useState } from 'react'
import type { Layer1TemplateRow, WaterfallStep } from '../types'

// ── Tree helpers (private) ────────────────────────────────────────────────────

function buildMap(rows: Layer1TemplateRow[]): Map<number, Layer1TemplateRow> {
  const map = new Map<number, Layer1TemplateRow>()
  function walk(rs: Layer1TemplateRow[]) {
    for (const r of rs) { map.set(r.id, r); walk(r.children) }
  }
  walk(rows)
  return map
}

function cloneRows(rows: Layer1TemplateRow[]): Layer1TemplateRow[] {
  return rows.map(r => ({ ...r, children: cloneRows(r.children) }))
}

function setNodeType(rows: Layer1TemplateRow[], id: number, type: Layer1TemplateRow['type']): Layer1TemplateRow[] {
  return rows.map(r => {
    if (r.id === id) return { ...r, type, children: type === 'individual' ? [] : r.children }
    return { ...r, children: setNodeType(r.children, id, type) }
  })
}

// ── Hook ──────────────────────────────────────────────────────────────────────

interface UsePromoteModeOptions {
  rows: Layer1TemplateRow[]
  waterfall: WaterfallStep[] | null
  isIS: boolean
  onChange: (rows: Layer1TemplateRow[], waterfall: WaterfallStep[] | null) => void
  onNotify: (msg: string) => void
}

type PromoteMode = { parentId: number; selected: Set<number> } | null

export function usePromoteMode({ rows, waterfall, isIS, onChange, onNotify }: UsePromoteModeOptions) {
  const [promoteMode, setPromoteMode] = useState<PromoteMode>(null)

  // Derive label from current rows so the banner always reflects latest state
  const promoteParentLabel = promoteMode
    ? (buildMap(rows).get(promoteMode.parentId)?.label ?? '')
    : ''

  function handleBadgeClick(row: Layer1TemplateRow) {
    if (promoteMode) return

    if (row.type === 'sum') {
      const hadChildren = row.children.length > 0
      const newRows = setNodeType(cloneRows(rows), row.id, 'individual')
      const newWaterfall = isIS && waterfall
        ? waterfall.filter(w => w.row_id !== row.id)
        : waterfall
      onChange(newRows, newWaterfall)
      if (hadChildren) {
        onNotify(`"${row.label}" demoted to IND — ${row.children.length} child(ren) removed from tree and waterfall.`)
      }
      return
    }

    if (row.type === 'individual') {
      setPromoteMode({ parentId: row.id, selected: new Set() })
    }
  }

  function togglePromoteChild(id: number) {
    if (!promoteMode) return
    const next = new Set(promoteMode.selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setPromoteMode({ ...promoteMode, selected: next })
  }

  function confirmPromote() {
    if (!promoteMode) return
    const { parentId, selected } = promoteMode

    const newRows = cloneRows(rows)
    const nodeMap = buildMap(newRows)
    const parent = nodeMap.get(parentId)
    if (!parent) { setPromoteMode(null); return }

    const selectedNodes = [...selected]
      .map(id => nodeMap.get(id))
      .filter((r): r is Layer1TemplateRow => !!r)

    const updatedParent: Layer1TemplateRow = { ...parent, type: 'sum', children: selectedNodes }

    function replaceNode(rs: Layer1TemplateRow[]): Layer1TemplateRow[] {
      return rs
        .map(r => {
          if (r.id === parentId) return updatedParent
          return { ...r, children: replaceNode(r.children.filter(c => !selected.has(c.id))) }
        })
        .filter(r => !selected.has(r.id) || r.id === parentId)
    }

    const finalRows = replaceNode(newRows)
    const newWaterfall = isIS && waterfall
      ? [...waterfall, { row_id: parentId, label: parent.label, operator: '+' as const }]
      : waterfall

    onChange(finalRows, newWaterfall)
    setPromoteMode(null)
    onNotify(`"${parent.label}" promoted to SUM with ${selected.size} child(ren).`)
  }

  function cancelPromote() {
    setPromoteMode(null)
  }

  return {
    promoteMode,
    promoteParentLabel,
    handleBadgeClick,
    togglePromoteChild,
    confirmPromote,
    cancelPromote,
  }
}
