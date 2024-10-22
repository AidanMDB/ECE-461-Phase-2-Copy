import axios from 'axios';
import { LicenseMetric } from '../../src/metrics/License';
import { URLHandler } from '../../src/utils/URLHandler';

jest.mock('axios');
jest.mock('../../src/utils/URLHandler');

describe('LicenseMetric', () => {
    const repoUrl = 'https://github.com/user/repo';
    let licenseMetric: LicenseMetric;

    beforeEach(() => {
        (URLHandler.prototype.getRepoURL as jest.Mock).mockReturnValue(repoUrl);

        const urlHandler = new URLHandler(repoUrl);
        licenseMetric = new LicenseMetric(urlHandler);
    });

    it('should properly calculate score when LICENSE file exists', async () => {
        const mockResponse = {
            data: {
                license: { spdx_id: 'MIT' }, // License file exists with a compatible license
            },
        };

        (axios.get as jest.Mock).mockResolvedValueOnce(mockResponse);

        await licenseMetric.calculateScore();

        expect(licenseMetric.getScore()).toBe(1); // Expect score to be 1 since the license is compatible
    });

    it('should properly calculate score when LICENSE file does not exist', async () => {
        const mockResponse = {
            data: {
                license: null, // No license file found
            },
        };

        (axios.get as jest.Mock).mockResolvedValueOnce(mockResponse);

        await licenseMetric.calculateScore();

        expect(licenseMetric.getScore()).toBe(0); // Expect score to be 0 since no license file exists
    });

    it('should properly calculate score when LICENSE is incompatible', async () => {
        const mockResponse = {
            data: {
                license: { spdx_id: 'Proprietary' }, // Incompatible license
            },
        };

        (axios.get as jest.Mock).mockResolvedValueOnce(mockResponse);

        await licenseMetric.calculateScore();

        expect(licenseMetric.getScore()).toBe(0); // Expect score to be 0 since the license is incompatible
    });

    it('should properly calculate score when README mentions a compatible license', async () => {
        // First call returns no LICENSE
        (axios.get as jest.Mock).mockRejectedValueOnce(new Error('Not Found'));

        const mockReadmeResponse = {
            data: {
                content: Buffer.from('This project is licensed under the MIT License.').toString('base64'),
            },
        };

        // Second call checks README file for license info
        (axios.get as jest.Mock).mockResolvedValueOnce(mockReadmeResponse);

        await licenseMetric.calculateScore();

        expect(licenseMetric.getScore()).toBe(1); // Expect score to be 1 since README mentions a compatible license
    });

    it('should properly calculate score when no LICENSE and no valid README license', async () => {
        // First call returns no LICENSE
        (axios.get as jest.Mock).mockRejectedValueOnce(new Error('Not Found'));

        const mockReadmeResponse = {
            data: {
                content: Buffer.from('This project has no license').toString('base64'),
            },
        };

        // Second call checks README but finds no valid license
        (axios.get as jest.Mock).mockResolvedValueOnce(mockReadmeResponse);

        await licenseMetric.calculateScore();

        expect(licenseMetric.getScore()).toBe(0); // Expect score to be 0 since neither LICENSE nor README has a valid license
    });
});
