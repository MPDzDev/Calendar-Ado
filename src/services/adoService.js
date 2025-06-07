// Placeholder for Azure DevOps API interactions
import WorkItem from '../models/workItem';

export default class AdoService {
  constructor(token) {
    this.token = token;
  }

  async getWorkItems() {
    // TODO: implement fetch from Azure DevOps
    const data = [
      { id: '2001', title: 'Authentication feature', type: 'feature' },
      { id: '2002', title: 'Login user story', type: 'user story', parentId: '2001' },
      { id: '2003', title: 'Implement login page', type: 'task', parentId: '2002' },
      { id: '2004', title: 'Fix login bug', type: 'bug', parentId: '2002' },
      { id: '2005', title: 'Profile feature', type: 'feature' },
      { id: '2006', title: 'Update avatar story', type: 'user story', parentId: '2005' },
      { id: '2007', title: 'Add file uploader', type: 'task', parentId: '2006' },
      { id: '2008', title: 'Validate image size', type: 'task', parentId: '2006' },
    ];
    return data.map((d) => new WorkItem(d));
  }
}
