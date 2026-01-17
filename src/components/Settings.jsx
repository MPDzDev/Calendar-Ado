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
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('general');
  const [temp, setTemp] = useState(settings);
  const [newProject, setNewProject] = useState('');
  const [newColor, setNewColor] = useState('#cccccc');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setTemp(settings);
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

  return (
    <div className="mb-2">
      <button
        className="px-2 py-1 bg-gray-200 dark:bg-gray-700"
        onClick={() => {
          setTab('general');
          setOpen(true);
        }}
      >
        Settings
      </button>
      {open && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="border p-4 bg-yellow-50 dark:bg-gray-800 dark:text-white space-y-2 shadow-lg w-80">
            <div className="flex mb-2 space-x-2">
              <button
                className={`px-2 py-1 text-sm ${
                  tab === 'general' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'
                }`}
                onClick={() => setTab('general')}
              >
                General
              </button>
              <button
                className={`px-2 py-1 text-sm ${
                  tab === 'azure' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'
                }`}
                onClick={() => setTab('azure')}
              >
                Azure DevOps
              </button>
              <button
                className={`px-2 py-1 text-sm ${
                  tab === 'timeLog' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'
                }`}
                onClick={() => setTab('timeLog')}
              >
                TimeLog
              </button>
            </div>
              {tab === 'general' && (
                <>
                  <div>
                    <label className="mr-1">Start hour:</label>
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={temp.startHour}
                      onChange={(e) =>
                        setTemp({ ...temp, startHour: parseInt(e.target.value) })
                      }
                      className="border w-16"
                    />
                  </div>
                  <div>
                    <label className="mr-1">End hour:</label>
                    <input
                      type="number"
                      min="1"
                      max="24"
                      value={temp.endHour}
                      onChange={(e) =>
                        setTemp({ ...temp, endHour: parseInt(e.target.value) })
                      }
                      className="border w-16"
                    />
                  </div>
                  <div>
                    <label className="mr-1">Lunch start:</label>
              <input
                type="number"
                min="0"
                max="23"
                value={temp.lunchStart}
                onChange={(e) =>
                  setTemp({ ...temp, lunchStart: parseInt(e.target.value) })
                }
                className="border w-16"
              />
                  </div>
                  <div>
                    <label className="mr-1">Lunch end:</label>
              <input
                type="number"
                min="1"
                max="24"
                value={temp.lunchEnd}
                onChange={(e) =>
                  setTemp({ ...temp, lunchEnd: parseInt(e.target.value) })
                }
                className="border w-16"
              />
                  </div>
                  <div>
                    <label className="mr-1">Block size:</label>
              <select
                value={temp.blockMinutes}
                onChange={(e) =>
                  setTemp({ ...temp, blockMinutes: parseInt(e.target.value) })
                }
                className="border"
              >
                {[10, 15, 30, 60].map((m) => (
                  <option key={m} value={m}>
                    {m === 60 ? '1 h' : `${m} min`}
                  </option>
                ))}
              </select>
                  </div>
                  <div>
                    <div className="mb-1">Work days:</div>
              <div className="flex space-x-2 flex-wrap">
                {dayNames.map((d, idx) => (
                  <label key={idx} className="flex items-center space-x-1">
                    <input
                      type="checkbox"
                      checked={temp.workDays.includes(idx)}
                      onChange={() => toggleDay(idx)}
                    />
                    <span>{d}</span>
                  </label>
                ))}
              </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="flex items-center space-x-1">
                      <input
                        type="checkbox"
                        checked={temp.darkMode}
                        onChange={() => setTemp({ ...temp, darkMode: !temp.darkMode })}
                      />
                      <span>Dark mode</span>
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="flex items-center space-x-1">
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
                    <div className="flex mb-1">
                      <input
                        type="text"
                        value={newProject}
                        onChange={(e) => setNewProject(e.target.value)}
                        className="border flex-grow px-1"
                      />
                      <input
                        type="color"
                        value={newColor}
                        onChange={(e) => setNewColor(e.target.value)}
                        className="ml-1"
                      />
                      <button
                        className="ml-1 px-2 bg-blue-500 text-white"
                        onClick={() => {
                          const name = newProject.trim();
                          if (name) {
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
                            });
                            setNewProject('');
                            setNewColor('#cccccc');
                          }
                        }}
                      >
                        +
                      </button>
                    </div>
                    <ul className="space-y-1">
                      {temp.azureProjects.map((p, idx) => (
                        <li key={idx} className="flex items-center justify-between border px-1">
                          <span>{p}</span>
                          <input
                            type="color"
                            value={temp.projectColors[p] || '#cccccc'}
                            onChange={(e) =>
                              setTemp({
                                ...temp,
                                projectColors: {
                                  ...temp.projectColors,
                                  [p]: e.target.value,
                                },
                              })
                            }
                            className="mx-1"
                          />
                          <input
                            type="text"
                            placeholder="IDs"
                            value={(temp.projectItems[p] || []).join(', ')}
                            onChange={(e) =>
                              setTemp({
                                ...temp,
                                projectItems: {
                                  ...temp.projectItems,
                                  [p]: e.target.value
                                    .split(',')
                                    .map((id) => id.trim())
                                    .filter((id) => id),
                                },
                              })
                            }
                            className="border flex-grow px-1 text-xs mx-1"
                          />
                          <button
                            className="text-xs text-red-600"
                            onClick={() =>
                              setTemp({
                                ...temp,
                                azureProjects: temp.azureProjects.filter((_, i) => i !== idx),
                                projectColors: Object.fromEntries(
                                  Object.entries(temp.projectColors).filter(([key]) => key !== p)
                                ),
                                projectItems: Object.fromEntries(
                                  Object.entries(temp.projectItems).filter(([key]) => key !== p)
                                ),
                              })
                            }
                          >
                            x
                          </button>
                        </li>
                      ))}
                    </ul>
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
        )}
      </div>
    );
}

