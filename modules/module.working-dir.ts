import path from 'path';

export const workingDir = (
	process as NodeJS.Process & {
		pkg?: unknown;
	}
).pkg
	? path.dirname(process.execPath)
	: process.env.contentDirectory
		? process.env.contentDirectory
		: path.join(__dirname, '/..');
