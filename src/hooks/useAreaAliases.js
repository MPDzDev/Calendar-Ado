import { useState, useEffect } from 'react';
import StorageService from '../services/storageService';

export default function useAreaAliases() {
  const [aliases, setAliases] = useState({});

  useEffect(() => {
    const storage = new StorageService('areaAliases', { aliases: {} });
    const data = storage.read();
    setAliases(data.aliases || {});
  }, []);

  useEffect(() => {
    const storage = new StorageService('areaAliases');
    storage.write({ aliases });
  }, [aliases]);

  return { aliases, setAliases };
}
