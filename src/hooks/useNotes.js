import { useState, useEffect } from 'react';
import StorageService from '../services/storageService';

export default function useNotes() {
  const [notes, setNotes] = useState([]);
  const [itemNotes, setItemNotes] = useState({});

  useEffect(() => {
    const storage = new StorageService('notes', { notes: [], itemNotes: {} });
    const data = storage.read();
    const loaded = (data.notes || []).map((n) => ({ starred: false, ...n }));
    setNotes(loaded);
    setItemNotes(data.itemNotes || {});
  }, []);

  useEffect(() => {
    const storage = new StorageService('notes');
    storage.write({ notes, itemNotes });
  }, [notes, itemNotes]);

  return { notes, setNotes, itemNotes, setItemNotes };
}
