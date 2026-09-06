process.argv = ['node', 'unit.test.ts', '--skipUpdate'];
import { describe, expect, test } from 'bun:test';
import Helper from '../modules/module.helper';
import parseFileName from '../modules/module.filename';
import { Variable } from '../modules/module.filename';
import Merger from '../modules/module.merger';
import packageJson from '../package.json';
import { parseUrl } from '../modules/module.url';
import * as yamlCfg from '../modules/module.cfg-loader';
import { overrideArguments, argvC } from '../modules/module.app-args';

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

	test('parseUrl accurately extracts Crunchyroll series, episode, and movie URLs', () => {
		// Series
		const crSeries = parseUrl('https://www.crunchyroll.com/series/G4PH0WXVJ/spy-x-family');
		expect(crSeries).toEqual({
			service: 'crunchy',
			type: 'series',
			id: 'G4PH0WXVJ',
			originalUrl: 'https://www.crunchyroll.com/series/G4PH0WXVJ/spy-x-family'
		});

		// Localized Series with trailing slash & query params
		const crLocale = parseUrl('https://www.crunchyroll.com/de/series/G4PH0WXVJ/?season=1#main');
		expect(crLocale?.service).toBe('crunchy');
		expect(crLocale?.type).toBe('series');
		expect(crLocale?.id).toBe('G4PH0WXVJ');

		// Watch Episode
		const crEp = parseUrl('https://www.crunchyroll.com/watch/GR19V7816/operation-strix');
		expect(crEp).toEqual({
			service: 'crunchy',
			type: 'episode',
			id: 'GR19V7816',
			originalUrl: 'https://www.crunchyroll.com/watch/GR19V7816/operation-strix'
		});

		// Movie Listing
		const crMovie = parseUrl('https://www.crunchyroll.com/movie_listing/G6497Z776/jujutsu-kaisen-0');
		expect(crMovie).toEqual({
			service: 'crunchy',
			type: 'movieListing',
			id: 'G6497Z776',
			originalUrl: 'https://www.crunchyroll.com/movie_listing/G6497Z776/jujutsu-kaisen-0'
		});

		// Season
		const crSeason = parseUrl('https://www.crunchyroll.com/season/GR19V7816');
		expect(crSeason).toEqual({
			service: 'crunchy',
			type: 'season',
			id: 'GR19V7816',
			originalUrl: 'https://www.crunchyroll.com/season/GR19V7816'
		});

		// Legacy Episode Slug with ExtId
		const crLegacy = parseUrl('https://www.crunchyroll.com/spy-x-family/episode-1-operation-strix-844551');
		expect(crLegacy).toEqual({
			service: 'crunchy',
			type: 'extid',
			id: '844551',
			originalUrl: 'https://www.crunchyroll.com/spy-x-family/episode-1-operation-strix-844551'
		});
	});

	test('parseUrl accurately extracts HiDive and ADN URLs', () => {
		// HiDive Season
		const hdSeason = parseUrl('https://www.hidive.com/season/24562');
		expect(hdSeason).toEqual({
			service: 'hidive',
			type: 'season',
			id: '24562',
			originalUrl: 'https://www.hidive.com/season/24562'
		});

		// HiDive Series
		const hdSeries = parseUrl('https://www.hidive.com/series/18871');
		expect(hdSeries).toEqual({
			service: 'hidive',
			type: 'series',
			id: '18871',
			originalUrl: 'https://www.hidive.com/series/18871'
		});

		// HiDive Episode Stream
		const hdStream = parseUrl('https://www.hidive.com/stream/oshi-no-ko/99881');
		expect(hdStream).toEqual({
			service: 'hidive',
			type: 'episode',
			id: '99881',
			originalUrl: 'https://www.hidive.com/stream/oshi-no-ko/99881'
		});

		// ADN Show
		const adnShow = parseUrl('https://animationdigitalnetwork.fr/video/show/123-title');
		expect(adnShow).toEqual({
			service: 'adn',
			type: 'season',
			id: '123',
			originalUrl: 'https://animationdigitalnetwork.fr/video/show/123-title'
		});

		// ADN Video
		const adnVideo = parseUrl('https://animationdigitalnetwork.com/video/456-episode-1');
		expect(adnVideo).toEqual({
			service: 'adn',
			type: 'season',
			id: '456',
			originalUrl: 'https://animationdigitalnetwork.com/video/456-episode-1'
		});

		// Unsupported and invalid URLs
		expect(parseUrl('')).toBeUndefined();
		expect(parseUrl('https://example.com/video/123')).toBeUndefined();
		expect(parseUrl('not a url')).toBeUndefined();
	});

	test('URL parameter automatically configures service and target ID in overrideArguments', () => {
		const cfg = yamlCfg.loadCfg();
		overrideArguments(cfg.cli, {
			url: 'https://www.crunchyroll.com/series/G4PH0WXVJ/spy-x-family'
		});
		expect(argvC.service).toBe('crunchy');
		expect(argvC.series).toBe('G4PH0WXVJ');
	});

	test('Majin candidate stream evaluation requires 1080p+ and min 7.5MB/s (7500 kbps)', () => {
		const checkMajinCandidate = (v: { quality: { width: number; height: number }; bandwidth: number }) => {
			const kbps = Math.round(v.bandwidth / 1024);
			const is1080pPlus = v.quality.height >= 1080 || v.quality.width >= 1920;
			return is1080pPlus && kbps >= 7500;
		};

		// 1080p with 8000 kbps (> 7500 kbps / 7.5 MB/s) -> PASS
		expect(checkMajinCandidate({ quality: { width: 1920, height: 1080 }, bandwidth: 8000 * 1024 })).toBe(true);

		// 1080p with exactly 7500 kbps (7.5 MB/s) -> PASS
		expect(checkMajinCandidate({ quality: { width: 1920, height: 1080 }, bandwidth: 7500 * 1024 })).toBe(true);

		// 1080p with 7200 kbps (< 7500 kbps / 7.5 MB/s) -> FAIL
		expect(checkMajinCandidate({ quality: { width: 1920, height: 1080 }, bandwidth: 7200 * 1024 })).toBe(false);

		// 720p (1280x720) even with high bitrate -> FAIL
		expect(checkMajinCandidate({ quality: { width: 1280, height: 720 }, bandwidth: 8000 * 1024 })).toBe(false);
	});
});
