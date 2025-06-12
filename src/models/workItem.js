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
    state = '',
    startDate = '',
    targetDate = '',
    storyPoints = null,
    acceptanceCriteria = '',
    dependencies = [],
  }) {
    this.id = id;
    this.title = title;
    this.type = type;
    this.parentId = parentId;
    this.project = project;
    this.tags = tags;
    this.area = area;
    this.iteration = iteration;
    this.state = state;
    this.startDate = startDate;
    this.targetDate = targetDate;
    this.storyPoints = storyPoints;
    this.acceptanceCriteria = acceptanceCriteria;
    this.dependencies = dependencies;
  }
}
