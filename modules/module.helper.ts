// Helper functions
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import childProcess from 'child_process';
import { console } from './log';

export default class Helper {
	static async question(q: string) {
		const rl = readline.createInterface({ input, output });
		const a = await rl.question(q);
		rl.close();
		return a;
	}
	static formatTime(t: number) {
		const totalSeconds = Math.round(t);
		const days = Math.floor(totalSeconds / 86400);
		const hours = Math.floor((totalSeconds % 86400) / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;
		const daysS = days > 0 ? `${days}d` : '';
		const hoursS = daysS || hours ? `${daysS}${daysS && hours < 10 ? '0' : ''}${hours}h` : '';
		const minutesS = minutes || hoursS ? `${hoursS}${hoursS && minutes < 10 ? '0' : ''}${minutes}m` : '';
		const secondsS = `${minutesS}${minutesS && seconds < 10 ? '0' : ''}${seconds}s`;
		return secondsS;
	}

	static cleanupFilename(n: string) {
		/* eslint-disable no-useless-escape, no-control-regex */
		// Smart Replacer
		const rep: Record<string, string> = {
			'/': '⧸',
			'\\': '⧹',
			':': '：',
			'*': '∗',
			'?': '？',
			'"': "'",
			'<': '‹',
			'>': '›'
		};
		n = n.replace(/[\/\\:\*\?"<>\|]/g, (ch) => rep[ch] || '_');

		// Old Replacer
		const controlRe = /[\x00-\x1f\x80-\x9f]/g;
		const reservedRe = /^\.+$/;
		const windowsReservedRe = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;
		const windowsTrailingRe = /[\. ]+$/;

		return n.replace(controlRe, '_').replace(reservedRe, '_').replace(windowsReservedRe, '_').replace(windowsTrailingRe, '_');
	}

	static exec(
		pname: string,
		fpath: string,
		pargs: string | string[],
		spc = false
	):
		| {
				isOk: true;
		  }
		| {
				isOk: false;
				err: Error & { code: number };
		  } {
		const cleanFpath = fpath.trim().replace(/^["']|["']$/g, '');
		let argsArray: string[];
		if (Array.isArray(pargs)) {
			argsArray = pargs;
		} else {
			// Safe shell argument tokenizer to prevent metacharacter injection
			argsArray = [];
			let current = '';
			let inDoubleQuote = false;
			let inSingleQuote = false;
			for (let i = 0; i < pargs.length; i++) {
				const char = pargs[i];
				if (char === '"' && !inSingleQuote) {
					inDoubleQuote = !inDoubleQuote;
				} else if (char === "'" && !inDoubleQuote) {
					inSingleQuote = !inSingleQuote;
				} else if (/\s/.test(char) && !inDoubleQuote && !inSingleQuote) {
					if (current.length > 0) {
						argsArray.push(current);
						current = '';
					}
				} else {
					current += char;
				}
			}
			if (current.length > 0) {
				argsArray.push(current);
			}
		}
		const logArgs = argsArray.map((a) => (a.includes(' ') ? `"${a}"` : a)).join(' ');
		console.info(`\n> "${pname}" ${logArgs}${spc ? '\n' : ''}`.trim());
		try {
			childProcess.execFileSync(cleanFpath, argsArray, { stdio: 'inherit', windowsHide: true });
			return {
				isOk: true
			};
		} catch (er) {
			const err = er as Error & { status?: number };
			return {
				isOk: false,
				err: {
					...err,
					code: err.status ?? 1
				}
			};
		}
	}
}
