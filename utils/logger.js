const fs = require('fs');
const path = require('path');
const stringify = require('json-stringify-safe');

require('colors');

class Logger {
	/**
	 *
	 * @param {string} logType Type of log, DB or FILE
	 * @param {string} logPath Path to log directory
	 * @param {number} logRetentionCount Amount of logs to keep before removing old logs
	 * @param {string} loggerName Name of the log file & entries
	 */
	constructor(logType, logPath, logRetentionCount, loggerName, maxLogFileSizeMB, enableDebugLogging = false) {
		this.logType = logType;
		this.path = logPath;
		this.loggerName = loggerName;
		this.logRetentionCount = logRetentionCount;
		this.maxLogFileSizeMB = maxLogFileSizeMB;
		this.timestamp = new Date();

		/**
		 * @private
		 */
		this.enableDebugLogging = enableDebugLogging;

		this.file = this.getLogFilePath();
	}

	/**
	 * @returns {string} Log path
	 */
	get logPath() {
		this.createDirIfDoesntExist();
		return this.path;
	}

	info(msg) {
		this.write(msg, 'info');
	}

	error(msg) {
		this.write(msg, 'error');
	}

	debug(msg) {
		this.write(msg, 'debug');
	}

	warn(msg) {
		this.write(msg, 'warn');
	}

	/**
	 * Create the log dir if it is not presence
	 * @private
	 * @returns {void}
	 */
	createDirIfDoesntExist() {
		if (!fs.existsSync(path.join(this.path))) {
			fs.mkdirSync(path.join(this.path));
		}
	}

	getLogFilePath() {
		const now = new Date();
		const currentFilePath = path.join(this.path, 'latest.log');
		const oldFilePath = path.join(this.path, `${this.loggerName}-${(this.timestamp.getTime() / 1000) | 0}.log`);
		
		// Rename old log file to appname-timestamp.log
		if (fs.existsSync(currentFilePath)) {
			fs.renameSync(currentFilePath, oldFilePath);
		}
		
		this.timestamp = now;
		return currentFilePath;
	}
	

	static formatMessage(message, level) {
		return `[${Date().toLocaleString()}] ${level}: ${message}\n`;
	}

	/**
	 *
	 * @private
	 * @param {string} message Message to log
	 * @param {string} level Level of the log
	 * @returns {void}
	 */
	write(messageContent, level) {
		if (level === 'debug' && !this.enableDebugLogging) return;

		const message = typeof messageContent === 'object' || Array.isArray(messageContent) ? messageContent.message ? messageContent.message : stringify(messageContent, null, ' ') : String(messageContent);
 
		if (this.logType === 'console') {
			switch (level) {
				case 'info':
					console.log('Info: '.blue + message);
					break;
				case 'warn':
					console.warn('Warn: '.yellow + message);
					break;
				case 'error':
					console.error('Error: '.red + message);
					break;
				case 'debug':
					console.debug('Debug: '.green + message);
			}
		} else if (this.logType === 'file') {
			this.createDirIfDoesntExist();

			if (!fs.existsSync(this.file)) {
				fs.writeFileSync(this.file, this.constructor.formatMessage(message, level));
			} else {
				const fileSize = fs.statSync(this.file).size / (1024 * 1024);

				if (fileSize > this.maxLogFileSizeMB) {
					this.file = this.getLogFilePath();

					fs.writeFileSync(this.file, this.constructor.formatMessage(message, level));
				} else {
					fs.appendFileSync(this.file, this.constructor.formatMessage(message, level));
				}
			}

			let files = fs.readdirSync(this.path);

			if (files.length > this.logRetentionCount) {
				fs.unlinkSync(path.join(this.path, files[0]));
			}
		}
	}
}

module.exports = Logger;
