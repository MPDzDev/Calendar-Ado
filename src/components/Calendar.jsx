import React, { useState } from 'react';

export default function Calendar({ blocks, onAdd }) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const [form, setForm] = useState({ day: 0, start: '09:00', end: '10:00', note: '', workItem: '' });

  const addBlock = (e) => {
    e.preventDefault();
    const startDate = new Date();
    const endDate = new Date();
    startDate.setDate(startDate.getDate() - startDate.getDay() + 1 + parseInt(form.day));
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
    setForm({ ...form, note: '', workItem: '' });
  };

  return (
    <div>
      <form className="space-x-2 mb-4" onSubmit={addBlock}>
        <select value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })}>
          {days.map((d, idx) => <option key={idx} value={idx}>{d}</option>)}
        </select>
        <input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })}/>
        <input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })}/>
        <input type="text" placeholder="Work item" value={form.workItem} onChange={(e) => setForm({ ...form, workItem: e.target.value })}/>
        <input type="text" placeholder="Note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}/>
        <button type="submit" className="px-2 py-1 bg-blue-500 text-white">Add</button>
      </form>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, idx) => (
          <div key={idx} className="border p-2">
            <h2 className="font-semibold mb-2">{day}</h2>
            {blocks.filter(b => {
              const date = new Date(b.start);
              return date.getDay() === (idx + 1) % 7;
            }).map(b => (
              <div key={b.id} className="mb-2 p-1 bg-gray-200">
                <div className="text-sm">{new Date(b.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(b.end).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                <div className="text-xs">{b.workItem} {b.note}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
