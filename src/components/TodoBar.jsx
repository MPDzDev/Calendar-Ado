import React from 'react';

export default function TodoBar({
  todos = [],
  onToggleTodo,
  onDeleteTodo,
  onNoteDrop,
}) {
  const allowDrop = (e) => {
    if (e.dataTransfer.types.includes('application/x-note')) {
      e.preventDefault();
    }
  };

  const handleDrop = (e) => {
    const raw = e.dataTransfer.getData('application/x-note');
    if (!raw) return;
    e.preventDefault();
    const note = JSON.parse(raw);
    onNoteDrop && onNoteDrop(note);
  };

  return (
    <div
      className="flex flex-wrap gap-1 ml-4"
      onDragOver={allowDrop}
      onDrop={handleDrop}
    >
      {todos.length === 0 && (
        <div className="text-xs text-gray-500">Drop notes here</div>
      )}
      {todos.map((t) => (
        <div
          key={t.id}
          className="flex items-center bg-yellow-100 dark:bg-gray-700 text-xs px-2 py-1 rounded-full"
        >
          <input
            type="checkbox"
            className="mr-1"
            checked={t.done}
            onChange={() => onToggleTodo && onToggleTodo(t.id)}
          />
          <span className={`truncate ${t.done ? 'line-through text-gray-500' : ''}`}>{t.text}</span>
          <button
            className="ml-1 text-red-600 text-xs"
            onClick={() => onDeleteTodo && onDeleteTodo(t.id)}
          >
            x
          </button>
        </div>
      ))}
    </div>
  );
}
