import React, { useState } from 'react';

export default function Calendar({ blocks, onAdd }) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const [activeDay, setActiveDay] = useState(null);
  const [form, setForm] = useState({ start: '09:00', end: '10:00', note: '', workItem: '' });

  const addBlock = (e) => {
    e.preventDefault();
    if (activeDay === null) return;
    const startDate = new Date();
    const endDate = new Date();
    startDate.setDate(startDate.getDate() - startDate.getDay() + 1 + parseInt(activeDay));
    endDate.setDate(startDate.getDate());
    startDate.setHours(parseInt(form.start.split(':')[0]), parseInt(form.start.split(':')[1]));
    endDate.setHours(parseInt(form.end.split(':')[0]), parseInt(form.end.split(':')[1]));
    onAdd({
      id: Date.now(),
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      note: form.note,
      workItem: form.workItem,
    });
    setForm({ start: '09:00', end: '10:00', note: '', workItem: '' });
    setActiveDay(null);
  };

  return (
    <div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, idx) => (
          <div
            key={idx}
            className="border p-2 relative"
            onDoubleClick={() => setActiveDay(idx)}
          >
            <h2 className="font-semibold mb-2">{day}</h2>
            {blocks
              .filter((b) => {
                const date = new Date(b.start);
                return date.getDay() === ((idx + 1) % 7);
              })
              .map((b) => (
                <div key={b.id} className="mb-2 p-1 bg-gray-200">
                  <div className="text-sm">
                    {new Date(b.start).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    -{' '}
                    {new Date(b.end).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                  <div className="text-xs">
                    {b.workItem} {b.note}
                  </div>
                </div>
              ))}
            {activeDay === idx && (
              <form
                onSubmit={addBlock}
                className="absolute top-0 left-0 bg-white border p-2 space-y-1 z-10"
              >
                <input
                  type="time"
                  value={form.start}
                  onChange={(e) => setForm({ ...form, start: e.target.value })}
                  className="border"
                />
                <input
                  type="time"
                  value={form.end}
                  onChange={(e) => setForm({ ...form, end: e.target.value })}
                  className="border"
                />
                <input
                  type="text"
                  placeholder="Work item"
                  value={form.workItem}
                  onChange={(e) =>
                    setForm({ ...form, workItem: e.target.value })
                  }
                  className="border"
                />
                <input
                  type="text"
                  placeholder="Note"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  className="border"
                />
                <div className="flex space-x-1">
                  <button
                    type="submit"
                    className="px-2 py-1 bg-blue-500 text-white text-xs"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDay(null)}
                    className="px-2 py-1 bg-gray-300 text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
