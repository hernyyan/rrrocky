/**
 * correctionMeta — canonical metadata for the three CorrectionTag values.
 *
 * Single source of truth for tag display labels and descriptions.
 * Import instead of redefining TAG_OPTIONS inline per component.
 */
import type { CorrectionTag } from '../types'

export interface CorrectionTagOption {
  value: CorrectionTag
  label: string
  description: string
}

export const CORRECTION_TAG_OPTIONS: CorrectionTagOption[] = [
  {
    value: 'one_off_error',
    label: 'One-off Error',
    description: 'Isolated mistake, no further action',
  },
  {
    value: 'company_specific',
    label: 'Company-specific',
    description: 'Pattern unique to this company, saved for future',
  },
  {
    value: 'general_fix',
    label: 'General Fix',
    description: 'Systematic issue, logged for review',
  },
]
