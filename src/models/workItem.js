export default class WorkItem {
  constructor({ id, title, type = 'task', parentId = null }) {
    this.id = id;
    this.title = title;
    this.type = type;
    this.parentId = parentId;
  }
}
