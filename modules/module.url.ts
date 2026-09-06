export type ParsedUrl = {
	service: 'crunchy' | 'hidive' | 'adn';
	type: 'series' | 'season' | 'episode' | 'movieListing' | 'extid';
	id: string;
	originalUrl: string;
};

/**
 * Parses a media URL from Crunchyroll, HiDive, or Animation Digital Network (ADN)
 * and extracts the service, content type, and target ID.
 *
 * @param rawUrl The raw URL string provided by the user
 * @returns ParsedUrl object or undefined if not recognized
 */
export function parseUrl(rawUrl: string): ParsedUrl | undefined {
	if (!rawUrl || typeof rawUrl !== 'string') return undefined;

	let urlStr = rawUrl.trim();
	if (!/^https?:\/\//i.test(urlStr)) {
		urlStr = 'https://' + urlStr;
	}

	let parsedUrl: URL;
	try {
		parsedUrl = new URL(urlStr);
	} catch {
		return undefined;
	}

	const hostname = parsedUrl.hostname.toLowerCase();
	const pathname = parsedUrl.pathname;

	// 1. Crunchyroll
	if (hostname === 'crunchyroll.com' || hostname.endsWith('.crunchyroll.com')) {
		// Strip optional locale prefix: e.g. /en, /fr, /es-419, /pt-br
		const path = pathname.replace(/^\/[a-z]{2}(?:-[a-z0-9]{2,4})?(?=\/|$)/i, '');

		// Series: /series/ID or /watch/series/ID
		const seriesMatch = path.match(/^\/(?:watch\/)?series\/([0-9A-Z]{9,})/i);
		if (seriesMatch) {
			return {
				service: 'crunchy',
				type: 'series',
				id: seriesMatch[1],
				originalUrl: rawUrl
			};
		}

		// Movie Listing: /movie_listing/ID or /watch/movie_listing/ID or /movie/ID
		const movieMatch = path.match(/^\/(?:watch\/)?(?:movie_listing|movie)\/([0-9A-Z]{9,})/i);
		if (movieMatch) {
			return {
				service: 'crunchy',
				type: 'movieListing',
				id: movieMatch[1],
				originalUrl: rawUrl
			};
		}

		// Season: /season/ID
		const seasonMatch = path.match(/^\/season\/([0-9A-Z]{9,})/i);
		if (seasonMatch) {
			return {
				service: 'crunchy',
				type: 'season',
				id: seasonMatch[1],
				originalUrl: rawUrl
			};
		}

		// Episode: /watch/ID or /episode/ID
		const epMatch = path.match(/^\/(?:watch|episode)\/([0-9A-Z]{9,})/i);
		if (epMatch) {
			return {
				service: 'crunchy',
				type: 'episode',
				id: epMatch[1],
				originalUrl: rawUrl
			};
		}

		// Legacy episode URLs: /<show-name>/<episode-slug>-<extid> (numeric ID)
		const legacyMatch = path.match(/-(\d{5,})(?:\/|$)/);
		if (legacyMatch) {
			return {
				service: 'crunchy',
				type: 'extid',
				id: legacyMatch[1],
				originalUrl: rawUrl
			};
		}

		return undefined;
	}

	// 2. HiDive
	if (hostname === 'hidive.com' || hostname.endsWith('.hidive.com')) {
		// Season: /season/ID or /movies/ID or /movie/ID
		const seasonMatch = pathname.match(/^\/(?:season|movies?)\/(\d+)/i);
		if (seasonMatch) {
			return {
				service: 'hidive',
				type: 'season',
				id: seasonMatch[1],
				originalUrl: rawUrl
			};
		}

		// Series: /series/ID or /tv/ID
		const seriesMatch = pathname.match(/^\/(?:series|tv)\/(\d+)/i);
		if (seriesMatch) {
			return {
				service: 'hidive',
				type: 'series',
				id: seriesMatch[1],
				originalUrl: rawUrl
			};
		}

		// Episode: /episode/ID or /stream/.../ID or /watch/.../ID or /stream/ID or /watch/ID
		const epMatch = pathname.match(/^\/(?:episode|(?:stream|watch)\/[^/]+|(?:stream|watch))\/(\d+)/i);
		if (epMatch) {
			return {
				service: 'hidive',
				type: 'episode',
				id: epMatch[1],
				originalUrl: rawUrl
			};
		}

		return undefined;
	}

	// 3. Animation Digital Network (ADN)
	if (
		hostname === 'animationdigitalnetwork.fr' ||
		hostname.endsWith('.animationdigitalnetwork.fr') ||
		hostname === 'animationdigitalnetwork.com' ||
		hostname.endsWith('.animationdigitalnetwork.com') ||
		hostname === 'adn.fr' ||
		hostname.endsWith('.adn.fr')
	) {
		// Show / Season: /video/show/ID or /show/ID
		const showMatch = pathname.match(/^\/(?:video\/)?show\/(\d+)/i);
		if (showMatch) {
			return {
				service: 'adn',
				type: 'season',
				id: showMatch[1],
				originalUrl: rawUrl
			};
		}

		// Single video / Episode: /video/ID (numeric)
		const videoMatch = pathname.match(/^\/video\/(\d+)(?:-[a-zA-Z0-9-]+)?/i);
		if (videoMatch) {
			return {
				service: 'adn',
				type: 'season',
				id: videoMatch[1],
				originalUrl: rawUrl
			};
		}

		return undefined;
	}

	return undefined;
}
