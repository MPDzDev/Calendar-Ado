import React, { useState } from 'react';

export default function Notes({ notes, onAdd, onDelete }) {
  const [value, setValue] = useState('');

  const add = () => {
    const text = value.trim();
    if (text) {
      onAdd(text);
      setValue('');
    }
  };

  return (
    <div className="mt-4 flex flex-col">
      <h2 className="font-semibold mb-2">Notes</h2>
      <div className="flex mb-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="border flex-grow px-1 text-sm"
        />
        <button
          className="ml-2 px-2 py-1 bg-blue-500 text-white text-xs"
          onClick={add}
        >
          Add
        </button>
      </div>
      <div className="flex flex-col space-y-1 overflow-y-auto max-h-40">
        {notes.map((n) => (
          <div
            key={n.id}
            className="p-1 border bg-gray-200 dark:bg-gray-700 text-xs flex justify-between"
            draggable
            onDragStart={(e) =>
              e.dataTransfer.setData('application/x-note', JSON.stringify(n))
            }
          >
            <span className="flex-grow truncate">{n.text}</span>
            <button
              className="ml-2 text-red-600 text-xs"
              onClick={() => onDelete(n.id)}
            >
              x
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
