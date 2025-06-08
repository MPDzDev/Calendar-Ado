export default class WorkItem {
  constructor({
    id,
    title,
    type = 'task',
    parentId = null,
    project = '',
    tags = [],
    area = '',
    iteration = '',
  }) {
    this.id = id;
    this.title = title;
    this.type = type;
    this.parentId = parentId;
    this.project = project;
    this.tags = tags;
    this.area = area;
    this.iteration = iteration;
  }
}
