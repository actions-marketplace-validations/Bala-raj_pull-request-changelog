import fetch from 'node-fetch';
import { exec } from '@actions/exec';
import * as github from '@actions/github';
import * as core from '@actions/core';
import makeTemplate from './template';
import { gitNoTag, changeFiles, gitPrume } from './commands';
import {bumpVersion} from "./version";

const pull_request = github.context.payload.pull_request;
const repository = github.context.payload.repository;
const PR_ID = pull_request.number;
const URL = pull_request.comments_url;
const GITHUB_TOKEN = core.getInput('token') || process.env.token;
const branch = core.getInput('branch');
const currentVersion = core.getInput('version');

const postToGit = async (url, key, body) => {
  const rawResponse = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `token ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ body }),
  });
  if (!rawResponse.ok) {
    throw new Error(rawResponse.statusText);
  }
  const content = await rawResponse.json();
  return content;
};

/**
 * Action core
 */
(async () => {
  try {
    if (GITHUB_TOKEN === undefined) {
      throw new Error('Missing auth thoken');
    }
    if (branch === undefined) {
      throw new Error('Missing branch');
    }
    console.log('Generating changelog....');
    console.log(`Current version: ${currentVersion}`);
    console.log(`Branch: ${branch}`)

    await exec(gitPrume);
    await exec(gitNoTag);

    // then we fetch the diff and grab the output
    let myError = '';

    const octokit = github.getOctokit(GITHUB_TOKEN);
    let commitResponse = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}/commits', {
      owner: repository.owner.login,
      repo: repository.name,
      pull_number: PR_ID
    });

    let commits = {};
    commitResponse.data.forEach((value) => {
      if (!commits[value.sha]) {
        commits[value.sha] = {};
      }
      commits[value.sha].message = value.commit.message;
    });

    const shaKeys = Object.keys(commits).map(
      (sha) =>
          exec(changeFiles(sha), [], {
            listeners: {
              stdout: (data) => {
                commits[sha].files = data
                    .toString()
                    .split('\n')
                    .filter((i) => i);
              },
              stderr: (data) => {
                console.log(`${myError}${data.toString()}`)
              },
            },
          })
    );

    await Promise.all(shaKeys);

    console.log('Create change log');
    const { changesTemplate, versionMask } = makeTemplate(commits);
    console.log(`Generated change log: ${changesTemplate}`);

    console.log('Posting change log to git comments');
    await postToGit(URL, GITHUB_TOKEN, changesTemplate);
    console.log('Setting change log as content output');
    core.setOutput("content", changesTemplate);

    console.log('Calculating next-version');
    if(currentVersion) {
      const nextVersion = bumpVersion(versionMask, currentVersion);
      core.setOutput("next-version", nextVersion);
      console.log("New version: ", nextVersion);
    } else {
      console.log("Ignored to bump new version due to invalid current version")
    }

       // If there were errors, we throw it
    if (myError !== '') {
        throw new Error(myError);
    }
  
    
  } catch (e) {
    console.log('Error found: ', e);
    console.error('Failed due to : ',e);
    process.exit(1);
  }
})();
