import React, { useState, useEffect } from 'react';

const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function Settings({ settings, setSettings }) {
  const [open, setOpen] = useState(false);
  const [temp, setTemp] = useState(settings);

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
    setSettings(temp);
    setOpen(false);
  };

  return (
    <div className="mb-2">
      <button className="px-2 py-1 bg-gray-200" onClick={() => setOpen(!open)}>
        Settings
      </button>
      {open && (
        <div className="border p-2 mt-2 bg-white space-y-2">
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
          <div className="flex space-x-2">
            <button className="px-2 py-1 bg-blue-500 text-white text-xs" onClick={save}>
              Save
            </button>
            <button
              className="px-2 py-1 bg-gray-300 text-xs"
              onClick={() => {
                setTemp(settings);
                setOpen(false);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
