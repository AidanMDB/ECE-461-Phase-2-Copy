import { Logger } from '../../src/logUtils';
import { URLHandler } from '../../src/utils/URLHandler';
import axios from 'axios';

jest.mock('axios');

describe('URLHandler', () => {
    let urlHandler: URLHandler;

    beforeEach(() => {
        urlHandler = new URLHandler('https://github.com/user/repo');
    });

    // describe('setRepoURL', () => {
    //     it('should set the repository URL', async () => {
    //         await urlHandler.setRepoURL('https://github.com/new/repo');
    //         expect(urlHandler.getRepoURL()).toBe('https://github.com/new/repo');
    //     });
    // });

    // describe('getRepoURL', () => {
    //     it('should return the repository URL', async () => {
    //         const repoURL = await urlHandler.getRepoURL();
    //         expect(repoURL).toBe('https://github.com/user/repo');
    //     });
    // });

    describe('isValidURL', () => {
        it('should return true for a valid URL', () => {
            expect(URLHandler.isValidURL('https://github.com/user/repo')).toBe(true);
        });

        it('should return false for an invalid URL', () => {
            expect(URLHandler.isValidURL('invalid-url')).toBe(false);
        });

        it('should return false for an empty URL', () => {
            expect(URLHandler.isValidURL('')).toBe(false);
        });
    });

    describe('checkUrlExists', () => {
        beforeEach( () => {
            global.fetch = jest.fn();
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return true for an existing URL', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
            const exists = await URLHandler.checkUrlExists('https://github.com/user/repo'); // Add URL
            expect(exists).toBe(true);
            expect(global.fetch).toHaveBeenCalledWith('https://github.com/user/repo', {'method': 'HEAD'});
        });

        it('should return false for a non-existing URL', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({ ok: false });
            const exists = await URLHandler.checkUrlExists('https://github.com/nonexistent/repo'); // Add URL
            expect(exists).toBe(false);
            expect(global.fetch).toHaveBeenCalledWith('https://github.com/nonexistent/repo', {'method': 'HEAD'});
        });
    });

    describe('setRepoURL', () => {
        beforeEach( () => {
            (axios.get as jest.Mock).mockImplementation(url => {
                if(url.startsWith('https://www.npmjs.com/package/')) {
                    return Promise.resolve({ status: 200, data: { repository: { url: 'https://github.com/expressjs/express' } } });
                }
                return Promise.reject({ response: { status: 404 } });
            });

            global.fetch = jest.fn();
            
            jest.spyOn(URLHandler, 'isValidURL').mockImplementation(url => url.startsWith('https://'));
            jest.spyOn(URLHandler, 'checkUrlExists').mockImplementation(url => {
                if(url.startsWith('https://')) {
                    return Promise.resolve(true);
                }
                return Promise.resolve(false);
            });
            jest.spyOn(URLHandler, 'getGithubURLFromNpmURL').mockImplementation(url => {
                if(url.startsWith('https://www.npmjs.com/package/')) {
                    return Promise.resolve('https://www.github.com/expressjs/express');
                }
                return Promise.reject('Invalid URL');
            });
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should set the repository URL for an npm URL', async () => {
            urlHandler = new URLHandler('https://www.npmjs.com/package/express');
            expect(urlHandler.getRepoURL()).toBe("");
            await urlHandler.setRepoURL();
            expect(urlHandler.getRepoURL()).toBe('https://www.github.com/expressjs/express');
        });

        it('should set the repository URL for a github URL', async () => {
            urlHandler = new URLHandler('https://github.com/expressjs/express');
            await urlHandler.setRepoURL();
            expect(urlHandler.getRepoURL()).toBe('https://github.com/expressjs/express');
        });

        it('should not set the repository URL for an invalid URL', async () => {
            urlHandler = new URLHandler('invalid-url');
            await urlHandler.setRepoURL();
            expect(urlHandler.getRepoURL()).toBe("");
        });

        it('should not set the repository URL for a non-github/npm URL', async () => {
            urlHandler = new URLHandler('https://www.google.com');
            await urlHandler.setRepoURL();
            expect(urlHandler.getRepoURL()).toBe("");
        });
    });

    describe('getGithubURLFromNpmURL', () => {
        beforeEach(() => {
            (axios.get as jest.Mock).mockImplementation(url => {
                if (url === 'https://registry.npmjs.org/express') {
                    return Promise.resolve({
                        data: {repository: { type: 'git', url: 'git+https://github.com/expressjs/express.git' }}
                    });
                } else if (url === 'https://registry.npmjs.org/nonexistent') {
                    return Promise.resolve({
                        data: {repository: {}}
                    });
                }
                return Promise.reject(new Error('404 Not Found'));
            });
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return the GitHub URL from a valid npm package URL', async () => {
            const githubURL = await URLHandler.getGithubURLFromNpmURL('https://www.npmjs.com/package/express');
            expect(githubURL).toBe('https://github.com/expressjs/express');
        });

        it('should return null if no GitHub URL is found in the npm package page', async () => {
            const githubURL = await URLHandler.getGithubURLFromNpmURL('https://www.npmjs.com/package/nonexistent');
            expect(githubURL).toBe(null);
        });

        it('should return null if the npm package URL is invalid', async () => {
            const githubURL = await URLHandler.getGithubURLFromNpmURL('https://www.npmjs.com/package/invalid');
            expect(githubURL).toBe(null);
        });

        it('should handle errors gracefully', async () => {
            const githubURL = await URLHandler.getGithubURLFromNpmURL('https://www.npmjs.com/package/error');
            expect(githubURL).toBe(null);
        });
    });
});