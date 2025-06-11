import { useState, useEffect } from 'react';
import StorageService from '../services/storageService';

export default function useAdoItems() {
  const [items, setItems] = useState([]);
  const [lastFetch, setLastFetch] = useState(0);

  useEffect(() => {
    const storage = new StorageService('workItemCache', {
      items: [],
      lastFetch: 0,
    });
    const data = storage.read();
    setItems(data.items || []);
    setLastFetch(data.lastFetch || 0);
  }, []);

  useEffect(() => {
    const storage = new StorageService('workItemCache');
    storage.write({ items, lastFetch });
  }, [items, lastFetch]);

  return {
    items,
    setItems,
    lastFetch,
    setLastFetch,
  };
}
