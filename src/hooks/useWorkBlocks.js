import { useState, useEffect } from 'react';
import StorageService from '../services/storageService';

export default function useWorkBlocks() {
  const [blocks, setBlocks] = useState([]);

  useEffect(() => {
    const storage = new StorageService('workBlocks', { workBlocks: [] });
    const data = storage.read();
    const loaded = (data.workBlocks || []).map((b) => ({
      ...b,
      status: b.status || 'draft',
      updatedAt: b.updatedAt || new Date().toISOString(),
      syncStatus: b.syncStatus || b.status,
    }));
    setBlocks(loaded);
  }, []);

  useEffect(() => {
    const storage = new StorageService('workBlocks');
    storage.write({ workBlocks: blocks });
  }, [blocks]);

  return {
    blocks,
    setBlocks,
  };
}
