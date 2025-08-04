# UI Improvement Tasks

Based on recent design feedback, here are prioritized tasks for refreshing the application's look and feel and improving usability.

## High Priority
- **Establish visual hierarchy**
  - Adopt a modern sans–serif font (e.g., Inter or Roboto).
  - Increase spacing around calendar blocks and the side panel.
  - Replace hard borders with subtle shadows or contrasting backgrounds.
  - Introduce icons to represent work item categories.
  - Provide hover states on calendar blocks with quick actions (edit, duplicate, delete).
- **Revise color palette and layout**
  - Swap bright yellows/blues for muted or pastel tones.
  - Use CSS grid or flexbox for a responsive layout with consistent column alignment.
- **Improve Time Summoning UI**
  - When a day is locked or a previous context is loaded, display a sliding panel from above with time data.
  - Group time entries by area rather than presenting an hour‑by‑hour breakdown.
- **Fix lunch splitting bug**
  - When a block spans the lunch period, splitting should create two separate work blocks in distinct sections rather than only a visual split.

## Medium Priority
- **Improve work item panel**
  - Collapsible or modal-based filters with multi‑select dropdowns.
  - Live search that updates the list as the user types.
  - Group items by status with collapsible sections.
- **Submission workflow**
  - Exclude locked days when submitting instead of a "Review Week" modal.
  - Progress bar hover details showing hour breakdown.
  - Confirmation toast after submission.
- **Support splitting across blocks**
  - Allow splitting a dragged block when it overlaps any locked period, not just lunch.

## Low Priority
- **Controls and settings**
  - Use a gear icon and modal for settings.
  - Sticky top bar for quick week selection and settings access.
  - Optional dark mode toggle.
  - Drag‑and‑drop calendar block rearranging and keyboard shortcuts.
  - Ensure layout adapts well on tablets.
- **Refactor refresh button**
  - Change the refresh logic to fetch only the most recently updated work items to avoid overwhelming the UI.

These tasks can be implemented incrementally to modernize the interface and streamline user workflows.
