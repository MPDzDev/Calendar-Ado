import React from 'react';

const formatMinutes = (minutes = 0) => {
  const safeMinutes = Number.isFinite(minutes) ? minutes : 0;
  if (safeMinutes >= 60) {
    return `${(safeMinutes / 60).toFixed(2)}h (${safeMinutes}m)`;
  }
  return `${safeMinutes}m`;
};

export default function TimeLogPushSuggestions({ suggestions = [], onClose }) {
  const hasSuggestions = Array.isArray(suggestions) && suggestions.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 px-4">
      <div className="w-full max-w-3xl rounded-lg bg-white p-5 shadow-2xl dark:bg-gray-900 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Suggested TimeLog Creations</h3>
          <button
            className="rounded px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:text-gray-100"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          These groups combine the unsynced local blocks by day and work item. Publishing back to Azure
          DevOps is not available yet, but you can review what would be created.
        </p>
        <div className="max-h-96 overflow-y-auto space-y-3">
          {!hasSuggestions && (
            <div className="rounded-md border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700">
              No local changes require publishing for this week.
            </div>
          )}
          {hasSuggestions &&
            suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-700 dark:bg-gray-800/70"
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold">
                    {suggestion.workItemTitle || 'Unassigned'}
                  </div>
                  <div className="text-xs text-gray-500">{suggestion.dayLabel}</div>
                </div>
                {suggestion.workItemId && (
                  <div className="text-xs text-gray-500">
                    Work Item #{suggestion.workItemId}
                  </div>
                )}
                <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                  Total: {formatMinutes(suggestion.minutes)} across {suggestion.blocks.length}{' '}
                  block{suggestion.blocks.length === 1 ? '' : 's'}
                </div>
                <ul className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-200">
                  {suggestion.blocks.map((block) => (
                    <li
                      key={block.id}
                      className="flex items-center justify-between rounded bg-white/70 px-2 py-1 dark:bg-gray-900/50"
                    >
                      <span className="pr-2">{block.note || 'No note provided'}</span>
                      <span className="font-mono text-[11px]">{formatMinutes(block.minutes)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
        <div className="text-xs text-gray-500">
          Future updates will let you confirm and push these grouped entries directly.
        </div>
      </div>
    </div>
  );
}
