import { useState, useEffect } from 'react';
import StorageService from '../services/storageService';

export default function useNotes() {
  const [notes, setNotes] = useState([]);
  const [itemNotes, setItemNotes] = useState({});

  useEffect(() => {
    const storage = new StorageService('notes', { notes: [], itemNotes: {} });
    const data = storage.read();
    setNotes(data.notes || []);
    setItemNotes(data.itemNotes || {});
  }, []);

  useEffect(() => {
    const storage = new StorageService('notes');
    storage.write({ notes, itemNotes });
  }, [notes, itemNotes]);

  return { notes, setNotes, itemNotes, setItemNotes };
}
