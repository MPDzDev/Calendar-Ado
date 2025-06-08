import React, { useState, useEffect } from 'react';
import PatService from '../services/patService';

const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function Settings({ settings, setSettings }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('general');
  const [temp, setTemp] = useState(settings);
  const [newProject, setNewProject] = useState('');
  const [newColor, setNewColor] = useState('#cccccc');

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
    const patService = new PatService();
    patService.set(temp.azurePat);
    setSettings(temp);
    setOpen(false);
    setNewProject('');
    setNewColor('#cccccc');
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
                          <button
                            className="text-xs text-red-600"
                            onClick={() =>
                              setTemp({
                                ...temp,
                                azureProjects: temp.azureProjects.filter((_, i) => i !== idx),
                                projectColors: Object.fromEntries(
                                  Object.entries(temp.projectColors).filter(([key]) => key !== p)
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
            </div>
          </div>
        )}
      </div>
    );
}

