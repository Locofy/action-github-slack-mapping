import * as core from '@actions/core';
import { context } from '@actions/github';
import axios from 'axios';

type SlackStore = {
  mapping: {
    email: string;
    githubs: string[];
  }[];
  users: SlackUser[];
};

type SlackRawUser = {
  id: string;
  profile: {
    first_name: string;
    last_name: string;
    email: string;
  };
};

type SlackUser = {
  id: string;
  name: string;
  email: string;
};

async function readMappingInfo(mappingUrl: string) {
  if (!mappingUrl) {
    return {
      users: [],
      mapping: [],
    };
  }

  const response = await axios.get(mappingUrl);
  return {
    users: response.data.items.map((item: SlackRawUser) => ({
      id: item.id,
      name: `${item.profile.first_name} ${item.profile.last_name}`,
      email: item.profile.email,
    })),
    mapping: response.data.mapping,
  };
}

function findSlackUserByEmail(slackStore: SlackStore, email: string) {
  for (const user of slackStore.users) {
    if (user.email === email) {
      return user;
    }
  }
}

function jaccardSimilarity(str1: string, str2: string): number {
  const set1 = new Set(str1.split(' '));
  const set2 = new Set(str2.split(' '));

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

function findSlackUserByName(slackStore: SlackStore, name: string) {
  const result = slackStore.users
    .map(user => {
      return {
        id: user.id,
        score: jaccardSimilarity(name, user.name),
      };
    })
    .sort((a, b) => b.score - a.score)[0];
  if (result && result.score > 0.8) return result;
}

function findSlackUserByGithubUsername(
  slackStore: SlackStore,
  username: string,
) {
  for (const item of slackStore.mapping) {
    if (item.githubs.includes(username)) {
      const user = findSlackUserByEmail(slackStore, item.email);
      if (user) return user;
    }
  }
}

function findSlackUserId(slackStore: SlackStore) {
  const ghUsername = context.payload?.pusher?.name;
  const ghEmail = context.payload?.head_commit?.author?.email;
  const ghAuthorUsername = context.payload?.head_commit?.author?.username;
  const ghAutherName = context.payload?.head_commit?.author?.name;

  const user =
    findSlackUserByGithubUsername(slackStore, ghUsername) ||
    findSlackUserByGithubUsername(slackStore, ghAuthorUsername) ||
    findSlackUserByEmail(slackStore, ghEmail) ||
    findSlackUserByName(slackStore, ghAutherName);
  if (user) return user.id;

  return ghUsername;
}

export async function run() {
  const mappingUrl = core.getInput('mapping_url');
  const slackStore = await readMappingInfo(mappingUrl);
  const slackUserId = findSlackUserId(slackStore);
  core.exportVariable('slack_username', slackUserId);
}

try {
  run();
} catch (error) {
  core.setFailed((error as Error).message);
}
