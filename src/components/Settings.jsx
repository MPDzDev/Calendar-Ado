import React, { useState, useEffect } from 'react';
import PatService from '../services/patService';
import { validateTimeLogSettings } from '../utils/validation';

const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function Settings({
  settings,
  setSettings,
  onExport,
  onImport,
  onFullTimeLogSync,
  timeLogSyncing,
  renderTrigger = null,
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('general');
  const [temp, setTemp] = useState(settings);
  const [newProject, setNewProject] = useState('');
  const [newColor, setNewColor] = useState('#cccccc');
  const [projectItemInputs, setProjectItemInputs] = useState({});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setTemp(settings);
    const initialInputs = {};
    (settings.azureProjects || []).forEach((p) => {
      initialInputs[p] = '';
    });
    setProjectItemInputs(initialInputs);
  }, [settings]);

  const toggleDay = (idx) => {
    const exists = temp.workDays.includes(idx);
    const workDays = exists
      ? temp.workDays.filter((d) => d !== idx)
      : [...temp.workDays, idx].sort();
    setTemp({ ...temp, workDays });
  };

  const save = () => {
    const wantsTimeLog =
      temp.timeLogBaseUrl ||
      temp.timeLogOrgId ||
      temp.timeLogUserId ||
      temp.timeLogApiKey;
    if (wantsTimeLog) {
      const validation = validateTimeLogSettings(temp);
      if (!validation.valid) {
        setErrors(validation.errors);
        setTab('timeLog');
        return;
      }
    }
    setErrors({});
    const patService = new PatService();
    patService.set(temp.azurePat);
    setSettings(temp);
    setOpen(false);
    setNewProject('');
    setNewColor('#cccccc');
  };

  const clearError = (key) => {
    if (!errors[key]) return;
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const addWorkItem = (project) => {
    const value = (projectItemInputs[project] || '').trim();
    if (!value) return;
    setTemp((prev) => {
      const current = prev.projectItems[project] || [];
      if (current.includes(value)) return prev;
      return {
        ...prev,
        projectItems: {
          ...prev.projectItems,
          [project]: [...current, value],
        },
      };
    });
    setProjectItemInputs((prev) => ({ ...prev, [project]: '' }));
  };

  const removeWorkItem = (project, target) => {
    setTemp((prev) => {
      const filtered = (prev.projectItems[project] || []).filter((id) => id !== target);
      return {
        ...prev,
        projectItems: {
          ...prev.projectItems,
          [project]: filtered,
        },
      };
    });
  };

  const openSettings = (initialTab = 'general') => {
    setTab(initialTab);
    setOpen(true);
  };

  const triggerElement =
    typeof renderTrigger === 'function' ? (
      renderTrigger(openSettings)
    ) : (
      <div className="mb-2">
        <button
          className="px-2 py-1 bg-gray-200 dark:bg-gray-700"
          onClick={() => openSettings('general')}
        >
          Settings
        </button>
      </div>
    );

  return (
    <>
      {triggerElement}
      {open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 dark:text-white rounded-2xl shadow-2xl w-[960px] max-w-[95vw] h-[640px] max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-lg font-semibold">Workspace Settings</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Tune your calendar preferences, Azure integrations, and TimeLog options.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="inline-flex rounded-full bg-gray-100 dark:bg-gray-800 p-1">
                  {['general', 'azure', 'timeLog'].map((key) => (
                    <button
                      key={key}
                      onClick={() => setTab(key)}
                      className={`px-4 py-1 text-sm rounded-full transition ${
                        tab === key
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow'
                          : 'text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {key === 'general' && 'General'}
                      {key === 'azure' && 'Azure'}
                      {key === 'timeLog' && 'TimeLog'}
                    </button>
                  ))}
                </div>
                <button
                  className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 text-xl"
                  onClick={() => setOpen(false)}
                >
                  ×
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6 bg-gray-50 dark:bg-gray-900/60">
              {tab === 'general' && (
                <>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm">
                      <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                        Working hours
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { label: 'Start hour', key: 'startHour', min: 0, max: 23 },
                          { label: 'End hour', key: 'endHour', min: 1, max: 24 },
                          { label: 'Lunch start', key: 'lunchStart', min: 0, max: 23 },
                          { label: 'Lunch end', key: 'lunchEnd', min: 1, max: 24 },
                        ].map((field) => (
                          <label key={field.key} className="text-xs text-gray-500 dark:text-gray-400">
                            {field.label}
                            <input
                              type="number"
                              min={field.min}
                              max={field.max}
                              value={temp[field.key]}
                              onChange={(e) =>
                                setTemp({ ...temp, [field.key]: parseInt(e.target.value, 10) })
                              }
                              className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm"
                            />
                          </label>
                        ))}
                        <label className="text-xs text-gray-500 dark:text-gray-400">
                          Block size
                          <select
                            value={temp.blockMinutes}
                            onChange={(e) =>
                              setTemp({ ...temp, blockMinutes: parseInt(e.target.value, 10) })
                            }
                            className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm"
                          >
                            {[10, 15, 30, 60].map((m) => (
                              <option key={m} value={m}>
                                {m === 60 ? '1 h' : `${m} min`}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </div>
                    <div className="space-y-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm">
                      <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                        Preferences
                      </h3>
                      <div className="flex flex-wrap gap-3">
                        {dayNames.map((d, idx) => (
                          <label
                            key={idx}
                            className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer border ${
                              temp.workDays.includes(idx)
                                ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-200'
                                : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={temp.workDays.includes(idx)}
                              onChange={() => toggleDay(idx)}
                            />
                            {d}
                          </label>
                        ))}
                      </div>
                      <div className="space-y-2 text-sm">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={temp.darkMode}
                            onChange={() => setTemp({ ...temp, darkMode: !temp.darkMode })}
                          />
                          <span>Enable dark mode</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={temp.enableReminders}
                            onChange={() =>
                              setTemp({ ...temp, enableReminders: !temp.enableReminders })
                            }
                          />
                          <span>Daily reminders</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </>
              )}
              {tab === 'timeLog' && (
                <>
                  <div>
                    <label className="mr-1">Base URL:</label>
                    <input
                      type="text"
                      value={temp.timeLogBaseUrl}
                      onChange={(e) => {
                        clearError('timeLogBaseUrl');
                        setTemp({ ...temp, timeLogBaseUrl: e.target.value });
                      }}
                      placeholder="https://<function-app>.azurewebsites.net"
                      className="border w-full px-1"
                    />
                    {errors.timeLogBaseUrl && (
                      <div className="text-xs text-red-600">{errors.timeLogBaseUrl}</div>
                    )}
                  </div>
                  <div>
                    <label className="mr-1">Organization ID:</label>
                    <input
                      type="text"
                      value={temp.timeLogOrgId}
                      onChange={(e) => {
                        clearError('timeLogOrgId');
                        setTemp({ ...temp, timeLogOrgId: e.target.value });
                      }}
                      placeholder="00000000-0000-0000-0000-000000000000"
                      className="border w-full px-1"
                    />
                    {errors.timeLogOrgId && (
                      <div className="text-xs text-red-600">{errors.timeLogOrgId}</div>
                    )}
                  </div>
                  <div>
                    <label className="mr-1">User ID:</label>
                    <input
                      type="text"
                      value={temp.timeLogUserId}
                      onChange={(e) => {
                        clearError('timeLogUserId');
                        setTemp({ ...temp, timeLogUserId: e.target.value });
                      }}
                      placeholder="00000000-0000-0000-0000-000000000000"
                      className="border w-full px-1"
                    />
                    {errors.timeLogUserId && (
                      <div className="text-xs text-red-600">{errors.timeLogUserId}</div>
                    )}
                  </div>
                  <div>
                    <label className="mr-1">API Key:</label>
                    <input
                      type="password"
                      value={temp.timeLogApiKey}
                      onChange={(e) => {
                        clearError('timeLogApiKey');
                        setTemp({ ...temp, timeLogApiKey: e.target.value });
                      }}
                      className="border w-full px-1"
                    />
                    {errors.timeLogApiKey && (
                      <div className="text-xs text-red-600">{errors.timeLogApiKey}</div>
                    )}
                  </div>
                  <div>
                    <label className="mr-1">Lookback (days):</label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={temp.timeLogLookbackDays}
                      onChange={(e) => {
                        clearError('timeLogLookbackDays');
                        setTemp({
                          ...temp,
                          timeLogLookbackDays: parseInt(e.target.value, 10) || temp.timeLogLookbackDays,
                        });
                      }}
                      className="border w-24 px-1"
                    />
                    <div className="flex gap-1 mt-1">
                      {[30, 90, 180, 365].map((v) => (
                        <button
                          key={v}
                          type="button"
                          className={`px-2 py-0.5 text-xs border ${
                            temp.timeLogLookbackDays === v ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700'
                          }`}
                          onClick={() => {
                            clearError('timeLogLookbackDays');
                            setTemp({ ...temp, timeLogLookbackDays: v });
                          }}
                        >
                          {v}d
                        </button>
                      ))}
                    </div>
                    {errors.timeLogLookbackDays && (
                      <div className="text-xs text-red-600">{errors.timeLogLookbackDays}</div>
                    )}
                  </div>
                  <div>
                    <label className="mr-1">Page Size:</label>
                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={temp.timeLogPageSize}
                      onChange={(e) => {
                        clearError('timeLogPageSize');
                        setTemp({
                          ...temp,
                          timeLogPageSize: parseInt(e.target.value, 10) || temp.timeLogPageSize,
                        });
                      }}
                      className="border w-24 px-1"
                    />
                    {errors.timeLogPageSize && (
                      <div className="text-xs text-red-600">{errors.timeLogPageSize}</div>
                    )}
                    <p className="text-[11px] text-gray-500 mt-1">
                      Advanced option. Default 100. Increase for fewer requests if needed.
                    </p>
                  </div>
                  <div className="mt-2">
                    <label className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={!!temp.timeLogIncludeBlockNotes}
                        onChange={(e) =>
                          setTemp({
                            ...temp,
                            timeLogIncludeBlockNotes: e.target.checked,
                          })
                        }
                      />
                      <span>Include block notes in TimeLog comments</span>
                    </label>
                    <p className="text-[11px] text-gray-500 mt-1">
                      When enabled, notes from each block in a suggestion are concatenated and sent as the comment.
                    </p>
                  </div>
                  <div className="mt-3">
                    <button
                      className={`w-full px-2 py-1 text-xs rounded ${
                        timeLogSyncing
                          ? 'bg-gray-400 text-white'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                      onClick={() => {
                        if (onFullTimeLogSync) onFullTimeLogSync();
                      }}
                      disabled={timeLogSyncing}
                    >
                      {timeLogSyncing ? 'Syncing...' : 'Full TimeLog Refresh'}
                    </button>
                    <p className="text-[11px] text-gray-500 mt-1">
                      Runs a complete sync using the configured lookback window (maximum 365 days).
                    </p>
                    {settings.timeLogLastSync && (
                      <p className="text-[11px] text-gray-500 mt-1">
                        Last delta sync: {new Date(settings.timeLogLastSync).toLocaleString()}
                      </p>
                    )}
                  </div>
                </>
              )}
              {tab === 'azure' && (
                <>
                  <div>
                    <label className="mr-1">Organization:</label>
                    <input
                      type="text"
                      value={temp.azureOrg}
                      onChange={(e) => setTemp({ ...temp, azureOrg: e.target.value })}
                      className="border w-full px-1"
                    />
                  </div>
                  <div>
                    <label className="mr-1">PAT:</label>
                    <input
                      type="password"
                      value={temp.azurePat}
                      onChange={(e) => setTemp({ ...temp, azurePat: e.target.value })}
                      className="border w-full px-1"
                    />
                  </div>
                  <div>
                    <label className="mr-1">Projects:</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <input
                        type="text"
                        value={newProject}
                        onChange={(e) => setNewProject(e.target.value)}
                        className="border flex-grow px-1 min-w-[8rem]"
                        placeholder="Project name"
                      />
                      <input
                        type="color"
                        value={newColor}
                        onChange={(e) => setNewColor(e.target.value)}
                      />
                      <button
                        className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
                        onClick={() => {
                          const name = newProject.trim();
                          if (name && !temp.azureProjects.includes(name)) {
                            setTemp({
                              ...temp,
                              azureProjects: [...temp.azureProjects, name],
                              projectColors: {
                                ...temp.projectColors,
                                [name]: newColor,
                              },
                              projectItems: {
                                ...temp.projectItems,
                                [name]: [],
                              },
                              timeLogProjectMap: {
                                ...(temp.timeLogProjectMap || {}),
                                [name]: '',
                              },
                            });
                            setProjectItemInputs((prev) => ({ ...prev, [name]: '' }));
                            setNewProject('');
                            setNewColor('#cccccc');
                          }
                        }}
                      >
                        Add
                      </button>
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
                      {temp.azureProjects.length === 0 && (
                        <div className="text-xs text-gray-500 border rounded border-dashed p-2">
                          Add at least one Azure DevOps project to configure colors, project IDs, and
                          allowed work items.
                        </div>
                      )}
                      {temp.azureProjects.map((project) => {
                        const workItems = temp.projectItems[project] || [];
                        const pendingItem = projectItemInputs[project] || '';
                        const projectId = (temp.timeLogProjectMap || {})[project] || '';
                        return (
                          <div
                            key={project}
                            className="border rounded-md p-3 bg-white dark:bg-gray-900/60 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <div className="font-semibold">{project}</div>
                              <button
                                className="text-xs text-red-600"
                                onClick={() => {
                                  setTemp({
                                    ...temp,
                                    azureProjects: temp.azureProjects.filter((p) => p !== project),
                                    projectColors: Object.fromEntries(
                                      Object.entries(temp.projectColors).filter(([key]) => key !== project)
                                    ),
                                    projectItems: Object.fromEntries(
                                      Object.entries(temp.projectItems).filter(([key]) => key !== project)
                                    ),
                                    timeLogProjectMap: Object.fromEntries(
                                      Object.entries(temp.timeLogProjectMap || {}).filter(
                                        ([key]) => key !== project
                                      )
                                    ),
                                  });
                                  setProjectItemInputs((prev) => {
                                    const next = { ...prev };
                                    delete next[project];
                                    return next;
                                  });
                                }}
                              >
                                Remove
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-3 text-xs">
                              <label className="flex items-center gap-1">
                                Color:
                                <input
                                  type="color"
                                  value={temp.projectColors[project] || '#cccccc'}
                                  onChange={(e) =>
                                    setTemp({
                                      ...temp,
                                      projectColors: {
                                        ...temp.projectColors,
                                        [project]: e.target.value,
                                      },
                                    })
                                  }
                                />
                              </label>
                              <label className="flex items-center gap-1">
                                Project ID:
                                <input
                                  type="text"
                                  value={projectId}
                                  onChange={(e) =>
                                    setTemp({
                                      ...temp,
                                      timeLogProjectMap: {
                                        ...(temp.timeLogProjectMap || {}),
                                        [project]: e.target.value,
                                      },
                                    })
                                  }
                                  className="border px-1 py-0.5 text-xs w-40"
                                  placeholder="Azure TimeLog project GUID"
                                />
                              </label>
                            </div>
                            <div>
                              <div className="text-[11px] text-gray-500">Allowed work item IDs</div>
                              <div className="flex gap-1 mt-1">
                                <input
                                  type="text"
                                  value={pendingItem}
                                  onChange={(e) =>
                                    setProjectItemInputs((prev) => ({
                                      ...prev,
                                      [project]: e.target.value,
                                    }))
                                  }
                                  className="border flex-grow px-1 text-xs"
                                  placeholder="Add ID"
                                />
                                <button
                                  className="px-2 text-xs bg-blue-500 text-white rounded"
                                  onClick={() => addWorkItem(project)}
                                >
                                  Add
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {workItems.length === 0 && (
                                  <span className="text-[11px] text-gray-500">
                                    No restrictions configured.
                                  </span>
                                )}
                                {workItems.map((item) => (
                                  <span
                                    key={item}
                                    className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full text-[11px]"
                                  >
                                    {item}
                                    <button
                                      className="text-red-600"
                                      onClick={() => removeWorkItem(project, item)}
                                      title="Remove"
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="mr-1">Tags:</label>
                    <input
                      type="text"
                      value={temp.azureTags.join(', ')}
                      onChange={(e) =>
                        setTemp({
                          ...temp,
                          azureTags: e.target.value
                            .split(',')
                            .map((t) => t.trim())
                            .filter((t) => t),
                        })
                      }
                      className="border w-full px-1"
                    />
                  </div>
                  <div>
                    <label className="mr-1">Area Path:</label>
                    <input
                      type="text"
                      value={temp.azureArea}
                      onChange={(e) =>
                        setTemp({ ...temp, azureArea: e.target.value })
                      }
                      className="border w-full px-1"
                    />
                  </div>
                  <div>
                    <label className="mr-1">Iteration Path:</label>
                    <input
                      type="text"
                      value={temp.azureIteration}
                      onChange={(e) =>
                        setTemp({ ...temp, azureIteration: e.target.value })
                      }
                      className="border w-full px-1"
                    />
                  </div>
                  <div>
                    <label className="mr-1">State Order:</label>
                    <input
                      type="text"
                      value={temp.stateOrder.join(', ')}
                      onChange={(e) =>
                        setTemp({
                          ...temp,
                          stateOrder: e.target.value
                            .split(',')
                            .map((s) => s.trim())
                            .filter((s) => s),
                        })
                      }
                    className="border w-full px-1"
                  />
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <label className="flex items-center space-x-1">
                    <input
                      type="checkbox"
                      checked={temp.enableDevOpsReview}
                      onChange={() =>
                        setTemp({
                          ...temp,
                          enableDevOpsReview: !temp.enableDevOpsReview,
                        })
                      }
                    />
                    <span>Enable DevOps Review</span>
                  </label>
                </div>
              </>
            )}
              <div className="flex space-x-2 pt-2">
                <button className="px-2 py-1 bg-blue-500 text-white text-xs" onClick={save}>
                  Save
                </button>
                <button
                  className="px-2 py-1 bg-gray-300 dark:bg-gray-600 text-xs"
                  onClick={() => {
                    setTemp(settings);
                    setOpen(false);
                    setNewProject('');
                    setNewColor('#cccccc');
                  }}
                >
                  Cancel
                </button>
              </div>
              <div className="flex space-x-2 pt-2">
                <button
                  className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-xs"
                  onClick={onExport}
                >
                  Export Data
                </button>
                <button
                  className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-xs"
                  onClick={onImport}
                >
                  Import Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

