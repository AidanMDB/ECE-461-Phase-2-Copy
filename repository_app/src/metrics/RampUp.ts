import {Metric} from './Metric';
import { URLHandler } from '../utils/URLHandler';
import axios from 'axios';
import { Logger } from '../logUtils';


/**
 * @class RampUp
 * @description 
 * The RampUp class is responsible for calculating the ramp-up score of a repository.
 * The ramp-up score is determined based on the ratio of documentation size to code size.
 * This class extends the Metric class and provides methods to calculate the score by
 * analyzing the repository's files and folders.
 *
 * @example
 * // Creating an instance of RampUp
 * const urlHandler = new URLHandler('https://github.com/user/repo');
 * const rampUp = new RampUp(urlHandler);
 * 
 * // Calculating the ramp-up score
 * await rampUp.calculateScore();
 *
 * @param {URLHandler} url - An instance of URLHandler to handle URL-related operations.
 *
 * @method calculateScore(): Promise<void>
 * Calculates the ramp-up score by analyzing the repository's files and folders.
 * 
 * @method getRepoProgramFileCounts(baseApiUrl: string, path: string="", currentDepth: number = 0, maxDepth: number = 2): Promise<number>
 * Recursively calculates the total size of the programming files in the repository up to a specified depth.
 */
export class RampUp extends Metric {
    jsonKey: string = "RampUp";
    readonly programming_ext = [".js", ".ts", ".py", ".java", ".cpp", ".c", ".cs", ".rb", ".php"];

    /**
     * @method getRepoURL
     * @return {string} The GitHub repository URL if set, otherwise an empty string.
     * @description
     * Returns the GitHub repository URL if set, otherwise an empty string.
     */
    constructor(url: URLHandler) {
        super(url);
    }


    /**
     * @method calculateScore
     * @return {Promise<void>} A promise that resolves when the score calculation is complete.
     * @description
     * Calculates the ramp-up score by analyzing the repository's files and folders.
     * The score is based on the ratio of documentation size to code size.
     */
    async calculateScore(): Promise<void> {
        this.startTimer();  // Start timer for latency
      
        let apiEndpoint = `${this.url.getBaseAPI()}/contents`;   // Get the base API endpoint for files

        // Make API calls to get the file information
        try {
            const response = await axios.get(apiEndpoint, {headers: {'Authorization': `token ${process.env.GITHUB_TOKEN}`}});
            
            const files = response.data; // the files in the repository
            let docs_folder = null;  // name of the documentation folder
            let examples_folder = null;  // name of the examples folder
            let source_folder = null; // name of the source code folder
            let total_code_size = 0;
            let total_documentation_size = 0;

            // Get the size of the README and CHANGELOG files and check for docs, examples, or source folders
            files.forEach((file: any) => {
                if (file.name.toLowerCase() === 'readme.md' || file.name.toLowerCase() === 'changelog.md') {
                    total_documentation_size += file.size;
                }
                else if (file.type === 'dir' && (file.name.toLowerCase() === 'docs' || file.name.toLowerCase() === 'doc' || file.name.toLowerCase() === 'documentation' || file.name.toLowerCase() === 'documents')) {
                    docs_folder = file.name;
                }
                else if (file.type === 'dir' && (file.name.toLowerCase() === 'examples' || file.name.toLowerCase() === 'sample' || file.name.toLowerCase() === 'samples' || file.name.toLowerCase() === 'demos' || file.name.toLowerCase() === 'example')) {
                    examples_folder = file.name;
                }
                else if (file.type === 'dir' && (file.name.toLowerCase() === 'src' || file.name.toLowerCase() === 'source' || file.name.toLowerCase() === 'code' || file.name.toLowerCase() === 'lib')) {
                    source_folder = file.name;
                }
                else if (file.type === 'file' && this.programming_ext.some(ext => file.name.endsWith(ext))) {
                    total_code_size += file.size;
                }
            });

            // Get the size of the documentation and examples folders
            if(docs_folder) {
                const documents = await axios.get(`${apiEndpoint}/${docs_folder}`, {headers: {'Authorization': `token ${process.env.GITHUB_TOKEN}`}});
                documents.data.forEach((doc: any) => {
                    total_documentation_size += doc.size;
                });
            }
            if(examples_folder) {
                const examples = await axios.get(`${apiEndpoint}/${examples_folder}`, {headers: {'Authorization': `token ${process.env.GITHUB_TOKEN}`}});
                examples.data.forEach((example: any) => {
                    total_documentation_size += example.size;
                });
            }
            
            // Get the size of the source code folder
            if(source_folder) {
                // peform a 2-depth recursive search for source code files
                total_code_size += await this.getRepoProgramFileCounts(apiEndpoint, source_folder);
            }

            // ensure that the total code size is not 0 to avoid division by 0
            if(total_documentation_size === 0) {
                this.score = 0;
            }
            else {
                const ramp_up_ratio = (total_documentation_size / total_code_size);

                // for smaller projects
                if(total_code_size < 10000)
                {
                    this.score = (ramp_up_ratio * 5 > 1) ? 1 : ramp_up_ratio * 5;
                    // if 1 line of documentation per 5 lines of code, score is ~1
                }
                else
                {
                    this.score =  (ramp_up_ratio * 1.5 > 1) ? 1 : ramp_up_ratio * 1.5;
                    // if 2 lines of documentation per 3 lines of code, score is ~1
                    // this is higher because larger projects should have more documentation and examples (many lines)
                }
            }

        } catch (error) {
            Logger.logInfo('Ramp up: Error getting repository files and sizes');
            Logger.logDebug(error);
            this.score = 0;
        }

        // End timer for latency
        this.endTimer();
    }

    /**
     * @method getRepoProgramFileCounts
     * @param {string} baseApiUrl - The base API URL for the repository.
     * @param {string} [path=""] - The current path in the repository.
     * @param {number} [currentDepth=0] - The current depth of the recursive search.
     * @param {number} [maxDepth=2] - The maximum depth for the recursive search.
     * @return {Promise<number>} A promise that resolves to the total size of the programming files.
     * @description
     * Recursively calculates the total size of the programming files in the repository up to a specified depth.
     */
    async getRepoProgramFileCounts(baseApiUrl: string, path: string="", currentDepth: number = 0, maxDepth: number = 2): Promise<number> {
        let apiEndpoint = `${baseApiUrl}/${path}`;
        let total_code_size = 0;

        try {
            const response = await axios.get(apiEndpoint, {headers: {'Authorization': `token ${process.env.GITHUB_TOKEN}`}});
            const contents = response.data;

            contents.forEach(async (item: any) => {
                if(item.type === 'dir')
                {
                    if(currentDepth < maxDepth) {
                        total_code_size += await this.getRepoProgramFileCounts(baseApiUrl, item.path, currentDepth + 1, maxDepth);
                    }
                }
                else if(item.type === 'file' && this.programming_ext.some(ext => item.name.endsWith(ext))) {
                    total_code_size += item.size;
                }
            });

            return total_code_size;

        } catch (error) {
            Logger.logInfo('Ramp up: Error getting repository files and sizes');
            Logger.logDebug(error);
            return 0;
        }
    }
}