
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import { checkGithubToken } from '../src/utils/helper';
import axios from 'axios';
import { URLHandler } from '../src/utils/URLHandler';

const execPromise = promisify(exec);
const usage = `
Usage: ./run [command]

Commands:
  install           Install project dependencies
  test              Run unit tests
  <url_file>        Score modules from URLs listed in file
`;


describe('Test run.ts main', () => {
  describe('Run with no arguments', () => {
    // Test 1 - Run main script with no arguments provided
    it('should throw error, print error, and print usage', async () => {
      // Run the command
      try {
        const { stdout: stdout, stderr:stderr } = await execPromise('./run');
        // Check for errors
        if (stderr) {
            throw new Error(`Error: ${stderr}`);
        }
        expect(null).not.toBeFalsy(); // fail() shouldn't reach this line
      }
      catch (error: any) {
        expect(error.code).not.toBe(0);
        expect(error.stderr).toContain('No arguments provided to ./run');
        expect(error.stderr).toContain(usage);
        
      }      
    });
  });

  describe('No Github token with ./run test or ./run <url_file>', () => {
    const tempToken = process.env.GITHUB_TOKEN;
    beforeEach(() => {
        delete process.env.GITHUB_TOKEN;
    });
    afterEach(() => {
        process.env.GITHUB_TOKEN = tempToken;   
    });
    // Test 2 - Run main script with no Github token
    it('should print Please set the GITHUB_TOKEN environment variable', async () => { 
      delete process.env.GITHUB_TOKEN;
      expect(process.env.GITHUB_TOKEN).toBeUndefined();
      await expect(checkGithubToken()).rejects.toThrow('Please set the GITHUB_TOKEN environment variable');
    });
    // Test 3 - Run main script with invalid Github token
    it ('should print Invalid GitHub token', async() => {
      process.env.GITHUB_TOKEN = "invalid_token";
      await expect(checkGithubToken()).rejects.toThrow('Invalid GitHub token');
    });
  });
});
