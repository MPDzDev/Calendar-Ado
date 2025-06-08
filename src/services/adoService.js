import WorkItem from '../models/workItem';

export default class AdoService {
  constructor(org = '', token = '', projects = []) {
    this.org = org;
    this.token = token;
    this.projects = projects;
    this._b64 =
      typeof btoa === 'function'
        ? (str) => btoa(str)
        : (str) => Buffer.from(str).toString('base64');
  }

  _buildQuery() {
    const projectFilter = this.projects.length
      ? `[System.TeamProject] in (${this.projects
          .map((p) => `'${p}'`)
          .join(',')}) and `
      : '';
    return (
      'Select [System.Id] From WorkItems Where ' +
      projectFilter +
      '[System.ChangedDate] >= @Today - 30 order by [System.ChangedDate] desc'
    );
  }

  async getWorkItems() {
    if (!this.org || !this.token) {
      return [];
    }

    const auth = `Basic ${this._b64(':' + this.token)}`;
    try {
      const wiqlRes = await fetch(
        `https://dev.azure.com/${this.org}/_apis/wit/wiql?api-version=7.0`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: auth,
          },
          body: JSON.stringify({
            query: this._buildQuery(),
          }),
        }
      );

      if (!wiqlRes.ok) {
        return [];
      }

      const wiql = await wiqlRes.json();
      const ids = wiql.workItems.map((w) => w.id).join(',');
      if (!ids) return [];

      const itemsRes = await fetch(
        `https://dev.azure.com/${this.org}/_apis/wit/workitems?ids=${ids}&fields=System.Id,System.Title,System.WorkItemType,System.Parent&api-version=7.0`,
        {
          headers: { Authorization: auth },
        }
      );
      if (!itemsRes.ok) {
        return [];
      }

      const data = await itemsRes.json();
      return data.value.map(
        (d) =>
          new WorkItem({
            id: d.id.toString(),
            title: d.fields['System.Title'],
            type: d.fields['System.WorkItemType'],
            parentId: d.fields['System.Parent']
              ? d.fields['System.Parent'].toString()
              : null,
          })
      );
    } catch (e) {
      console.error('Failed to fetch work items', e);
      return [];
    }
  }
}
