import { Metric } from './Metric';
import { URLHandler } from '../utils/URLHandler';
import axios from 'axios';
import { Logger } from '../logUtils';

export class LicenseMetric extends Metric {
    jsonKey: string = "License";

    constructor(url: URLHandler) {
        super(url);
    }

    async calculateScore(): Promise<void> {
        // Start timer for latency
        this.startTimer();

        // Convert the base URL to an API URL
        const apiBase = "https://api.github.com/repos";
        const urlParts = this.url.getRepoURL().split('github.com/')[1].split('/');
        const owner = urlParts[0];
        const repo = urlParts[1];
        const apiEndpoint = `${apiBase}/${owner}/${repo}`;

        // Fetch the license information
        try {
            const response = await axios.get(`${apiEndpoint}/license`, {
                headers: { 'Authorization': `token ${process.env.GITHUB_TOKEN}` }
            });

            const licenseInfo = response.data;
            if (licenseInfo && licenseInfo.license && licenseInfo.license.spdx_id) {
                const licenseId = licenseInfo.license.spdx_id;
                this.score = this.checkLicenseCompatibility(licenseId);
            } else {
                // Fallback to checking the README if no license file is found
                this.score = await this.checkReadmeForLicense(apiEndpoint);
            }

        } catch (error) {
            Logger.logInfo('Error fetching license information - ${this.url.getURL()}');
            Logger.logDebug(error);
            // If we couldn't retrieve the license, set the score to 0
            this.score = await this.checkReadmeForLicense(apiEndpoint);
        }

        // End timer for latency
        this.endTimer();
    }

    /**
     * Check if the license is compatible with LGPLv2.1
     * @param licenseId The SPDX license identifier from the GitHub API
     * @returns A score between 0 and 1 depending on compatibility
     */
    checkLicenseCompatibility(licenseId: string): number {
        // SPDX license IDs compatible with LGPLv2.1
        const compatibleLicenses = [
            "LGPL-2.1", "GPL-2.0", "GPL-2.0-only", "GPL-2.0-or-later", 
            "MIT", "Apache-2.0", "BSD-3-Clause", "BSD-2-Clause"
        ];

        if (compatibleLicenses.includes(licenseId)) {
            return 1;
        } else {
            return 0;
        }
    }

    /**
     * Check the README for a license if no LICENSE file is found
     * @param apiEndpoint The base GitHub API endpoint for the repo
     * @returns A score between 0 and 1 depending on compatibility
     */
    async checkReadmeForLicense(apiEndpoint: string): Promise<number> {
        try {
            const response = await axios.get(`${apiEndpoint}/contents/README.md`, {
                headers: { 'Authorization': `token ${process.env.GITHUB_TOKEN}` }
            });

            const readmeContent = Buffer.from(response.data.content, 'base64').toString('utf-8');
            const licenseMatch = readmeContent.match(/license/i);

            if (licenseMatch) {
                // Simple check if README mentions LGPL or other compatible licenses
                if (readmeContent.match(/LGPL-2.1|GPL|MIT|Apache|BSD/i)) {
                    return 1;
                }
            }

        } catch (error) {
            Logger.logInfo('Error fetching README file: ' + error);
        }

        // Return 0 if no license found in README
        return 0;
    }
}
