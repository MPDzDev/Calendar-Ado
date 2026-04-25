export const APP_CHANGELOG = {
  fallbackVersion: '0.2.4',
  entries: {
    '0.2.4': {
      title: 'Navigation and Notes UI Refresh',
      summary:
        'The top navigation is now more modern and compact, and the notes tray stays unobtrusive while scaling better for larger note counts.',
      sections: [
        {
          heading: 'What changed',
          items: [
            'Refined the header so the logo, week display, navigation, and minimap feel more modern without adding clutter.',
            'Kept the minimap aligned with the navigation row and reduced the top section height on smaller screens.',
            'Reworked the notes tray into a subtle utility target that expands on hover or click and switches to a popover when many notes are queued.',
            'Raised the notes popover above the calendar so it remains visible when opened.',
          ],
        },
      ],
    },
    '0.2.3': {
      title: 'Single-Instance App Launch',
      summary:
        'Patrak now prevents a second app instance and focuses the existing window instead.',
      sections: [
        {
          heading: 'What changed',
          items: [
            'Added an Electron single-instance lock so launching Patrak again does not open a second copy.',
            'When a second launch is attempted, the existing window is restored and focused instead.',
          ],
        },
      ],
    },
    '0.2.2': {
      title: 'Calendar Past-Week Alignment Fix',
      summary:
        'Past-week navigation now stays aligned across DST boundaries, so older weeks no longer shift and hide Monday entries.',
      sections: [
        {
          heading: 'What changed',
          items: [
            'Week navigation now moves by calendar dates instead of fixed millisecond offsets, which avoids DST drift.',
            'The calendar week container now uses a local date key so older weeks render consistently.',
            'The year minimap now uses DST-safe week indexing to stay aligned with the main calendar.',
          ],
        },
      ],
    },
    '0.2.1': {
      title: 'Safer TimeLog Publish Recovery',
      summary:
        'After an ambiguous TimeLog push failure, the app now blocks further publishing until a TimeLog sync confirms the remote state.',
      sections: [
        {
          heading: 'What changed',
          items: [
            'Ambiguous TimeLog push failures now lock further publishing so users cannot immediately retry and create duplicates.',
            'The push suggestions dialog now shows a clear sync-required state until a successful TimeLog sync clears the lock.',
            'A successful delta sync or full sync now resets the publish lock and allows pushing again.',
          ],
        },
      ],
    },
    '0.2.0': {
      title: 'TimeLog Push Reliability',
      summary:
        'TimeLog pushes no longer retry on API errors, and pasted work item IDs now filter the local work item list correctly.',
      sections: [
        {
          heading: 'What changed',
          items: [
            'Removed automatic retries when creating TimeLog entries because the API can sometimes return an error even after the timelog was created.',
            'Push failures now tell users to run a TimeLog delta sync before retrying because the remote entry may already exist.',
            'Work item search now matches exact pasted work item IDs, including values like 12345 and #12345.',
          ],
        },
      ],
    },
    '0.1.3': {
      title: 'Stacking Toast Test Build',
      summary:
        'Prepared a test build for stacked toast behavior with cleaner no-results search feedback.',
      sections: [
        {
          heading: 'What changed',
          items: [
            'Bumped app version for testing stacked toast behavior in a packaged build.',
            'No-results search feedback now reuses one toast and updates it while typing.',
          ],
        },
      ],
    },
    '0.1.2': {
      title: 'Search Toast Quality',
      summary:
        'Search feedback now reuses a single toast while typing, so users do not get one notification per character.',
      sections: [
        {
          heading: 'What changed',
          items: [
            'When work item search has no matches, the app now updates one existing toast instead of creating a new toast for each keystroke.',
            'The search feedback toast clears automatically when matches appear again or when search is cleared.',
          ],
        },
      ],
    },
    '0.1.1': {
      title: 'Refresh Feedback and Recovery',
      summary:
        'Work item refresh now gives clearer live feedback, better recovery options, and search guidance when results are missing.',
      sections: [
        {
          heading: 'What changed',
          items: [
            'Added stacked bottom-left toasts for loading, success, info, and error states.',
            'Refresh and Full Refresh now show live loading progress while requests run.',
            'When item count does not change, a recovery toast can clear the skip list (blacklist) and rerun a full refresh.',
            'Added undo actions for explicit deletes of work blocks, notes, and todos.',
            'When search returns no work items, the app now explains how to test a numeric work item ID against the skip list.',
          ],
        },
        {
          heading: 'Why some items can be skipped',
          items: [
            'The app keeps a temporary skip list for IDs that previously failed fetch calls, so one failing item does not block the whole refresh.',
            'Common causes include permissions, missing or inaccessible parent links, moved/deleted items, and transient Azure DevOps throttling or timeout errors.',
          ],
        },
        {
          heading: 'Release notes behavior',
          items: [
            'When users skip app versions, release notes are now shown cumulatively for every missed version up to the installed version.',
          ],
        },
      ],
    },
  },
};

function parseVersion(version) {
  const parts = `${version || ''}`
    .trim()
    .split('.')
    .map((part) => Number(part));
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    return null;
  }
  return parts;
}

export function compareChangelogVersions(versionA, versionB) {
  const parsedA = parseVersion(versionA);
  const parsedB = parseVersion(versionB);

  if (parsedA && parsedB) {
    for (let i = 0; i < 3; i += 1) {
      if (parsedA[i] < parsedB[i]) return -1;
      if (parsedA[i] > parsedB[i]) return 1;
    }
    return 0;
  }

  return `${versionA || ''}`.localeCompare(`${versionB || ''}`, undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

export function getPendingChangelogEntries(entries, currentVersion, lastSeenVersion) {
  if (!entries || !currentVersion || !entries[currentVersion]) {
    return [];
  }

  if (!lastSeenVersion) {
    return [{ version: currentVersion, ...entries[currentVersion] }];
  }

  const compareSeenToCurrent = compareChangelogVersions(lastSeenVersion, currentVersion);
  if (compareSeenToCurrent === 0) {
    return [];
  }

  if (compareSeenToCurrent > 0) {
    return [{ version: currentVersion, ...entries[currentVersion] }];
  }

  const pendingVersions = Object.keys(entries)
    .filter((version) => {
      return (
        compareChangelogVersions(version, lastSeenVersion) > 0
        && compareChangelogVersions(version, currentVersion) <= 0
      );
    })
    .sort(compareChangelogVersions);

  if (!pendingVersions.length) {
    return [{ version: currentVersion, ...entries[currentVersion] }];
  }

  return pendingVersions.map((version) => ({
    version,
    ...entries[version],
  }));
}
