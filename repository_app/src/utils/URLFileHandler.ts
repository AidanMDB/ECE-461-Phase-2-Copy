import { promises as fs } from 'fs';
import { URLHandler } from './URLHandler';
import { Logger } from '../logUtils';

export class URLFileHandler {
    /**
     * @static @async
     * @function getGithubUrlsFromFile(): reads url from txt file. gets rid of white space and extra '\n's 
     * @param {string} filepath: absolute path to the file
     * @returns {Promise<URLHandler[]>}: returns array of all existing urls
     * @throws {Error}: if file is invalid or URLs are invalid
     */
    public static async getGithubUrlsFromFile(filePath: string): Promise<URLHandler[]> {
        try {
            const data = await fs.readFile(filePath, 'utf-8');
            const urls = data.split('\n').map(line => line.trim()).filter(line => line.length > 0);

            const urlItems: URLHandler[] = [];
            for (const url of urls) {
                if (URLHandler.isValidURL(url)) {
                    const URL = new URLHandler(url);
                    await URL.setRepoURL();

                    const githubUrl = URL.getRepoURL();
                    if (githubUrl !== "") {
                        urlItems.push(URL);
                    }
                    else {
                        // If URL is invalid bc not github/npm, or github URL not found from npm URL, throw Error
                        throw new Error('Not a github/npm URL: ' + url);
                    }
                }
                else {
                    throw new Error('Invalid URL: ' + url);
                }
            }
            return urlItems;
        } catch (error: any) {
            Logger.logDebug(error);
            throw error;
        }
        
    }
}