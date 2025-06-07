import React, { useState } from 'react';

export default function Calendar({ blocks, onAdd, onDelete }) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const hourHeight = 40; // px height for each hour block
  const [activeDay, setActiveDay] = useState(null);
  const [form, setForm] = useState({ start: '09:00', end: '10:00', note: '', workItem: '' });
  const [drag, setDrag] = useState(null); // { day, start, end }
  const [hoveredId, setHoveredId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

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

  const startDrag = (e, dayIdx) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const hourHeight = rect.height / hours.length;
    const start = Math.floor((e.clientY - rect.top) / hourHeight);
    setDrag({ day: dayIdx, start, end: start + 1, rect, hourHeight });
  };

  const onDrag = (e) => {
    if (!drag) return;
    const y = e.clientY - drag.rect.top;
    const cur = Math.floor(y / drag.hourHeight) + 1;
    const end = Math.max(cur, drag.start + 1);
    if (end !== drag.end) setDrag({ ...drag, end });
  };

  const endDrag = (dayIdx) => {
    if (!drag) return;
    if (drag.day !== dayIdx) {
      setDrag(null);
      return;
    }
    const startDate = new Date();
    const endDate = new Date();
    startDate.setDate(startDate.getDate() - startDate.getDay() + 1 + dayIdx);
    endDate.setDate(startDate.getDate());
    startDate.setHours(drag.start, 0, 0, 0);
    endDate.setHours(drag.end, 0, 0, 0);
    onAdd({ id: Date.now(), start: startDate.toISOString(), end: endDate.toISOString(), note: '', workItem: '' });
    setDrag(null);
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
            <div
              className="relative"
              style={{ height: `${hours.length * hourHeight}px` }}
              onMouseDown={(e) => startDrag(e, idx)}
              onMouseMove={onDrag}
              onMouseUp={() => endDrag(idx)}
            >
              <div className="absolute inset-0 pointer-events-none flex flex-col">
                {hours.map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 border-t border-gray-200 text-[10px] text-gray-400"
                  >
                    {h}:00
                  </div>
                ))}
              </div>
              <div className="relative z-10 w-full h-full">
                {blocks
                  .filter((b) => {
                    const date = new Date(b.start);
                    return date.getDay() === ((idx + 1) % 7);
                  })
                  .map((b) => {
                    const start = new Date(b.start);
                    const end = new Date(b.end);
                    const startMinutes = start.getHours() * 60 + start.getMinutes();
                    const endMinutes = end.getHours() * 60 + end.getMinutes();
                    const top = startMinutes * (hourHeight / 60);
                    const height = (endMinutes - startMinutes) * (hourHeight / 60);
                    const highlight = hoveredId === b.id;
                    return (
                      <div
                        key={b.id}
                        onMouseEnter={() => setHoveredId(b.id)}
                        onMouseLeave={() => {
                          setHoveredId(null);
                          if (confirmDeleteId !== b.id) setConfirmDeleteId(null);
                        }}
                        className={`absolute left-0 right-0 p-1 bg-gray-200 overflow-hidden ${highlight ? 'ring-2 ring-blue-400' : ''}`}
                        style={{ top: `${top}px`, height: `${height}px` }}
                      >
                        <div className="text-sm">
                          {start.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          -{' '}
                          {end.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        <div className="text-xs">
                          {b.workItem} {b.note}
                        </div>
                        {highlight && confirmDeleteId !== b.id && (
                          <button
                            className="absolute bottom-0 right-0 p-1 text-red-600 text-xs bg-white"
                            onClick={() => setConfirmDeleteId(b.id)}
                          >
                            🗑
                          </button>
                        )}
                        {confirmDeleteId === b.id && (
                          <div className="absolute bottom-0 right-0 flex space-x-1 text-xs">
                            <button
                              className="px-1 bg-red-500 text-white"
                              onClick={() => {
                                if (onDelete) onDelete(b.id);
                                setConfirmDeleteId(null);
                                setHoveredId(null);
                              }}
                            >
                              Confirm?
                            </button>
                            <button
                              className="px-1 bg-gray-300"
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              x
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                {activeDay === idx && (
                  <form
                    onSubmit={addBlock}
                    className="absolute top-0 left-0 bg-white border p-2 space-y-1 z-20"
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
              {drag && drag.day === idx && (
                <div
                  className="absolute left-0 right-0 bg-blue-300 opacity-50 pointer-events-none"
                  style={{
                    top: drag.start * drag.hourHeight,
                    height: (drag.end - drag.start) * drag.hourHeight,
                  }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
