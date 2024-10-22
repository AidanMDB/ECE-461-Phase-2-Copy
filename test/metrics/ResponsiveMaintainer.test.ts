import { getJSDocCommentsAndTags } from 'typescript';
import { ResponsiveMetric } from '../../src/metrics/ResponsiveMetric';
import { URLHandler } from '../../src/utils/URLHandler';
import axios from 'axios';

jest.mock('axios');
jest.mock('../../src/utils/URLHandler');

describe ('ResponsiveMetric', () => {

    // Test 1: Test the constructor
    // Expect: score = -1, url !== null, latency = -1, start = -1
    it('should create a new ResponsiveMetric object', () => {
        const url = new URLHandler('https://github.com/yargs/yargs');
        url.setRepoURL();
        const responsiveMetric = new ResponsiveMetric(url);
        expect(responsiveMetric.getScore()).toBe(-1);
        expect(responsiveMetric.getURLHandler()).not.toBeNull();
        expect(responsiveMetric.latency).toBe(-1);
        expect(responsiveMetric.start).toBe(-1);
        expect(responsiveMetric.jsonKey).toBe('ResponsiveMaintainer');
        expect(responsiveMetric.getJsonObject()).toEqual({'ResponsiveMaintainer': -1, 'ResponsiveMaintainer_Latency': -1});

    });

    // Test 2: Test calculateScore() on repo with no issues/PR
    // Expect: score = 0
    it('should calculate score of 0 for a URL with no issues/PR', async () => {
        const mockResponse = {
            data: [
            ],
            headers: {'x-ratelimit-remaining': 1000}
        };
        (axios.get as jest.Mock).mockResolvedValueOnce(mockResponse);
        (axios.get as jest.Mock).mockResolvedValueOnce(mockResponse);
        (URLHandler.prototype.getURL as jest.Mock).mockReturnValue('https://github.com/user/repos');
        (URLHandler.isValidURL as jest.Mock).mockReturnValue(true);

        const url = new URLHandler('https://github.com/user/repos');
        await url.setRepoURL();
        const responsiveMetric = new ResponsiveMetric(url);
        await responsiveMetric.calculateScore();
        expect(responsiveMetric.getScore()).toBe(0);
    });

    // Test 3: Calculate score on repo with PRs and issues
    it('should calculate score > 0 for a URL with PRs and issues', async () => {
        const twoMonthsAgo = new Date();
        twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
        const closedAtDate = new Date(twoMonthsAgo);
        closedAtDate.setDate(closedAtDate.getDate() + 2); // Add 2 days
        const mockResponse = {
            data: [
                {
                    id: 2,
                    title: 'Issue 2',
                    created_at: twoMonthsAgo.toISOString(), // Created three months ago
                    closed_at: closedAtDate.toISOString(), // Closed now
                    state: 'closed',
                    comments: 3
                }
            ],
            headers: { 'x-ratelimit-remaining': 1000 } // Setting a positive rate limit
        };
        (axios.get as jest.Mock).mockResolvedValueOnce(mockResponse);
        const mockResponse2 = {
            data: [
                {
                    id: 1,
                    title: 'Pull Request 2',
                    created_at: twoMonthsAgo.toISOString(), // Created three months ago
                    closed_at: closedAtDate.toISOString(), // Closed now
                    state: 'closed',
                    comments: 3
                }
            ],
            headers: {'x-ratelimit-remaining': 1000}
        };
        (axios.get as jest.Mock).mockResolvedValueOnce(mockResponse2);
        (URLHandler.prototype.getURL as jest.Mock).mockReturnValue('https://github.com/user/repos');
        (URLHandler.isValidURL as jest.Mock).mockReturnValue(true);

        const url = new URLHandler('https://github.com/user/repos');
        await url.setRepoURL();
        const responsiveMetric = new ResponsiveMetric(url);
        await responsiveMetric.calculateScore();
        expect(responsiveMetric.getScore()).toBeGreaterThan(0);
    });
});