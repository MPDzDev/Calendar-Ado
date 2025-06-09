// Service to store PAT securely
let keytar = null;
try {
  if (typeof window !== 'undefined') {
    if (window.api && window.api.getPassword) {
      // Access to keytar via context bridge
      keytar = {
        getPassword: window.api.getPassword,
        setPassword: window.api.setPassword,
        deletePassword: window.api.deletePassword,
      };
    } else if (window.require) {
      // Fallback when nodeIntegration is enabled
      keytar = window.require('keytar');
    }
  } else if (typeof require !== 'undefined') {
    // Node environment (tests)
    keytar = require('keytar');
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
    if (!keytar) {
      return '';
    }
    const res = await keytar.getPassword(this.service, this.account);
    return res || '';
  }

  async set(pat) {
    if (!keytar) {
      throw new Error('keytar not available');
    }
    if (pat) {
      await keytar.setPassword(this.service, this.account, pat);
    } else {
      await keytar.deletePassword(this.service, this.account);
    }
  }
}
