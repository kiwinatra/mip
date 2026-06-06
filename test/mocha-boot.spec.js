// Initial mocha spec

const INDENT = '  ';

function nowMs() {
  const [s, ns] = process.hrtime();
  return s * 1000 + ns / 1e6;
}

let suiteStack = [];
let suiteStart = new Map();
let testStart = new Map();

function formatPath() {
  return suiteStack.join(' > ');
}

function log(line = '') {
  // eslint-disable-next-line no-console
  console.log(line);
}

before(function () {
  log(`[MOCHA] file: ${this.file || '(unknown)'}`);
});

before(function () {
  if (!this.title) return;
  suiteStack.push(this.title);
  suiteStart.set(this, nowMs());
  log(`[SUITE] start: ${formatPath()}`);
});

after(function () {
  if (!this.title) return;
  const start = suiteStart.get(this);
  const dur = start ? Math.max(0, nowMs() - start) : undefined;
  log(`[SUITE] end: ${formatPath()}${typeof dur === 'number' ? ` (${dur.toFixed(1)}ms)` : ''}`);
  suiteStack.pop();
  suiteStart.delete(this);
});

beforeEach(function () {
  const testTitle = this.currentTest && this.currentTest.title ? this.currentTest.title : '(unknown test)';
  const full = formatPath() ? `${formatPath()} > ${testTitle}` : testTitle;

  testStart.set(this, nowMs());
  log(`[TEST] ${full} ...`);
});

afterEach(function () {
  const testTitle = this.currentTest && this.currentTest.title ? this.currentTest.title : '(unknown test)';
  const full = formatPath() ? `${formatPath()} > ${testTitle}` : testTitle;

  const start = testStart.get(this);
  const dur = start ? Math.max(0, nowMs() - start) : undefined;

  const state = this.currentTest.state;
  log(`[TEST] ${full} => ${state}${typeof dur === 'number' ? ` (${dur.toFixed(1)}ms)` : ''}`);

  if (state === 'failed') {
    const err = this.currentTest.err;
    log(`[TEST] error: ${err && err.stack ? err.stack : String(err)}`);
  }

  testStart.delete(this);
});
