/**
 * @deprecated All functions and types have moved to src/api/client.ts.
 * This file is kept as a compatibility shim and will be removed once all
 * import sites are confirmed updated.
 */
export type {
  AdminCompany,
  AdminCompanyContext,
  WriteRuleResult,
  CompanyPeriodData,
  AdminCorrection,
  AdminReview,
} from '../../api/client'

export {
  adminGetCompanies,
  adminGetCompanyContext,
  adminUpdateCompanyContext,
  adminWriteRule,
  adminGetCompanyData,
  adminGetCompanyCorrections,
  adminRenameCompany,
  adminCreateCompany,
  adminDeleteCompany,
  adminGetReviews,
  adminExportReviewUrl,
  adminDeleteReview,
  adminGetGeneralFixes,
  adminGetChangelog,
  adminGetAlerts,
  adminUpdateAlertStatus,
} from '../../api/client'
