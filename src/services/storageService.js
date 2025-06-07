// Placeholder for local storage interactions
import fs from 'fs';
import path from 'path';

export default class StorageService {
  constructor() {
    this.dataPath = path.join(process.cwd(), 'data.json');
  }

  read() {
    if (fs.existsSync(this.dataPath)) {
      return JSON.parse(fs.readFileSync(this.dataPath));
    }
    return { workBlocks: [] };
  }

  write(data) {
    fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2));
  }
}
