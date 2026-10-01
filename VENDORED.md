# herdr-resurrect fork

Upstream: <https://github.com/ntindle/herdr-resurrect> (MIT). The harness pins
our `custom` branch as a submodule; use `herdr plugin link` rather than installing
upstream. Initial upstream commit: `5afa6755d4f35c62c7522ba4fd04922d1ac69602`.

## Local change

After a macOS reboot on 2026-10-01, Herdr restored seven agent panes as shells.
Resurrect's one-shot boot handler skipped all seven as "already running something"
during shell startup and immediately saved the empty state to `last.json`. The
pre-reboot snapshot survived under `snapshots/`.

The boot restore now shares a 15-second retry deadline across existing panes,
refreshes process information each poll, and leaves panes busy after the deadline
untouched. Manual restore still skips busy panes immediately; unknown process
state is not treated as idle. Pi now explicitly resumes captured sessions with
`pi --session <path>` (or `pi --continue` without a path), rather than depending
on Herdr to reconnect a bare `pi` launch. `node --test tests/*.test.js` covers both a transient
busy pane and a persistently busy pane. This is a bounded mitigation for the
startup race; a first-class Herdr `server.ready` event would be better.

To incorporate upstream changes, fetch `ntindle/herdr-resurrect` into an `upstream`
remote, review/rebase on `custom`, rerun tests, then advance the harness submodule
pin. Do not push to the upstream remote.
