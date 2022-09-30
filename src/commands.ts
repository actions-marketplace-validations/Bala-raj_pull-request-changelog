export const gitPrume =
  'git fetch --no-tags --prune origin +refs/pull/*/head:refs/remotes/origin/pr/*';

export const gitNoTag =
  'git fetch --no-tags origin +refs/heads/*:refs/remotes/origin/*';

export const changeFiles = (sha): string =>
  `git diff-tree --no-commit-id --name-only -r ${sha}`;