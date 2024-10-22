import * as fs from 'fs';
import path from 'path';

enum LogLevel {
    SILENT = 0, // Default log level
    INFO = 1,
    DEBUG = 2,
}

// Set settings from environment variables
const envLogLevel = process.env.LOG_LEVEL
const logLevel = (envLogLevel !== undefined && !isNaN(Number(envLogLevel)) && Object.values(LogLevel).includes(Number(envLogLevel))) ? Number(envLogLevel) : LogLevel.SILENT;
const defaultFilePath = path.join(__dirname, '../default.log');
const logFilePath = process.env.LOG_FILE || defaultFilePath;

// Create log file if it does not exist
if (!fs.existsSync(logFilePath)) {
    fs.writeFileSync(logFilePath, '',  { flag: 'w' });
}

/**
 * [getFileLineInfo] - Extracts the file and line number from the stack trace
 * @param stackTrace 
 * @returns 
 */
const getFileLineInfo = (stackTrace: string): string => {
    // Stack traces typically contain the current file as the first entry
    const lines = stackTrace.split('\n');
    // Usually, the caller's information is the second line (index 1)
    const callerLine = lines[2] || '';
    const match = callerLine.match(/\((.*):(\d+):(\d+)\)/);
    if (match) {
      const [, file, line] = match;
      return `${path.basename(file)}:${line}`;
    }
    return '-:-';
  };

/**
 * [Logger] - Class to log messages to a file
 * @method logInfo
 * Example Usage:
 *      import { Logger } from './<path_to_dir>/logUtils';
 *      Logger.logInfo("Info Message"); // Logs to file if log level is INFO(1) or higher
 *      Logger.logDebug("Debug Message"); // Logs to file if log level is DEBUG(2) or higher
 */
export class Logger {
    /**
     * [logInfo] - Logs message to file if log level is INFO(1) or higher
     * @param message 
     */
    public static logInfo(message: string) {
        if (logLevel >= LogLevel.INFO) {
            try {
                const stackTrace = new Error().stack || '';
                const fileLineInfo = getFileLineInfo(stackTrace);
                fs.appendFileSync(logFilePath, `[${fileLineInfo}] ${message}\n`, 'utf8');
            } catch (error) {
                console.error('Error writing to log file:', error);
            }   
        }
    }
    
    /**
     * [logDebug] - Logs message to file if log level is DEBUG(2) or higher
     * @param message 
     */
    public static logDebug(message: any) {
        if (logLevel >= LogLevel.DEBUG) {
            try {
                const stackTrace = new Error().stack || '';
                const fileLineInfo = getFileLineInfo(stackTrace);
                const logMessage = (message instanceof Error) ? `${message.message}\n${message.stack}` : message;
                fs.appendFileSync(logFilePath, `[${fileLineInfo}] ${logMessage}\n`, 'utf8');
            } catch (error) {
                console.error('Error writing to log file:', error);
            } 
        }
    }
}