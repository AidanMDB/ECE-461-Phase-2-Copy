import axios, { isAxiosError } from 'axios';

/**
  * [checkForGithubToken] - Checks if the Github token has been set as an environment variable
  * @throws {Error} if the Github token has not been set
  */
export async function checkGithubToken() {
    if (!process.env.GITHUB_TOKEN) {
      throw new Error('Please set the GITHUB_TOKEN environment variable');
    }
    else {
      const token = process.env.GITHUB_TOKEN;
      try {
        const response = await axios.get('https://api.github.com/user', {
          headers: {
            Authorization: `token ${token}`,
          },
        });
      } catch (error) {
        if (isAxiosError(error)) {
          if (error.response && error.response.status === 401) {
            throw new Error('Invalid GitHub token');
          }
        } else {
          throw new Error('Error checking GitHub token');
        }
      }
    }
  }