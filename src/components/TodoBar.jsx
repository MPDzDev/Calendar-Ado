import React from 'react';

export default function TodoBar({ todos = [], onToggleTodo, onDeleteTodo }) {
  if (!todos.length) return null;
  return (
    <div className="flex flex-wrap gap-1 ml-4">
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
