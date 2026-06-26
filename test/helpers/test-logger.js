const INDENT = '  ';

function nowMs() {
  const [s, ns] = process.hrtime();
  return s * 1000 + ns / 1e6;
}

let suiteStack = [];
let suiteStart = new Map();
let testStart = new Map();

function log(line = '') {
  // Keep logs explicit for CI readability
  // eslint-disable-next-line no-console
  console.log(line);
}

function formatPath() {
  return suiteStack.join(' > ');
}

before(function () {
  const file = this.file;
  log(`[MOCHA] file: ${file || '(unknown)'}`);
});

beforeEach(function () {
  const testTitle =
    this.currentTest && this.currentTest.title ? this.currentTest.title : '(unknown test)';
  const full = formatPath() ? `${formatPath()} > ${testTitle}` : testTitle;

  testStart.set(this, nowMs());
  log(`[TEST] ${full} ...`);
});

afterEach(function () {
  const testTitle =
    this.currentTest && this.currentTest.title ? this.currentTest.title : '(unknown test)';
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

before(function () {
  // Track describe blocks
  if (this.title) {
    suiteStack.push(this.title);
    suiteStart.set(this, nowMs());
    log(`[SUITE] start: ${formatPath()}`);
  }
});

after(function () {
  // Pop describe blocks
  if (this.title) {
    const start = suiteStart.get(this);
    const dur = start ? Math.max(0, nowMs() - start) : undefined;
    log(`[SUITE] end: ${formatPath()}${typeof dur === 'number' ? ` (${dur.toFixed(1)}ms)` : ''}`);
    suiteStack.pop();
    suiteStart.delete(this);
  }
});
