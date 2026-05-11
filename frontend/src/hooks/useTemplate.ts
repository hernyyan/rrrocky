/**
 * useTemplate — shared template fetch with module-level deduplication.
 *
 * Both Step 2 and Step 3 need the TemplateResponse. Without this hook each
 * independently issued a fetch, held duplicate state, and repeated the same
 * fallback-section logic. The module-level promise ensures at most one HTTP
 * request per session regardless of how many consumers mount.
 */
import { useEffect, useState } from 'react'
import { getTemplate } from '../api/client'
import { IS_TEMPLATE_FIELDS, BS_TEMPLATE_FIELDS } from '../utils/templateFields'
import type { TemplateResponse, TemplateSection } from '../types'

// Resolved once and shared across all hook instances.
let _templatePromise: Promise<TemplateResponse | null> | null = null
function getTemplateOnce(): Promise<TemplateResponse | null> {
  if (!_templatePromise) {
    _templatePromise = getTemplate().catch(() => null)
  }
  return _templatePromise
}

const FALLBACK_IS: TemplateSection[] = [{ header: null, fields: IS_TEMPLATE_FIELDS }]
const FALLBACK_BS: TemplateSection[] = [{ header: null, fields: BS_TEMPLATE_FIELDS }]

export interface UseTemplateResult {
  template: TemplateResponse | null
  isSections: TemplateSection[]
  bsSections: TemplateSection[]
  cfsSections: TemplateSection[]
}

export function useTemplate(): UseTemplateResult {
  const [template, setTemplate] = useState<TemplateResponse | null>(null)

  useEffect(() => {
    getTemplateOnce().then(setTemplate)
  }, [])

  return {
    template,
    isSections: template?.income_statement.sections ?? FALLBACK_IS,
    bsSections: template?.balance_sheet.sections ?? FALLBACK_BS,
    cfsSections: template?.cash_flow_statement?.sections ?? [],
  }
}
