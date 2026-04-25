# Changelog

All notable changes to this project are documented in this file.

## [0.2.4] - 2026-04-25

### Changed
- Refined the top navigation UI to feel more modern and compact while keeping the calendar as the main focus.
- Kept the minimap aligned with the navigation row and reduced the vertical cost of the header on smaller screens.
- Reworked the notes tray into a subtle hover/click utility and switched high note counts to a popover.
- Raised the notes popover above the calendar so it remains visible when opened.
- App version bumped to `0.2.4`.

## [0.2.3] - 2026-04-25

### Changed
- Added a single-instance lock so launching Patrak again does not open a second app instance.
- When a second launch is attempted, the existing window is restored and focused instead.
- App version bumped to `0.2.3`.

## [0.2.2] - 2026-04-25

### Changed
- Fixed past-week calendar drift caused by DST-sensitive week navigation.
- Older weeks now keep Monday aligned and populated correctly when moving back through history.
- The year minimap now uses the same DST-safe week indexing as the main calendar.
- App version bumped to `0.2.2`.

## [0.2.1] - 2026-04-25

### Changed
- Ambiguous TimeLog push failures now lock further publishing until a successful TimeLog sync confirms remote state.
- The push suggestions dialog now shows a clear sync-required state instead of allowing immediate re-push attempts.
- Successful delta sync and full sync operations now clear the publish lock so pushing can resume safely.
- App version bumped to `0.2.1`.

## [0.2.0] - 2026-04-25

### Changed
- Removed automatic retries when pushing TimeLog work items because the API can return an error even when the timelog was already created.
- TimeLog push failures now warn users to run a delta sync before retrying because the remote entry may already exist.
- Pasting a work item ID now filters the local work item list by exact ID, including values like `12345` and `#12345`.
- App version bumped to `0.2.0`.

## [0.1.3] - 2026-02-21

### Changed
- Bumped version for stacked-toast test packaging.
- No-results work item search feedback continues to reuse a single toast while typing.
- App version bumped to `0.1.3`.

## [0.1.2] - 2026-02-21

### Changed
- No-results work item search feedback now reuses a single toast and updates its message while typing.
- Search feedback toast is dismissed automatically once matches return or search is cleared.
- App version bumped to `0.1.2`.

## [0.1.1] - 2026-02-21

### Added
- Stacked toast notifications in the bottom-left for loading, info, success, and error feedback.
- Live loading toasts during work item refresh and full refresh operations.
- Recovery action when work item count does not change: clear skip list (blacklist) and retry full refresh.
- Info tooltip content explaining why some work items can be skipped (permissions, missing links, moved/deleted items, transient API failures).
- Undo actions for explicit deletes of work blocks, notes, and todos.
- Search guidance toast when no work items match, including numeric ID checks against the skip list.
- First-run-after-update release notes modal shown once per version.
- Release notes are cumulative when users skip versions (all missed notes are shown on next launch).

### Changed
- App version bumped to `0.1.1`.
