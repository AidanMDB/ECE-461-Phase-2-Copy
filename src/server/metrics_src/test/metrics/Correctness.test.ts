import { URLHandler } from '../../src/utils/URLHandler';
import { Correctness } from '../../src/metrics/Correctness';
import axios from 'axios';

jest.mock('axios');
jest.mock('../../src/utils/URLHandler');

describe('Correctness Metric', () => {
    // Test 1: Test the constructor
    test('Test Correctness constructor', () => {
        const url = new URLHandler('https://github.com/yargs/yargs');
        url.setRepoURL();
        const corMetric = new Correctness(url);
        expect(corMetric.getScore()).toBe(-1);
        expect(corMetric.getURLHandler()).not.toBeNull();
        expect(corMetric.latency).toBe(-1);
        expect(corMetric.start).toBe(-1);
        expect(corMetric.jsonKey).toBe('Correctness');
        expect(corMetric.getJsonObject()).toEqual({'Correctness': -1, 'Correctness_Latency': -1});
    });

    // Test 2: Test Repo with no issues
    test('Test Correctness with no issues', async () => {
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
        const corMetric = new Correctness(url);
        await corMetric.calculateScore();
        expect(corMetric.getScore()).toBe(0);
    });

    // Test 3: Test Repo with issues
    test('Test Correctness with no issues', async () => {
        const mockOpenIssuesResponse = {
            data: {
                total_count: 1, // One open issue
                items: [
                    {
                        id: 101,
                        title: 'Issue 1',
                        state: 'open' // Open issue
                    }
                ]
            },
            headers: { 'x-ratelimit-remaining': 1000 } // Example rate limit header
        };
        const mockClosedIssuesResponse = {
            data: {
                total_count: 2, // Two closed issues
                items: [
                    {
                        id: 102,
                        title: 'Issue 2',
                        state: 'closed' // Closed issue
                    },
                    {
                        id: 103,
                        title: 'Issue 3',
                        state: 'closed' // Closed issue
                    }
                ]
            },
            headers: { 'x-ratelimit-remaining': 1000 } // Example rate limit header
        };
        (axios.get as jest.Mock).mockResolvedValueOnce(mockOpenIssuesResponse);
        (axios.get as jest.Mock).mockResolvedValueOnce(mockClosedIssuesResponse);
        (URLHandler.prototype.getURL as jest.Mock).mockReturnValue('https://github.com/user/repos');
        (URLHandler.isValidURL as jest.Mock).mockReturnValue(true);

        const url = new URLHandler('https://github.com/user/repos');
        await url.setRepoURL();
        const corMetric = new Correctness(url);
        await corMetric.calculateScore();
        expect(corMetric.getScore()).toBeGreaterThan(0);
    });
    
});