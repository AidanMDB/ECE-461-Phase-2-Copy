import axios from 'axios';
import { EngineeringProcess } from '../../src/metrics/EngineeringProcess';
import { URLHandler } from '../../src/utils/URLHandler';

jest.mock('axios');
jest.mock('../../src/utils/URLHandler');

describe('EngineeringProcess', () => {
    const repoUrl = 'https://github.com/user/repo';
    let engineeringProcess: EngineeringProcess;

    beforeEach(() => {
        (URLHandler.prototype.getRepoURL as jest.Mock).mockReturnValue('https://github.com/user/repo');

        let urlHandler = new URLHandler(repoUrl);
        engineeringProcess = new EngineeringProcess(urlHandler);
    });

    it('should properly calculate score when score > 1', async () => {
        const mockResponse = {
            data: {
                data: {
                    repository: {
                        pullRequests: {
                            nodes: [
                                {reviewDecision: 'APPROVED',    additions: 10},
                                {reviewDecision: 'APPROVED',    additions: 10},
                                {reviewDecision: null,          additions: 10},
                                {reviewDecision: null,          additions: 10},
                            ],
                            pageInfo: {
                                hasNextPage: false,
                                endCursor: null
                            }
                        }
                    }
                }
            }
        };

        (axios.post as jest.Mock).mockResolvedValueOnce(mockResponse);

        await engineeringProcess.calculateScore();

        expect(engineeringProcess.getScore()).toBe(0.5);
    });

});