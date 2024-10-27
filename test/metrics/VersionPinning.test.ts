import axios from 'axios';
import { VersionPinning } from '../../src/metrics/VersionPinning'; // Adjust the import path as needed
import { URLHandler } from '../../src/utils/URLHandler';
import { Logger } from '../../src/logUtils';

jest.mock('axios'); // Mock API calls
jest.mock('../../src/utils/URLHandler'); // Mock URL handler

describe('VersionPinning Metric', () => {
    const repo = 'https://github.com/user/repo';
    let versionPinning: VersionPinning; // Global declaration

    beforeEach(() => {
        // Get a fake URL
        (URLHandler.prototype.getRepoURL as jest.Mock).mockReturnValue('https://github.com/user/repo');

        // Create an instance of VersionPinning for each test
        let url = new URLHandler(repo);
        versionPinning = new VersionPinning(url);
    });

    it('should return -1 when endpoint returns an error', async () => {
        (axios.get as jest.Mock).mockRejectedValueOnce(new Error('Network Error'));
        const spy = jest.spyOn(Logger, 'logDebug').mockImplementation(() => {});

        await versionPinning.calculateScore();

        // Check if the score is set to -1
        expect(versionPinning.getScore()).toBe(-1);
    });

    it('should handle edge cases properly', async () => {
        const response = { data: { content: Buffer.from(JSON.stringify({ dependencies: { } })).toString('base64') } };
        (axios.get as jest.Mock).mockResolvedValueOnce(response);

        await versionPinning.calculateScore();

        // Add assertions for edge cases
        expect(versionPinning.getScore()).toBe(1);
    });

    it('should handle edge cases properly', async () => {
        const response = { data: { content: Buffer.from(JSON.stringify({ 
            dependencies: { 'dep1': '1.0.0' } })).toString('base64') } };
        (axios.get as jest.Mock).mockResolvedValueOnce(response);

        await versionPinning.calculateScore();

        // Add assertions for edge cases
        expect(versionPinning.getScore()).toBe(1);
    });

    it('should calculate score with semantic versioning', async () => {
        const response = { data: { content: Buffer.from(JSON.stringify({ 
            dependencies: { 'dep1': '1.0.0', 'dep2': '0.9.2', 'dep3': '0.0.2' } })).toString('base64') } };
        (axios.get as jest.Mock).mockResolvedValueOnce(response);

        await versionPinning.calculateScore();

        // Assuming a score calculation based on the major versions
        expect(versionPinning.getScore()).toBe(1); // Modify according to your specific logic
    });

    it('should handle versions with tilde (~) correctly', async () => {
        const response = { data: { content: Buffer.from(JSON.stringify({ 
            dependencies: { 'dep1': '~1.0.0', 'dep2': '~0.9.2' } })).toString('base64') } };
        (axios.get as jest.Mock).mockResolvedValueOnce(response);

        await versionPinning.calculateScore();

        // Assuming tilde versions are not considered strictly pinned
        expect(versionPinning.getScore()).toBe(0); // Adjust based on your scoring rules
    });

    it('should handle versions with caret (^) correctly', async () => {
        const response = { data: { content: Buffer.from(JSON.stringify({ 
            dependencies: { 'dep1': '^1.0.0', 'dep2': '^0.9.2' } })).toString('base64') } };
        (axios.get as jest.Mock).mockResolvedValueOnce(response);

        await versionPinning.calculateScore();

        // Assuming caret versions are also not considered strictly pinned
        expect(versionPinning.getScore()).toBe(0); // Modify according to your rules
    });

    it('should handle versions with caret (^) correctly', async () => {
        const response = { data: { content: Buffer.from(JSON.stringify({ 
            dependencies: { 'dep1': '^1.0.0', 'dep2': '0.9.2' } })).toString('base64') } };
        (axios.get as jest.Mock).mockResolvedValueOnce(response);

        await versionPinning.calculateScore();

        // Assuming caret versions are also not considered strictly pinned
        expect(versionPinning.getScore()).toBe(0.5); // Modify according to your rules
    });

    // Add more tests as needed for different scenarios
});
