import { template } from '@babel/core';
import { urlCommand } from '../../src/commands/urlCommand';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import { Logger } from '../../src/logUtils';
import axios from 'axios';
import { URLHandler } from '../../src/utils/URLHandler';

jest.mock('axios');
jest.mock('../../src/utils/URLHandler');

describe('urlCommand', () => {
    const tempFilePath = path.join(__dirname, 'test.txt');
    let consoleSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;
    describe('URL Command Correct', () => {
        afterEach(async () => {
            // Clean up the temporary file after each test
            if (fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
            }
            if (consoleSpy) {
                consoleSpy.mockRestore()
            }  
        });
        it('should return a list of metrics for a given URL', async () => {
            const mockResponse = {
                data: [
                ],
            };
            (axios.get as jest.Mock).mockResolvedValueOnce(mockResponse);
            (URLHandler.prototype.getURL as jest.Mock).mockReturnValue('https://github.com/user/repos');
            (URLHandler.isValidURL as jest.Mock).mockReturnValue(true);

            consoleSpy = jest.spyOn(console, 'log');
            // Make temp file test.txt with correct URLs on each line: https://github.com/user/repos 
            fs.writeFileSync(tempFilePath, 'https://github.com/user/repo');
            await urlCommand(tempFilePath);

            // Check if stdout contains the expected results
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(
                /{"URL":"(https:\/\/www\.npmjs\.com\/package\/[a-zA-Z0-9\-]+|https:\/\/github\.com\/[a-zA-Z0-9\-]+\/[a-zA-Z0-9\-]+)",\s*"NetScore":(-1|\d+(\.\d+)?),\s*"NetScore_Latency":(-1|\d+(\.\d+)?),\s*"RampUp":(-1|\d+(\.\d+)?),\s*"RampUp_Latency":(-1|\d+(\.\d+)?),\s*"Correctness":(-1|\d+(\.\d+)?),\s*"Correctness_Latency":(-1|\d+(\.\d+)?),\s*"BusFactor":(-1|\d+(\.\d+)?),\s*"BusFactor_Latency":(-1|\d+(\.\d+)?),\s*"ResponsiveMaintainer":(-1|\d+(\.\d+)?),\s*"ResponsiveMaintainer_Latency":(-1|\d+(\.\d+)?),\s*"License":(-1|\d+(\.\d+)?),\s*"License_Latency":(-1|\d+(\.\d+)?)}/
            ));            
        }, 10000);
    });
    describe('URL Command No File', () => {
        afterEach(() => {
            if (consoleErrorSpy) {
                consoleErrorSpy.mockRestore()
            }   
        });
        it('should print ENOENT: no such file or directory, open', async () => {  
            consoleErrorSpy = jest.spyOn(console, 'error');  

            await expect(urlCommand('test1.txt')).rejects.toThrow('ENOENT: no such file or directory, open');
        });
    });
});
