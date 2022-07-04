export const gitPrume =
  'git fetch --no-tags --prune origin +refs/pull/*/head:refs/remotes/origin/pr/*';

export const gitNoTag =
  'git fetch --no-tags origin +refs/heads/*:refs/remotes/origin/*';

export const getCommits = (pullRequestId, branch): string =>
  `git log --no-merges origin/pr/${pullRequestId} ^origin/${branch} --pretty=oneline --no-abbrev-commit`;

export const changeFiles = (sha): string =>
  `git diff-tree --no-commit-id --name-only -r ${sha}`;

export const setBumpType = (type: string): string => `echo ${type} && echo ::set-output name=bump-type::${type}`;
