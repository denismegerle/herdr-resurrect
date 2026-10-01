'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const herdr = require('../lib/herdr');
const pstree = require('../lib/pstree');
const { restore } = require('../lib/restore');

const model = {
  workspaces: [{
    workspace_id: 'w1', number: 1, label: 'work', cwd: '/work',
    tabs: [{ tab_id: 'w1:t1', number: 1, panes: [{
      pane_id: 'w1:p1', cwd: '/work', agent: { name: 'pi', session: { value: '/work/session.jsonl' } },
    }] }],
  }],
};

function withFakeHerdr(processInfo, run) {
  const saved = {
    snapshot: herdr.snapshot, tabList: herdr.tabList, paneList: herdr.paneList,
    processInfo: herdr.processInfo, runInPane: herdr.runInPane,
    focusWorkspace: herdr.focusWorkspace, query: pstree.query,
  };
  const commands = [];
  herdr.snapshot = () => ({ workspaces: [{ workspace_id: 'w1', number: 1, label: 'work' }] });
  herdr.tabList = () => [{ tab_id: 'w1:t1', number: 1 }];
  herdr.paneList = () => [{ pane_id: 'w1:p1', tab_id: 'w1:t1' }];
  herdr.processInfo = processInfo;
  herdr.runInPane = (id, command) => commands.push({ id, command });
  herdr.focusWorkspace = () => {};
  pstree.query = () => ({ byPid: new Map(), children: new Map() });
  try { run(commands); } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (key === 'query') pstree.query = value;
      else herdr[key] = value;
    }
  }
}

function info(busy) {
  return { shell_pid: 1, foreground_processes: [
    { pid: 1, name: 'zsh' }, ...(busy ? [{ pid: 2, name: 'shell-startup' }] : []),
  ] };
}

test('auto-restore retries a temporarily busy restored shell', () => {
  let checks = 0;
  withFakeHerdr(() => info(++checks === 1), (commands) => {
    const result = restore(model, { mode: 'rehydrate', busyRetryMs: 100 });
    assert.ok(checks >= 2);
    assert.deepEqual(commands, [{ id: 'w1:p1', command: 'pi --session /work/session.jsonl' }]);
    assert.equal(result.actions.some((x) => x.action === 'skip'), false);
  });
});

test('auto-restore never types into a pane that remains busy', () => {
  withFakeHerdr(() => info(true), (commands) => {
    const result = restore(model, { mode: 'rehydrate', busyRetryMs: 30 });
    assert.deepEqual(commands, []);
    assert.equal(result.actions.filter((x) => x.action === 'skip').length, 1);
  });
});
