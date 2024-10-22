import fs from 'fs';
import { URLFileHandler } from '../../src/utils/URLFileHandler';
import { URLHandler } from '../../src/utils/URLHandler';

// Mock the fs module
jest.mock('fs');

// Mock the URLHandler class
jest.mock('../../src/utils/URLHandler', () => {
  return {
    URLHandler: jest.fn().mockImplementation(() => {
      return {
        setRepoURL: jest.fn().mockResolvedValue(undefined),
        getRepoURL: jest.fn().mockResolvedValue('https://github.com/user/repo')
      };
    }),
    isValidURL: jest.fn()
  };
});

describe('URLFileHandler', () => {
  describe('getGithubUrlsFromFile', () => {
    let filePath: string;
    let data: string;

    beforeEach(() => {
      filePath = 'file.txt';
      data = 'https://github.com/user/repo\nhttps://github.com/user/repo2';

      (fs.readFile as unknown as jest.Mock<any, any>).mockImplementation((filePath, encoding, callback) => {
        if(filePath === 'file.txt') {
          return data;
        }
        else if(filePath === 'invalid.txt') {
          return 'invalid-url';
        }
        throw new Error('Invalid file');
      });

    });

    it('should throw error for invalid (nonexitant) file', async () => {
      await expect(URLFileHandler.getGithubUrlsFromFile('invalid.file')).rejects.toThrow("Cannot read properties of undefined (reading 'readFile')");
    });
  });
});