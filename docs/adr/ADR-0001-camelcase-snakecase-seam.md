# ADR-0001: camelCase / snake_case seam lives in `api/client.ts`

**Status:** Accepted  
**Date:** 2026-05-06

---

## Context

The frontend (React/TypeScript) uses camelCase naming throughout — `sessionId`, `fieldName`, `companyName`, `statementType`. The backend (FastAPI/Python) uses snake_case — `session_id`, `field_name`, `company_name`, `statement_type`.

JSON serialization is the natural bridge: FastAPI's `response_model` serializes Pydantic models to snake_case by default; JavaScript's `JSON.parse` preserves whatever case arrives. No explicit transformation layer exists.

This creates two distinct naming zones:

| Zone | Convention | Example |
|------|------------|---------|
| API payloads (request/response bodies) | snake_case | `session_id`, `layer1_data` |
| WizardState + frontend React state | camelCase | `sessionId`, `layer1Results` |

---

## Decision

**The seam is `frontend/src/api/client.ts`.** All implicit key-name mapping happens at this boundary. No explicit transformation middleware is introduced.

Rules that follow:
1. Types used in API *payloads* (request/response interfaces in `client.ts`) must use **snake_case** field names to match FastAPI's serialization.
2. Types used in *WizardState* and React component state must use **camelCase**.
3. When adding a new API function to `client.ts`, the request body object literal uses snake_case keys; the response type interface uses the case that matches what the backend actually serializes.

---

## Where the seam is visible today

- `Layer2Request` (sent from frontend): snake_case keys (`session_id`, `statement_type`, `layer1_data`) — matches backend Pydantic model directly.
- `Layer1Result` (stored in WizardState): camelCase keys (`lineItems`, `sourceScaling`, `columnIdentified`, `sourceSheet`) — mapped from the backend's snake_case response by React state assignment in `useWizardState`.
- `ContinuedReview` response: mixed — top-level keys are snake_case (`session_id`, `company_name`) because they come straight from the backend JSON; nested `layer1_data` / `layer2_data` are also snake_case.
- `StatementTabConfig` payload: camelCase (`tabs`, `fieldAssignments`) — matches the backend JSON field directly because FastAPI was configured to accept camelCase for this endpoint.

---

## Consequences

- **Good:** No runtime transformation cost. No risk of transformation bugs. Minimal boilerplate.
- **Good:** The seam is in one file — any developer modifying `client.ts` sees the convention immediately.
- **Trade-off:** The two naming zones are not enforced by the type system. A developer could accidentally define a WizardState field in snake_case or an API payload field in camelCase without a compile error.
- **Trade-off:** `ContinuedReview` and similar response types that are passed directly into WizardState require careful mapping at the call site (in `useWizardState.ts`) rather than at the client boundary.

---

## What NOT to do

- Do not add a global `toCamelCase` / `toSnakeCase` transformer to `handleResponse`. This would couple every API call to a transformation that only some fields need.
- Do not add FastAPI `alias_generator` to auto-camelCase responses — this creates a hidden secondary seam on the backend that future developers won't expect.
- Do not change `Layer2Request` to camelCase to "match the frontend" — it would require a backend schema change and break the existing seam contract.
