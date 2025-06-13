import WorkItem from '../models/workItem.js';

export default class AdoService {
  constructor(
    org = '',
    token = '',
    projects = [],
    tags = [],
    area = '',
    iteration = '',
    includeRelations = false
  ) {
    this.org = org;
    this.token = token;
    this.projects = projects;
    this.tags = tags;
    this.area = area;
    this.iteration = iteration;
    this.includeRelations = includeRelations;
    this._b64 =
      typeof btoa === 'function'
        ? (str) => btoa(str)
        : (str) => Buffer.from(str).toString('base64');
  }

  _buildQuery(since = null) {
    const projectFilter = this.projects.length
      ? `[System.TeamProject] in (${this.projects
          .map((p) => `'${p}'`)
          .join(',')}) and `
      : '';
    const tagFilter = this.tags.length
      ? this.tags
          .map((t) => `[System.Tags] CONTAINS '${t}'`)
          .join(' and ') + ' and '
      : '';
    const areaFilter = this.area ? `[System.AreaPath] under '${this.area}' and ` : '';
    const iterationFilter = this.iteration
      ? `[System.IterationPath] under '${this.iteration}' and `
      : '';
    const typeFilter =
      "[System.WorkItemType] not in ('Test Case','Test Suite') and ";
    const dateFilter = since
      ? `[System.ChangedDate] >= '${since.toISOString().split('T')[0]}'`
      : '[System.ChangedDate] >= @Today - 30';
    return (
      'Select [System.Id] From WorkItems Where ' +
      projectFilter +
      tagFilter +
      areaFilter +
      iterationFilter +
      typeFilter +
      `${dateFilter} order by [System.ChangedDate] desc`
    );
  }

  async _fetchItems(ids, auth) {
    const fields = [
      'System.Id',
      'System.Title',
      'System.WorkItemType',
      'System.Parent',
      'System.TeamProject',
      'System.Tags',
      'System.AreaPath',
      'System.IterationPath',
      'System.State',
      'Microsoft.VSTS.Scheduling.StoryPoints',
      'Microsoft.VSTS.Common.AcceptanceCriteria',
    ];

    const url =
      `https://dev.azure.com/${this.org}/_apis/wit/workitems?` +
      `ids=${ids.join(',')}` +
      `&fields=${encodeURIComponent(fields.join(','))}` +
      `&api-version=7.0`;

    const res = await fetch(url, {
      headers: {
        Authorization: auth,
      },
    });
    if (!res.ok) {
      throw new Error('Failed to fetch items');
    }

    const data = await res.json();
    return data.value.map(
      (d) =>
        new WorkItem({
          id: d.id.toString(),
          title: d.fields['System.Title'],
          type: d.fields['System.WorkItemType'],
          parentId: d.fields['System.Parent']
            ? d.fields['System.Parent'].toString()
            : null,
          project: d.fields['System.TeamProject'] || '',
          tags: d.fields['System.Tags']
            ? d.fields['System.Tags'].split(';').map((t) => t.trim())
            : [],
          area: d.fields['System.AreaPath'] || '',
          iteration: d.fields['System.IterationPath'] || '',
          state: d.fields['System.State'] || '',
          storyPoints: d.fields['Microsoft.VSTS.Scheduling.StoryPoints'] ?? null,
          acceptanceCriteria:
            d.fields['Microsoft.VSTS.Common.AcceptanceCriteria'] || '',
          dependencies: [],
        })
    );
  }

  async _fetchRelations(ids, auth) {
    const url =
      `https://dev.azure.com/${this.org}/_apis/wit/workitems?` +
      `ids=${ids.join(',')}` +
      `&$expand=relations&api-version=7.0`;

    const res = await fetch(url, {
      headers: {
        Authorization: auth,
      },
    });
    if (!res.ok) {
      throw new Error('Failed to fetch relations');
    }

    const data = await res.json();
    const map = {};
    data.value.forEach((d) => {
      map[d.id.toString()] = (d.relations || [])
        .filter(
          (r) =>
            ['Predecessor', 'Successor'].includes(r.attributes?.name) ||
            r.rel === 'System.LinkTypes.Related'
        )
        .map((r) => r.url.split('/').pop());
    });
    return map;
  }

