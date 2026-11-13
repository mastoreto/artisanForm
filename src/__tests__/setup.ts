import { afterEach } from 'bun:test';
import { GlobalRegistrator } from '@happy-dom/global-registrator';

GlobalRegistrator.register();

// Every test file shares one happy-dom document. Without this, a form a test
// leaves mounted shows up in whichever test runs next (a flaky "multiple
// elements with the text: Finish" in CI). Imported after `register()`:
// Testing Library needs the global `document` when it loads.
const { cleanup } = await import('@testing-library/react');
afterEach(cleanup);
