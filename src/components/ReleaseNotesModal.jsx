import React from 'react';

export default function ReleaseNotesModal({ release, onClose }) {
  if (!release) return null;

  const releases = Array.isArray(release.releases)
    ? release.releases
    : [release];
  const latestVersion = release.version || releases[releases.length - 1]?.version || '';
  const previousVersion = `${release.fromVersion || ''}`.trim();
  const showCumulativeBanner = releases.length > 1;

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <div className="w-[760px] max-w-[96vw] max-h-[88vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-blue-700 dark:text-blue-300">
              Updated to v{latestVersion}
            </p>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
              {releases.length > 1 ? 'What changed across your skipped updates' : (release.title || 'What is new')}
            </h2>
            {releases.length === 1 && release.summary && (
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {release.summary}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="Close release notes"
          >
            x
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {showCumulativeBanner && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/80 px-3 py-2 text-sm text-blue-900 dark:border-blue-500/40 dark:bg-blue-950/30 dark:text-blue-100">
              {previousVersion
                ? `These notes include all updates since v${previousVersion}.`
                : 'These notes include all currently available updates for this build.'}
            </div>
          )}

          {releases.map((entry, entryIndex) => {
            const sections = Array.isArray(entry.sections) ? entry.sections : [];
            return (
              <div
                key={`${entry.version || 'release'}-${entryIndex}`}
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/60"
              >
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  v{entry.version}{entry.title ? ` - ${entry.title}` : ''}
                </h3>
                {entry.summary && (
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {entry.summary}
                  </p>
                )}

                <div className="mt-3 space-y-3">
                  {sections.map((section, sectionIndex) => (
                    <div key={`${entry.version || 'release'}-${sectionIndex}`}>
                      {section.heading && (
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                          {section.heading}
                        </h4>
                      )}
                      <ul className="mt-1.5 space-y-1.5 text-sm text-slate-700 dark:text-slate-200">
                        {(section.items || []).map((item, itemIndex) => (
                          <li key={`${entry.version || 'release'}-${sectionIndex}-${itemIndex}`} className="flex gap-2">
                            <span aria-hidden="true">-</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
