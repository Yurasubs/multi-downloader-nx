process.argv = ['node', 'unit.test.ts', '--skipUpdate'];
import { describe, expect, test } from 'bun:test';
import Helper from '../modules/module.helper';
import parseFileName from '../modules/module.filename';
import { Variable } from '../modules/module.filename';
import Merger from '../modules/module.merger';
import packageJson from '../package.json';

describe('multi-downloader-nx Unit & Logic Tests', () => {
	test('formatTime precision & overflow rounding', () => {
		expect(Helper.formatTime(0)).toBe('0s');
		expect(Helper.formatTime(59)).toBe('59s');
		expect(Helper.formatTime(60)).toBe('1m00s');
		expect(Helper.formatTime(119.5)).toBe('2m00s'); // previously "1m60s"
		expect(Helper.formatTime(3665)).toBe('1h01m05s');
	});

	test('parseFileName does not mutate input variables or leak overrides', () => {
		const originalVars: Variable[] = [
			{ name: 'title', type: 'string', replaceWith: 'Episode 1' },
			{ name: 'episode', type: 'number', replaceWith: 1 }
		];

		// Call 1 with override
		const res1 = parseFileName('${title} - ${episode}', originalVars, 2, ["title='CustomTitle'"]);
		expect(res1[0]).toContain('CustomTitle');

		// Verify originalVars was not mutated
		expect(originalVars[0].replaceWith).toBe('Episode 1');

		// Call 2 without override should use original title
		const res2 = parseFileName('${title} - ${episode}', originalVars, 2, []);
		expect(res2[0]).toContain('Episode 1');
	});

	test('Consistent Sort Comparator', () => {
		const list = [{ duration: 100 }, { duration: undefined }, { duration: 50 }, { duration: NaN }];

		list.sort((a, b) => {
			const aDur = typeof a.duration === 'number' && !isNaN(a.duration) ? a.duration : Infinity;
			const bDur = typeof b.duration === 'number' && !isNaN(b.duration) ? b.duration : Infinity;
			if (aDur === bDur) return 0;
			return aDur - bDur;
		});

		expect(list[0].duration).toBe(50);
		expect(list[1].duration).toBe(100);
	});

	test('TLS verification untouched in environment', () => {
		expect(process.env.NODE_TLS_REJECT_UNAUTHORIZED).not.toBe('0');
	});

	test('Merger.cleanUp handles non-existent files gracefully without throwing ENOENT', () => {
		const merger = new Merger({
			videoAndAudio: [{ path: 'non_existent_video.mp4', lang: { name: 'Japanese', code: 'jpn', locale: 'ja' } }],
			onlyVid: [],
			onlyAudio: [],
			subtitles: [{ file: 'non_existent_sub.ass', language: { name: 'English', code: 'eng', locale: 'en' } }],
			chapters: [{ path: 'non_existent_chapters.txt' }],
			output: 'output.mkv',
			ccTag: 'CC',
			options: { ffmpeg: [], mkvmerge: [] },
			defaults: { audio: { name: 'Japanese', code: 'jpn', locale: 'ja' }, sub: { name: 'English', code: 'eng', locale: 'en' } }
		});

		expect(() => merger.cleanUp()).not.toThrow();
	});

	test('package version returns valid semantic version', () => {
		expect(typeof packageJson.version).toBe('string');
		expect(packageJson.version.split('.').length).toBeGreaterThanOrEqual(3);
	});
});
