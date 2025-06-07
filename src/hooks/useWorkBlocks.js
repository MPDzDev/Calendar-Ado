import { useState, useEffect } from 'react';
import StorageService from '../services/storageService';

export default function useWorkBlocks() {
  const [blocks, setBlocks] = useState([]);

  useEffect(() => {
    const storage = new StorageService();
    const data = storage.read();
    setBlocks(data.workBlocks || []);
  }, []);

  useEffect(() => {
    const storage = new StorageService();
    storage.write({ workBlocks: blocks });
  }, [blocks]);

  return {
    blocks,
    setBlocks,
  };
}
