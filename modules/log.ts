import fs from 'fs';
import path from 'path';
import log4js from 'log4js';
import { workingDir } from './module.working-dir';

const getLogFolder = () => path.join(workingDir, 'logs');
const getLatestLog = () => path.join(getLogFolder(), 'latest.log');

const makeLogFolder = () => {
	const logFolder = getLogFolder();
	const latest = getLatestLog();
	if (!fs.existsSync(logFolder)) fs.mkdirSync(logFolder, { recursive: true });
	if (fs.existsSync(latest)) {
		const stats = fs.statSync(latest);
		fs.renameSync(latest, path.join(logFolder, `${stats.mtimeMs}.log`));
	}
};

const makeLogger = () => {
	global.console.log =
		global.console.info =
		global.console.warn =
		global.console.error =
		global.console.debug =
			(...data: any[]) => {
				console.info(data.length >= 1 ? data.shift() : '', ...data);
			};
	makeLogFolder();
	log4js.configure({
		appenders: {
			console: {
				type: 'console',
				layout: {
					type: 'pattern',
					pattern: process.env.isGUI === 'true' ? '%[%x{info}%m%]' : '%x{info}%m',
					tokens: {
						info: (ev) => {
							return ev.level.levelStr === 'INFO' ? '' : `[${ev.level.levelStr}] `;
						}
					}
				}
			},
			file: {
				type: 'file',
				filename: getLatestLog(),
				layout: {
					type: 'pattern',
					pattern: '%x{info}%m',
					tokens: {
						info: (ev) => {
							return ev.level.levelStr === 'INFO' ? '' : `[${ev.level.levelStr}] `;
						}
					}
				}
			}
		},
		categories: {
			default: {
				appenders: ['console', 'file'],
				level: 'all'
			}
		}
	});
};

const getLogger = () => {
	if (!log4js.isConfigured()) makeLogger();
	return log4js.getLogger();
};

export const console = getLogger();
