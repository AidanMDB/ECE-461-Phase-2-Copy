import { Metric } from "./Metric";
import { URLHandler } from "../utils/URLHandler";
import axios from 'axios';
import { Logger } from '../logUtils';

/**
 * @class EngineeringProcess
 * @description
 * The EngineeringProcess class is responsible for calculating the engineering process score of a repository.
 * The engineering process score is determined based on the fractino of code introduced through pull-requests with a code review.
 * 
 * @example
 * // Creating an instance of EngineeringProcess
 * const urlHandler = new URLHandler('https://github.com/user/repo');
 * const engineeringProcess = new EngineeringProcess(urlHandler);
 * 
 * // Calculating the engineering process score
 * await engineeringProcess.calculateScore();
 * 
 * @param {URLHandler} url - An instance of URLHandler to handle URL-related operations.
 * 
 * @method calculateScore(): Promise<void>
 * Calculates the engineering process score by analyzing the repository's pull requests.
 * 
 * 
 * 
 */
export class EngineeringProcess extends Metric {
    jsonKey: string = "EngineeringProcess";
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
     * Calculates the engineering process score by analyzing the repository's pull requests.
     * Checks if the pull-request was merged if so then it is considered as a code review.
     * for more info on the API endpoint, see:
     * https://docs.github.com/en/rest/pulls/pulls?apiVersion=2022-11-28#list-pull-requests 
     */
    async calculateScore(): Promise<void> {
        this.startTimer();  // Start timer for latency

        let apiEndpoint = `https://api.github.com/graphql`;   // Get the base API endpoint for GraphQL requests

        const query = `
            query {
                repository(owner: "${this.url.getOwnerName()}", name: "${this.url.getRepoName()}") {
                    pullRequests(states: MERGED, first: 100) {
                        nodes {
                            title
                            reviewDecision
                            additions
                        }
                        pageInfo {
                            hasNextPage
                            endCursor
                        }
                    }
                }
            } `;

        let variables = {after: null as string | null};  // variables to store the cursor for pagination

        try {
            let hasNextPage = true;         // flag to check if there are more pages of pull requests
            let approved_additions = 0;     // total number of lines of code approved in pull requests
            let total_additions = 0;        // total number of lines of code in pull requests

            while (hasNextPage) {
                const response = await axios.post(apiEndpoint, {query, variables}, {headers: {'Authorization': `token ${process.env.GITHUB_TOKEN}`}});
                
                // search through returned pull requests
                for (const pullRequest of response.data.repository.pullRequests.nodes) {
                    if (pullRequest.reviewDecision === 'APPROVED') {
                        approved_additions += pullRequest.additions;
                    }
                    total_additions += pullRequest.additions;
                }
                
                // check for next page of pull requests
                hasNextPage = response.data.repository.pullRequests.pageInfo.hasNextPage;
                variables.after = response.data.repository.pullRequests.pageInfo.endCursor;
            }
            
            this.score = approved_additions / total_additions;  // calculate the engineering process score
        } catch(error) {
            Logger.logInfo('EngineeringProcess: Error in fetching pull requests');
            Logger.logDebug(error);
            this.score = 0;
        }

        this.endTimer();    // End timer for latency
    }
}