  async getWorkItems(since = null) {
    if (!this.org || !this.token) {
      return [];
    }

    const auth = `Basic ${this._b64(':' + this.token)}`;
    const wiqlRes = await fetch(
        `https://dev.azure.com/${this.org}/_apis/wit/wiql?api-version=7.0`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: auth,
          },
          body: JSON.stringify({
            query: this._buildQuery(since),
          }),
        }
      );

    if (!wiqlRes.ok) {
      throw new Error('Failed to query work items');
    }

      const wiql = await wiqlRes.json();
      const ids = wiql.workItems.map((w) => w.id);
      if (!ids.length) return [];

      const results = [];
      for (let i = 0; i < ids.length; i += 200) {
        const batchIds = ids.slice(i, i + 200);
        const items = await this._fetchItems(batchIds, auth);
        let deps = {};
        if (this.includeRelations) {
          deps = await this._fetchRelations(batchIds, auth);
        }
        items.forEach((it) => {
          it.dependencies = deps[it.id] || [];
        });
        results.push(...items);
      }
      const map = new Map(results.map((i) => [i.id, i]));
      let missing = new Set();
      results.forEach((item) => {
        if (item.parentId && !map.has(item.parentId)) {
          missing.add(item.parentId);
        }
      });

      while (missing.size > 0) {
        const batch = Array.from(missing).slice(0, 200);
        const parents = await this._fetchItems(batch, auth);
        let parentDeps = {};
        if (this.includeRelations) {
          parentDeps = await this._fetchRelations(batch, auth);
        }
        parents.forEach((p) => {
          p.dependencies = parentDeps[p.id] || [];
          if (!map.has(p.id)) {
            map.set(p.id, p);
            results.push(p);
            if (p.parentId && !map.has(p.parentId)) missing.add(p.parentId);
          }
          missing.delete(p.id);
        });
      }

    return Array.from(map.values());
  }

  findMissingAcceptanceCriteria(items = []) {
    return items.filter(
      (i) => !(i.acceptanceCriteria && i.acceptanceCriteria.trim())
    );
  }

  findIncorrectState(items = [], validStates = []) {
    if (!Array.isArray(validStates) || validStates.length === 0) return [];
    const states = validStates.map((s) => s.toLowerCase());
    return items.filter(
      (i) => !states.includes((i.state || '').toLowerCase())
    );
  }

  findTreeProblems(items = []) {
    const map = new Map(items.map((i) => [i.id, i]));
    const issues = [];
    for (const item of items) {
      const type = (item.type || '').toLowerCase();
      const parent = item.parentId ? map.get(item.parentId) : null;
      const parentType = (parent?.type || '').toLowerCase();

      if (type === 'feature') {
        if (!parent || parentType !== 'epic') {
          issues.push({ ...item, issue: 'Feature should be under Epic' });
        }
      } else if (type === 'user story' || type === 'evolution') {
        if (!parent || parentType !== 'feature') {
          issues.push({ ...item, issue: 'User Story/Evolution should be under Feature' });
        }
      } else if (type === 'task') {
        if (!parent || !['user story', 'evolution'].includes(parentType)) {
          issues.push({ ...item, issue: 'Task should be under User Story or Evolution' });
        }
      } else if (type === 'bug') {
        let linked = (item.dependencies || []).some((id) => {
          const dep = map.get(id);
          const depType = (dep?.type || '').toLowerCase();
          return ['user story', 'feature'].includes(depType);
        });
        if (!linked && item.parentId) {
          const dep = map.get(item.parentId);
          const depType = (dep?.type || '').toLowerCase();
          linked = ['user story', 'feature'].includes(depType);
        }
        if (!linked) {
          issues.push({
            ...item,
            issue: 'Bug should be related to User Story or Feature',
          });
        }
      } else if (type === 'transversal activity') {
        if (!parent || parentType !== 'feature') {
          issues.push({ ...item, issue: 'Transversal Activity should be under Feature' });
        }
      }
    }
    return issues;
  }
}
