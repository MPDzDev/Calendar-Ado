import React, { useState } from 'react';

export default function Notes({
  notes,
  onAdd,
  onDelete,
  onToggleStar,
  areas = [],
  areaAliases = {},
  setAreaAliases,
  todos = [],
  onAddTodo,
  onToggleTodo,
  onDeleteTodo,
}) {
  const [value, setValue] = useState('');
  const [todoValue, setTodoValue] = useState('');
  const [tab, setTab] = useState('notes');

  const add = () => {
    const text = value.trim();
    if (text) {
      onAdd(text);
      setValue('');
    }
  };

  const addTodo = () => {
    const text = todoValue.trim();
    if (text) {
      onAddTodo && onAddTodo(text);
      setTodoValue('');
    }
  };

  const updateAlias = (area, value) => {
    if (!setAreaAliases) return;
    if (value.trim() === '') {
      const { [area]: _removed, ...rest } = areaAliases;
      setAreaAliases(rest);
    } else {
      setAreaAliases({ ...areaAliases, [area]: value });
    }
  };

  return (
    <div className="mt-4 flex flex-col">
      <div className="flex mb-2 space-x-2">
        <button
          className={`px-2 py-1 text-xs ${
            tab === 'notes' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'
          }`}
          onClick={() => setTab('notes')}
        >
          Notes
        </button>
        <button
          className={`px-2 py-1 text-xs ${
            tab === 'todos' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'
          }`}
          onClick={() => setTab('todos')}
        >
          Todos
        </button>
        <button
          className={`px-2 py-1 text-xs ${
            tab === 'areas' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'
          }`}
          onClick={() => setTab('areas')}
        >
          Custom Area Names
        </button>
      </div>
      {tab === 'notes' && (
        <>
          <div className="flex mb-2">
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
              className="border flex-grow px-1 text-sm"
            />
            <button
              className="ml-2 px-2 py-1 bg-blue-500 text-white text-xs"
              onClick={add}
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-1 overflow-y-auto max-h-40">
            {notes.map((n) => (
              <div
                key={n.id}
                className="px-2 py-1 border rounded-full bg-gray-200 dark:bg-gray-700 text-xs flex items-center"
                draggable
                onDragStart={(e) =>
                  e.dataTransfer.setData('application/x-note', JSON.stringify(n))
                }
              >
                <button
                  className="mr-1 text-yellow-500"
                  onClick={() => onToggleStar && onToggleStar(n.id)}
                  title={n.starred ? 'Unstar' : 'Star'}
                >
                  {n.starred ? '★' : '☆'}
                </button>
                <span className="truncate mr-1">{n.text}</span>
                <button
                  className="ml-auto text-red-600 text-xs"
                  onClick={() => onDelete(n.id)}
                >
                  x
                </button>
              </div>
            ))}
          </div>
        </>
      )}
      {tab === 'todos' && (
        <>
          <div className="flex mb-2">
            <input
              type="text"
              value={todoValue}
              onChange={(e) => setTodoValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTodo()}
              className="border flex-grow px-1 text-sm"
            />
            <button
              className="ml-2 px-2 py-1 bg-blue-500 text-white text-xs"
              onClick={addTodo}
            >
              Add
            </button>
          </div>
          <ul className="flex flex-col gap-1 overflow-y-auto max-h-40 text-xs">
            {todos.map((t) => (
              <li key={t.id} className="flex items-center">
                <input
                  type="checkbox"
                  className="mr-1"
                  checked={t.done}
                  onChange={() => onToggleTodo && onToggleTodo(t.id)}
                />
                <span className={`flex-grow truncate ${t.done ? 'line-through text-gray-500' : ''}`}>{t.text}</span>
                <button
                  className="ml-2 text-red-600 text-xs"
                  onClick={() => onDeleteTodo && onDeleteTodo(t.id)}
                >
                  x
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {tab === 'areas' && (
        <div className="flex flex-col gap-1 overflow-y-auto max-h-40 text-xs">
          {areas.map((area) => (
            <div key={area} className="flex items-center gap-1">
              <span className="truncate w-1/2" title={area}>{area}</span>
              <input
                type="text"
                className="border flex-grow px-1"
                value={areaAliases[area] || ''}
                onChange={(e) => updateAlias(area, e.target.value)}
                placeholder="Custom name"
              />
            </div>
          ))}
          {areas.length === 0 && (
            <span className="text-xs text-gray-500">No areas yet</span>
          )}
        </div>
      )}
    </div>
  );
}
