let keytar = null;
try {
  if (typeof window !== 'undefined') {
    if (window.api && window.api.getPassword) {
      keytar = {
        getPassword: window.api.getPassword,
        setPassword: window.api.setPassword,
        deletePassword: window.api.deletePassword,
      };
    } else if (window.require) {
      keytar = window.require('keytar');
    }
  } else if (typeof require !== 'undefined') {
    keytar = require('keytar');
  }
} catch (e) {
  keytar = null;
}

export default class TimeLogKeyService {
  constructor(service = 'patrak', account = 'timelog-api-key') {
    this.service = service;
    this.account = account;
  }

  async get() {
    if (!keytar) {
      return '';
    }
    const res = await keytar.getPassword(this.service, this.account);
    return res || '';
  }

  async set(value) {
    if (!keytar) {
      throw new Error('keytar not available');
    }
    if (value) {
      await keytar.setPassword(this.service, this.account, value);
    } else {
      await keytar.deletePassword(this.service, this.account);
    }
  }
}
