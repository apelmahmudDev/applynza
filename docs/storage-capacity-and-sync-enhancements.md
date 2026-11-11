# Storage capacity and sync enhancements

This document records the current local-storage behavior and the recommended
follow-up work for improving capacity handling in Applynza.

## Current behavior

- Jobs are stored in `browser.storage.local` under `applynza.jobs`.
- The legacy `applypilot.jobs` key is also written for backward compatibility.
- Job saves write the complete jobs array back to storage.
- The Settings page measures storage with `browser.storage.local.getBytesInUse(null)`.
- If `getBytesInUse` is unavailable, the UI estimates usage from a serialized
  storage snapshot.
- The current UI uses a 10 MiB display budget for the usage percentage.
- If storage writes fail, the save operation remains unsuccessful and existing
  data is not intentionally deleted.
- When sync is enabled, local storage remains the first write target. Cloud sync
  does not remove the browser storage quota requirement.

## Important capacity note

The number of jobs that fit is not fixed. Job descriptions, notes, HTML content,
metadata, and duplicated compatibility keys all affect the size. The 10 MiB
budget is a UI estimate for the current Chrome extension target, not a universal
quota guarantee for every browser or future manifest configuration.

## Recommended implementation order

### 1. Detect quota errors explicitly

Add a shared storage-write error classifier around `browser.storage.local.set`.
Recognize quota-related failures without hiding unrelated errors. Show a
specific message such as:

> Local storage is full. Remove unused data or enable sync, then try again.

The message must not claim that enabling sync alone bypasses local quota.

### 2. Add a pre-save capacity check

Before creating or updating a job:

1. Serialize the exact next storage values, including compatibility keys.
2. Measure the projected size.
3. Compare it with the available quota when the browser exposes that API.
4. Keep a safety margin for settings and future writes.
5. Continue to rely on the actual write result because estimates can race with
   other extension contexts.

The check should warn early, but the write must remain the final authority.

### 3. Improve storage reporting

- Show bytes used and a clear percentage.
- Display a warning around a configurable threshold, for example 80%.
- Display a critical state around 95%.
- Avoid presenting the 10 MiB display budget as a guaranteed browser limit.
- Explain that large descriptions and notes consume more space.

### 4. Reduce duplicated local data

The compatibility keys currently duplicate the jobs and settings payloads.
Before changing this, add a backward-compatible migration:

1. Read the primary key first.
2. Fall back to the legacy key only when needed.
3. Write the primary representation.
4. Keep legacy reads during the migration window.
5. Remove duplicate writes only after the supported upgrade path is verified.

Never clear either key automatically without preserving the primary data.

### 5. Compact job payloads safely

Only after measuring real usage, consider reducing stored payload size:

- Keep the fields needed for editing, searching, exporting, and syncing.
- Avoid storing derived display data when it can be recomputed.
- Normalize oversized or redundant HTML only if rendering behavior remains safe.
- Do not silently discard descriptions, notes, URLs, timestamps, or user-entered
  data.

Any compaction should have a migration and a test fixture for old records.

### 6. Keep automatic sync quota-aware

Automatic sync should:

- preserve local data when cloud sync fails;
- surface quota errors instead of retrying them indefinitely;
- continue retrying transient network errors with backoff;
- avoid syncing the same unchanged payload repeatedly;
- keep remote data deletion separate from local “Clear All Data”.

## Verification checklist

Before implementing capacity enhancements, test:

- creating a job near the quota;
- updating a job when the projected payload grows;
- duplicate-job updates;
- storage quota rejection;
- browser APIs unavailable or throwing;
- sync enabled with local quota nearly full;
- legacy `applypilot.*` data migration;
- clearing local data while cloud sync is enabled;
- automatic sync after jobs, settings, and theme changes.

