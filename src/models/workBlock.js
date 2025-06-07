export default class WorkBlock {
  constructor({ id, start, end, note, workItem, taskId = null }) {
    this.id = id;
    this.start = start;
    this.end = end;
    this.note = note;
    this.workItem = workItem; // text shown on calendar
    this.taskId = taskId; // underlying task to log time against
  }
}
