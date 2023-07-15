import fs from 'fs';
import path from 'path';
import * as core from '@actions/core';
import * as github from '@actions/github';
import axios from 'axios';

import { run } from '../src/main';

jest.mock('@actions/core');
jest.mock('@actions/github');
jest.mock('axios');

describe('run', () => {
  beforeEach(() => {
    jest.resetModules();

    // Mock input values
    (
      core.getInput as jest.MockedFunction<typeof core.getInput>
    ).mockReturnValue('https://example.com/mapping.json');

    // Mock axios response
    (axios.get as jest.MockedFunction<typeof axios.get>).mockResolvedValue({
      data: JSON.parse(
        fs
          .readFileSync(path.join(__dirname, 'fixtures', 'slack.json'))
          .toString(),
      ),
    });
  });

  it('should find name from pusher username', async () => {
    (github.context as any) = {
      payload: {
        pusher: {
          name: 'kien-locofy',
        },
      },
    };
    await run();
    expect(core.setOutput).toHaveBeenCalledWith('slack_username', 'kien-slack');
  });

  it('should find name from author username', async () => {
    (github.context as any) = {
      payload: {
        head_commit: {
          author: {
            username: 'kiennt',
          },
        },
      },
    };
    await run();
    expect(core.setOutput).toHaveBeenCalledWith('slack_username', 'kien-slack');
  });

  it('should find name from author email', async () => {
    (github.context as any) = {
      payload: {
        head_commit: {
          author: {
            email: 'kien@locofy.ai',
          },
        },
      },
    };
    await run();
    expect(core.setOutput).toHaveBeenCalledWith('slack_username', 'kien-slack');
  });

  it('should find name from author name', async () => {
    (github.context as any) = {
      payload: {
        head_commit: {
          author: {
            name: 'Kien Nguyen',
          },
        },
      },
    };
    await run();
    expect(core.setOutput).toHaveBeenCalledWith('slack_username', 'kien-slack');
  });
});
