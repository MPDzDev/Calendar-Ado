import { useState, useEffect } from 'react';
import StorageService from '../services/storageService';

export default function useTodos() {
  const [todos, setTodos] = useState([]);

  useEffect(() => {
    const storage = new StorageService('todos', { todos: [] });
    const data = storage.read();
    setTodos(data.todos || []);
  }, []);

  useEffect(() => {
    const storage = new StorageService('todos');
    storage.write({ todos });
  }, [todos]);

  return { todos, setTodos };
}
