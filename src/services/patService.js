// Service to store PAT securely
let keytar = null;
try {
  if (typeof window !== 'undefined' && window.require) {
    keytar = window.require('keytar');
  }
} catch (e) {
  keytar = null;
}

export default class PatService {
  constructor(service = 'calendar-ado', account = 'azure-pat') {
    this.service = service;
    this.account = account;
  }

  async get() {
    if (keytar) {
      const res = await keytar.getPassword(this.service, this.account);
      return res || '';
    }
    if (typeof sessionStorage !== 'undefined') {
      return sessionStorage.getItem(this.account) || '';
    }
    return '';
  }

  async set(pat) {
    if (keytar) {
      if (pat) {
        await keytar.setPassword(this.service, this.account, pat);
      } else {
        await keytar.deletePassword(this.service, this.account);
      }
      return;
    }
    if (typeof sessionStorage !== 'undefined') {
      if (pat) {
        sessionStorage.setItem(this.account, pat);
      } else {
        sessionStorage.removeItem(this.account);
      }
    }
  }
}
