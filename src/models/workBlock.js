export default class WorkBlock {
  constructor({ id, start, end, note, workItem }) {
    this.id = id;
    this.start = start;
    this.end = end;
    this.note = note;
    this.workItem = workItem;
  }
}
