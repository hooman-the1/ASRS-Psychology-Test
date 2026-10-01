# ASRS browser history, version 1

Issue #57 defines the approved browser storage contract. The feature-local source of truth is
`src/app/asrs/asrs-history.ts`.

- Storage key: `asrs:history`.
- Envelope: `{ "version": 1, "records": [] }`. `records` may contain multiple completed assessments.
- Each record has `id` (a nonempty locally generated ID, unique within the envelope), `submittedAt`
  (UTC ISO 8601), `answers` (18 integers from 0 through 4 in questionnaire order),
  `totalScore` (their sum), `severityCategory` (`minimal`, `mild`, `moderate`, or `severe`),
  and `result`.
- `result` stores the displayed `severityText`, `emoji`, `recommendationText`, and
  six-digit hex `gaugeColor` at submission. `warningText` is `null` in v1. Display
  these saved values for history; do not recalculate historical wording from current constants.
- Score categories use the copied thresholds: 0-17 minimal, 18-27 mild, 28-36 moderate,
  and 37-72 severe.

`createAsrsHistoryRecord` validates a completed answer array, copies it, generates a local
ID and timestamp, and snapshots result values from the current ASRS helpers. Pass existing
record IDs when creating a subsequent record. `isAsrsHistoryV1` validates parsed data,
including field shape, version, unique IDs, timestamps, score/category consistency, and
result snapshot types. A reader should reject invalid data before using it.

`loadAsrsHistory` reads only the `asrs:history` localStorage key. If it is absent, it returns
an empty v1 envelope without writing one. If present, it parses and validates the stored
envelope, then returns its records in stored order with their original result snapshots.
`saveCompletedAsrsAssessment` reads that envelope, creates a record from completed answers,
appends it, and writes the updated envelope. The questionnaire calls it once for a valid
submission before resetting the form. A read or write failure propagates from the storage
helper; the result screen remains usable, while `savedRecord` stays null and
`historySaveError` holds the failure for later recovery UI. User-facing recovery and handling
of malformed or incompatible data belong to #59. An incompatible future shape requires a
new version rather than interpreting it as v1.
