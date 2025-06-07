import { useState, useEffect } from 'react';
import StorageService from '../services/storageService';

export default function useWorkBlocks() {
  const [blocks, setBlocks] = useState([]);

  useEffect(() => {
    const storage = new StorageService('workBlocks', { workBlocks: [] });
    const data = storage.read();
    setBlocks(data.workBlocks || []);
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
