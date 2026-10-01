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

`loadAsrsHistory` reads only the `asrs:history` localStorage key. It returns a discriminated
result: `{ status: 'available', history }` for a valid v1 envelope or a missing key, and
`{ status: 'unavailable' }` for unreadable storage, malformed JSON, or any invalid record.
For a missing key, `history` is an empty v1 envelope and no key is created. A history view
must show an unavailable state separately from an empty list; it must never show a subset of
an invalid envelope. Valid records retain stored order and original result snapshots.

`saveCompletedAsrsAssessment` saves only when loading returns an available history. It
creates a record from completed answers, appends it, and writes the updated envelope. It
throws on an unavailable history or storage write failure without deleting or resetting raw
data. The questionnaire calls it once before resetting the form and still displays the
computed result when saving fails. Its visible notice states that the assessment was not
saved; the saved record remains null. A later submission can save when storage recovers or
the key is restored to a valid v1 envelope. An incompatible future shape requires a new
version rather than interpreting it as v1.

`deleteAsrsHistoryRecord` re-reads and validates the entire v1 envelope when the user confirms
deletion. It removes only the selected record ID, preserves the remaining records and their
storage order, and reports a missing ID without writing. Unavailable history is left untouched;
a failed write is reported to the view. The history list requires a second confirmation step
showing the selected date, result, and score before calling this operation.

`clearAsrsHistory` requires an explicit all-record confirmation. The history view captures the
validated v1 envelope and shows its record count in Persian. At confirmation, the operation
re-reads and validates storage, compares the full envelope with that snapshot, and writes one
valid empty v1 envelope only when the same nonempty history remains. Changed, empty, unreadable,
malformed, and unsupported histories are left untouched. A failed write is reported to the view.
The action never touches another localStorage key or the active questionnaire and result.
