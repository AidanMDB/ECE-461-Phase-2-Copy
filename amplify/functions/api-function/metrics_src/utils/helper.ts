/**
 * This file is for handling the helper functions used in the metrics functions.
**/

import axios, { isAxiosError } from 'axios';
import { secret } from '@aws-amplify/backend';
/**
  * [checkForGithubToken] - Checks if the Github token has been set as an environment variable
  * @throws {Error} if the Github token has not been set
  */
export async function checkGithubToken() {
    if (!secret('GITHUB_TOKEN')) {
      console.log('Please set the GITHUB_TOKEN secret variable');
    }
    else {
      const token = secret('GITHUB_TOKEN');
      try {
        const response = await axios.get('https://api.github.com/user', {
          headers: {
            Authorization: `token ${token}`,
          },
        });
      } catch (error) {
        if (isAxiosError(error)) {
          if (error.response && error.response.status === 401) {
            console.log('Invalid GitHub token');
          }
        } else {
          console.log('Error checking GitHub token');
        }
      }
    }
  }