// Test doubles for the nanoplayer-demo browser scripts. No real player, no DOM.

export function fakeNanoPlayerClass(behavior = {}) {
  const instances = [];
  class FakeNanoPlayer {
    constructor(id) {
      this.id = id;
      this.destroyed = 0;
      this.updates = [];
      instances.push(this);
    }
    setup(config) {
      this.config = config;
      if (behavior.deferSetup) {
        return new Promise((resolve, reject) => {
          this.resolveSetup = () => resolve(config);
          this.rejectSetup = (e) => reject(e);
        });
      }
      if (behavior.setupFails) return Promise.reject({ data: { message: 'bad config' } });
      return Promise.resolve(config);
    }
    updateSource(source) {
      this.updates.push(source);
      if (behavior.updateFails) return Promise.reject({ data: { message: 'update rejected' } });
      return Promise.resolve({});
    }
    destroy() {
      this.destroyed++;
      if (behavior.destroyThrows) throw new Error('already destroyed');
    }
    fire(name, data = {}) {
      const fn = this.config && this.config.events && this.config.events[name];
      if (fn) fn({ name, data });
    }
  }
  return { FakeNanoPlayer, instances };
}

export function fakeWindow() {
  const listeners = {};
  return {
    listeners,
    addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
    removeEventListener(type, fn) { listeners[type] = (listeners[type] || []).filter((f) => f !== fn); },
    dispatch(type) { (listeners[type] || []).slice().forEach((f) => f()); },
  };
}

export function fakeDocument() {
  const doc = {
    createElement(tag) { return fakeEl(tag, doc); },
  };
  return doc;
}

export function fakeEl(tag = 'div', doc = null) {
  const el = {
    tagName: tag.toUpperCase(),
    className: '',
    textContent: '',
    childNodes: [],
    scrollTop: 0,
    scrollHeight: 0,
    ownerDocument: doc || fakeDocument(),
    appendChild(child) {
      this.childNodes.push(child);
      this.scrollHeight = this.childNodes.length * 20;
      return child;
    },
    removeChild(child) {
      this.childNodes.splice(this.childNodes.indexOf(child), 1);
      return child;
    },
    get firstChild() { return this.childNodes[0] || null; },
    attributes: {},
    getAttribute(name) { return name in this.attributes ? this.attributes[name] : null; },
    setAttribute(name, value) { this.attributes[name] = String(value); },
    classes: new Set(),
    classList: null,
    listeners: {},
    addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); },
    click() { (this.listeners.click || []).forEach((fn) => fn({ type: 'click' })); },
  };
  el.classList = {
    add: (c) => el.classes.add(c),
    remove: (c) => el.classes.delete(c),
    contains: (c) => el.classes.has(c),
    toggle: (c, force) => {
      const on = force === undefined ? !el.classes.has(c) : force;
      if (on) el.classes.add(c); else el.classes.delete(c);
      return on;
    },
  };
  return el;
}

export function fakeNavigator() {
  return {
    clipboard: {
      written: [],
      writeText(text) { this.written.push(text); return Promise.resolve(); },
    },
  };
}
