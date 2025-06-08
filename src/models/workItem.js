export default class WorkItem {
  constructor({
    id,
    title,
    type = 'task',
    parentId = null,
    project = '',
  }) {
    this.id = id;
    this.title = title;
    this.type = type;
    this.parentId = parentId;
    this.project = project;
  }
}
