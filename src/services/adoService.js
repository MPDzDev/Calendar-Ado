// Placeholder for Azure DevOps API interactions
export default class AdoService {
  constructor(token) {
    this.token = token;
  }

  async getWorkItems() {
    // TODO: implement fetch from Azure DevOps
    return [
      { id: '1001', title: 'Sample Task 1' },
      { id: '1002', title: 'Sample Task 2' },
    ];
  }
}
