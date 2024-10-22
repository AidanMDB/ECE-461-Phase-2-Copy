import {Metric} from './Metric';
import { URLHandler } from '../utils/URLHandler';
import axios from 'axios';
import { Logger } from '../logUtils';

/**
 * @class ResponsiveMetric
 * @extends Metric
 * @description
 * The ResponsiveMetric class is responsible for calculating the responsive metric score.
 * The responsive metric score is based on the average response time of the PRs and Issues.
 * The score is normalized between 0 and 1 using a logistic function.
 */
export class ResponsiveMetric extends Metric {
    jsonKey: string = "ResponsiveMaintainer";

    constructor(url: URLHandler) {
        super(url);
    }

    /**
     * @Method calculateScore
     * @return {Promise<void>} A promise that resolves when the score calculation is complete.
     * @description
     * Calculates the responsive metric score by analyzing the response times for PRs and Issues.
     * The score is based on the average response time of the PRs and Issues.
     */
    async calculateScore(): Promise<void> {
        // Start timer for latency
        this.startTimer();
        try {
            Logger.logInfo(`Calculating Responsive Metric Score for:  ${this.url.getRepoURL()}`);

            // Fetch issues and pull requests from past two months
            const { issuesResponse, pullRequestsResponse } = await this.responsiveMetricAPICall();

            const issues = issuesResponse.data;
            const pullRequests = pullRequestsResponse.data

            // Calculate the average response time for issues and pull requests
            const avgResponseTime = this.calculateAvgResponseTime(issues, pullRequests);

            // Adjust the score to account for more gradual scaling
            this.score = this.normalizeResponseMetric(avgResponseTime);
            
        } catch (error) {
            Logger.logInfo(`Error in calculating ResponsiveMaintainer metric... Score set to 0... Repo Name: ${this.url.getRepoName()}`);
            Logger.logDebug(error);
            throw new Error("Responsive Metric: Error in calculating score.");
        } 
        // End timer for latency
        this.endTimer();
    }

    /**
     * @method responsiveMetricAPICall
     * @description Makes git REST API calls using axios to fetch issues and pull requests data from the past three months
     * @returns {Promise<{ issuesResponse: any, pullRequestsResponse: any }>} A promise that resolves with the issues and pull requests response data.
     * 
     * @throws {Error} Throws an error if the GitHub token is missing.
     * @throws {Error} Throws an error if there is an issue with the API call.
     */
    private async responsiveMetricAPICall(): Promise<{ issuesResponse: any, pullRequestsResponse: any }> {

        // Get GitHub token
        const gitToken = process.env.GITHUB_TOKEN;

        if (!gitToken) {
            throw new Error("GitHub token is missing. Please set the GITHUB_TOKEN environment variable.");
        }

        let issuesApiEndpoint = `${this.url.getBaseAPI()}/issues`;
        let prApiEndpoint = `${this.url.getBaseAPI()}/pulls`;

        // Calculate two months ago date
        const today = new Date();
        const twoMonthsAgo = new Date(today.setMonth(today.getMonth() - 3)).toISOString();

        try {
            // Get issues
            const issuesResponse = await axios.get(issuesApiEndpoint, {
                headers: { Authorization: `Bearer ${gitToken}` },
                params: { state: 'all', since: twoMonthsAgo }
            });

            // Check if we hit a rate limit
            const rateLimitRemainingIssues = issuesResponse.headers['x-ratelimit-remaining'];
            if (rateLimitRemainingIssues && rateLimitRemainingIssues <= 0) {
                throw new Error("GitHub API rate limit exceeded.");
            }
    
            // Get pull requests
            const pullRequestsResponse = await axios.get(prApiEndpoint, {
                headers: { Authorization: `Bearer ${gitToken}` },
                params: { state: 'all' }
            });

            // Check if we hit a rate limit
            const rateLimitRemainingPR = pullRequestsResponse.headers['x-ratelimit-remaining'];
            if (rateLimitRemainingPR && rateLimitRemainingPR <= 0) {
                throw new Error("GitHub API rate limit exceeded.");
            }
    
            // Return both responses
            return { issuesResponse , pullRequestsResponse };
    
        } catch (error: any) {
            Logger.logInfo(`Error in fetching issues and pull requests... Repo Name: ${this.url.getRepoName()}`);
            Logger.logDebug(error);
            throw new Error("Responsive Metric: Error in fetching issues and pull requests");
        }
    }

    /**
     * @method calculateAvgResponseTime
     * @description Calculates the average response time from issue and pull request data.
     * @param {Array<any>} issues
     * @param {Array<any>} pullRequests
     * @returns {number} The average response time in milliseconds.
     */
    private calculateAvgResponseTime(issues: Array<any>, pullRequests: Array<any>) : number {
        const allResponseTimes: number[] = [];

        // Calculate response times for issues and pull requests
        for (const issue of issues) {
            if (issue.comments > 0 && issue.closed_at) {
            const createdAt = new Date(issue.created_at).getTime();
            const closedAt = new Date(issue.closed_at).getTime();
            allResponseTimes.push(closedAt - createdAt);
            }
        }
        for (const pr of pullRequests) {
            if (pr.comments > 0 && pr.closed_at) {
            const createdAt = new Date(pr.created_at).getTime();
            const closedAt = new Date(pr.closed_at).getTime();
            allResponseTimes.push(closedAt - createdAt);
            }
        }

        if (allResponseTimes.length === 0) {
            Logger.logDebug(`No response times found for issues or pull requests... Repo: ${this.url.getURL()}`);
            return 0;
        }

        // Calculate the average response time
        const totalTime = allResponseTimes.reduce((a, b) => a + b, 0);
        const avgResponseTime = totalTime / allResponseTimes.length;

        Logger.logInfo(`Issues/PRs Average Response Time: ${avgResponseTime}`);

        return avgResponseTime;
    }

    /**
     * @method normalizeResponseMetric
     * @description Normalizes the response time between 0 and 1 using a logistic function.
     * @param {number} avgResponseTime 
     * @returns {number} The normalized response time score.
     */
    private normalizeResponseMetric(avgResponseTime: number) : number {
        // Constants for min and max response times
        const minResponseTime = 1000 * 60 * 60 * 24; // 1 day in milliseconds
        const maxResponseTime = 1000 * 60 * 60 * 24 * 30; // 30 days in milliseconds
        let respScore: number = 0;
        if (avgResponseTime) {
            // Cap the avgResponseTime between minResponseTime and maxResponseTime
            const cappedResponseTime = Math.max(minResponseTime, Math.min(avgResponseTime, maxResponseTime));
            const normalizedTime = (cappedResponseTime - minResponseTime) / (maxResponseTime - minResponseTime);

            // Normalize the response time between 0 and 1
            const k = 6;
            respScore = 1 / (1 + Math.exp(k * (normalizedTime - 0.5)));
        }

        // Make sure the score doesn't go below 0 or above 1
        respScore = Math.max(0, Math.min(respScore, 1));

        return respScore;
    }
}