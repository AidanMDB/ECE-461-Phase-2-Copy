import axios from 'axios';
import { RampUp } from '../../src/metrics/RampUp';
import { URLHandler } from '../../src/utils/URLHandler';

jest.mock('axios');
jest.mock('../../src/utils/URLHandler');

describe('RampUp', () => {
    const repoUrl = 'https://github.com/user/repo';
    let rampUp: RampUp;

    beforeEach(() => {
        (URLHandler.prototype.getRepoURL as jest.Mock).mockReturnValue('https://github.com/user/repo');

        let urlHandler = new URLHandler(repoUrl);
        rampUp = new RampUp(urlHandler);
    });

    it('should properly calculate score when score > 1', async () => {
        const mockResponse = {
            data: [
                { type: 'file', name: 'index.js', path: 'index.js', size: 100 },
                { type: 'file', name: 'README.md', path: 'README.md', size: 100 },
                { type: 'file', name: 'app.ts', path: 'app.ts', size: 50},
                { type: 'file', name: 'style.css', path: 'style.css', size: 50 },
            ],
        };

        (axios.get as jest.Mock).mockResolvedValueOnce(mockResponse);

        await rampUp.calculateScore();

        expect(rampUp.getScore()).toBe(1);
    });

    it('should properly calculate score when score < 1 and > 0', async () => {
        const mockResponse = {
            data: [
                { type: 'file', name: 'index.js', path: 'index.js', size: 100 },
                { type: 'file', name: 'README.md', path: 'README.md', size: 10 },
                { type: 'file', name: 'app.ts', path: 'app.ts', size: 100},
                { type: 'file', name: 'style.css', path: 'style.css', size: 50 },
            ],
        };

        (axios.get as jest.Mock).mockResolvedValueOnce(mockResponse);
        await rampUp.calculateScore();

        expect(rampUp.getScore()).toBeLessThan(1);
        expect(rampUp.getScore()).toBeGreaterThan(0);
    });

    it('should properly calculate score when no documentation files', async () => {
        const mockResponse = {
            data: [
                { type: 'file', name: 'test.js', path: 'test.js', size: 10 },
            ]
        };

        (axios.get as jest.Mock).mockResolvedValueOnce(mockResponse);
        await rampUp.calculateScore();

        expect(rampUp.getScore()).toBe(0);
    });

    it('should properly calculate score when no programming files', async () => {
        const mockResponse = {
            data: [
                { type: 'file', name: 'README.md', path: 'README.md', size: 10 },
            ]
        };

        (axios.get as jest.Mock).mockResolvedValueOnce(mockResponse);
        await rampUp.calculateScore();

        expect(rampUp.getScore()).toBe(1);
    });

    it('should properly calculate score when looping through 1 level of files', async () => {
        const mockResponse = {
            data: [
            { type: 'file', name: 'README.md', path: 'README.md', size: 100 },
            { type: 'dir', name: 'src', path: 'src' },
            { type: 'file', name: 'src/app.ts', path: 'src/app.ts', size: 150 },
            ],
        };

        (axios.get as jest.Mock).mockResolvedValueOnce(mockResponse);

        await rampUp.calculateScore();

        expect(rampUp.getScore()).toBe(1);
    });

    it('should properly calculate score when looping through 2 levels of files', async () => {
        const mockResponse = {
            data: [
            { type: 'file', name: 'README.md', path: 'README.md', size: 100 },
            { type: 'dir', name: 'src', path: 'src' },
            { type: 'dir', name: 'src/components', path: 'src/components' },
            { type: 'file', name: 'src/components/component.ts', path: 'src/components/component.ts', size: 150 },
            ],
        };

        (axios.get as jest.Mock).mockResolvedValueOnce(mockResponse);

        await rampUp.calculateScore();

        expect(rampUp.getScore()).toBe(1);

    });
});