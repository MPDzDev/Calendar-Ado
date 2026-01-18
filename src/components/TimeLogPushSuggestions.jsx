import React, { useState } from 'react';

const formatMinutes = (minutes = 0) => {
  const safeMinutes = Number.isFinite(minutes) ? minutes : 0;
  if (safeMinutes >= 60) {
    return `${(safeMinutes / 60).toFixed(2)}h (${safeMinutes}m)`;
  }
  return `${safeMinutes}m`;
};

export default function TimeLogPushSuggestions({
  suggestions = [],
  onClose,
  onCreateEntry,
  onCreateAll,
  statusMap = {},
  metadata = {},
  errorMessage = '',
  buildPayload,
}) {
  const [previewState, setPreviewState] = useState({ text: '', sourceId: null });
  const hasSuggestions = Array.isArray(suggestions) && suggestions.length > 0;
  const hasCreateHandler = typeof onCreateEntry === 'function';
  const metadataMissing = !metadata?.userName || !metadata?.userId;
  const projectEntries = Object.entries(metadata?.projectMap || {});

  const buildStatus = (suggestionId) => {
    const status = statusMap?.[suggestionId];
    return status || { state: 'idle' };
  };

  const getPayloadInfo = (suggestion) => {
    if (typeof buildPayload !== 'function') {
      return { payload: null, error: 'Payload builder unavailable.' };
    }
    try {
      const result = buildPayload(suggestion);
      if (!result || !result.payload) {
        return {
          payload: null,
          error: result?.error || 'Suggestion is not ready to publish.',
        };
      }
      return { payload: result.payload, error: null };
    } catch (err) {
      return { payload: null, error: err.message || 'Unable to build payload.' };
    }
  };

  const details = suggestions.map((suggestion) => {
    const payloadInfo = getPayloadInfo(suggestion);
    const status = buildStatus(suggestion.id);
    const ready =
      hasCreateHandler &&
      payloadInfo.payload &&
      status.state !== 'creating' &&
      status.state !== 'success';
    return { suggestion, payloadInfo, status, ready };
  });

  const readyCount = details.filter((detail) => detail.ready).length;
  const pushAllDisabled =
    typeof onCreateAll !== 'function' || readyCount === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 px-4">
      <div className="w-full max-w-3xl rounded-lg bg-white p-5 shadow-2xl dark:bg-gray-900 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Suggested TimeLog Creations</h3>
          <div className="flex items-center gap-2">
            {typeof onCreateAll === 'function' && (
              <button
                className={`rounded px-3 py-1 text-sm ${
                  pushAllDisabled
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
                disabled={pushAllDisabled}
                onClick={() => !pushAllDisabled && onCreateAll()}
              >
                {readyCount > 0 ? `Push All (${readyCount})` : 'Push All'}
              </button>
            )}
            <button
              className="rounded px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:text-gray-100"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          These groups combine the unsynced local blocks by day and work item. Use the Show Preview
          button on any group to inspect the exact JSON payload, then push individual entries or publish
          all ready groups at once.
        </p>
        <div className="rounded-md bg-blue-50 dark:bg-blue-900/40 px-3 py-2 text-[11px] text-blue-700 dark:text-blue-200 space-y-1">
          <div>
            Entries will post as <strong>{metadata?.userName || 'Unknown User'}</strong> (
            {metadata?.userId || 'missing userId'}). These values update automatically during TimeLog
            syncs.
          </div>
          <div>
            {projectEntries.length > 0 ? (
              <>
                <span>Known project IDs:</span>
                <ul className="ml-3 list-disc">
                  {projectEntries.map(([name, id]) => (
                    <li key={name}>
                      <strong>{name}</strong>: {id}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <span>No project IDs learned yet. Sync after logging time remotely to capture them.</span>
            )}
          </div>
        </div>
        {metadataMissing && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/40 dark:border-red-800">
            Missing user metadata. Run a TimeLog sync so the app can capture your user identity.
          </div>
        )}
        {errorMessage && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/40 dark:border-red-800">
            {errorMessage}
          </div>
        )}
        <div className="max-h-96 overflow-y-auto space-y-3">
          {!hasSuggestions && (
            <div className="rounded-md border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700">
              No local changes require publishing for this week.
            </div>
          )}
          {hasSuggestions &&
            details.map(({ suggestion, payloadInfo, status, ready }) => {
              const previewText = payloadInfo.payload
                ? JSON.stringify(payloadInfo.payload, null, 2)
                : payloadInfo.error || 'Payload unavailable.';
              const isPreviewing = previewState.sourceId === suggestion.id;
              return (
                <div
                  key={suggestion.id}
                  className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-700 dark:bg-gray-800/70 space-y-2"
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
                  {suggestion.projectName && (
                    <div className="text-xs text-gray-500">
                      Project: {suggestion.projectName}
                    </div>
                  )}
                  <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                    Total: {formatMinutes(suggestion.minutes)} across {suggestion.blocks.length}{' '}
                    block{suggestion.blocks.length === 1 ? '' : 's'}
                  </div>
                  {!payloadInfo.payload && payloadInfo.error && (
                    <div className="text-xs text-red-600">{payloadInfo.error}</div>
                  )}
                  <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-200">
                    {suggestion.blocks.map((block) => (
                      <li
                        key={block.id}
                        className="flex items-center justify-between rounded bg-white/70 px-2 py-1 dark:bg-gray-900/50"
                      >
                        <span className="pr-2">{block.note || 'No note provided'}</span>
                        <span className="font-mono text-[11px]">
                          {formatMinutes(block.minutes)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-2">
                    <button
                      className={`flex-1 rounded px-3 py-1 text-xs font-semibold ${
                        payloadInfo.payload
                          ? 'bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                      disabled={!payloadInfo.payload}
                      onClick={() =>
                        payloadInfo.payload &&
                        setPreviewState({ text: previewText, sourceId: suggestion.id })
                      }
                    >
                      {isPreviewing ? 'Previewing' : 'Show Preview'}
                    </button>
                    <button
                      className={`flex-1 rounded px-3 py-1 text-xs font-semibold ${
                        status.state === 'success'
                          ? 'bg-green-600 text-white'
                          : ready
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                      }`}
                      disabled={!ready}
                      onClick={() => ready && onCreateEntry(suggestion)}
                    >
                      {status.state === 'creating'
                        ? 'Creating...'
                        : status.state === 'success'
                        ? 'Created'
                        : 'Create TimeLog'}
                    </button>
                  </div>
                  {status.state === 'error' && status.message && (
                    <div className="text-xs text-red-600">{status.message}</div>
                  )}
                  {status.state === 'success' && (
                    <div className="text-xs text-green-600">
                      Entry created. Run a Delta Sync to pull the remote confirmation.
                    </div>
                  )}
                </div>
              );
            })}
        </div>
        <div className="rounded border border-gray-200 bg-gray-50 p-2 text-xs dark:border-gray-700 dark:bg-gray-800">
          <div className="font-semibold text-[11px] mb-1 text-gray-700 dark:text-gray-200">
            Payload Preview
          </div>
          <pre className="max-h-32 overflow-y-auto whitespace-pre-wrap break-all text-[11px] text-gray-800 dark:text-gray-100">
            {previewState.text || 'Use the Show Preview buttons above to view the JSON payload that will be sent.'}
          </pre>
        </div>
        <div className="text-xs text-gray-500">
          After creating entries, run a TimeLog delta sync to import the remote IDs and mark local blocks
          as synced.
        </div>
      </div>
    </div>
  );
}
