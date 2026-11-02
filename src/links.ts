/**
 * Pure helpers for finding bare URLs in a line and building Markdown links.
 * Nothing here depends on Obsidian, so it can be unit tested in Node.
 */

export interface UrlMatch {
	/** The URL itself (without surrounding `<` `>`). */
	url: string;
	/** Start offset in the line of the text to replace. */
	from: number;
	/** End offset (exclusive) in the line of the text to replace. */
	to: number;
}

const URL_RE = /<?https?:\/\/[^\s<>"'`\[\]]+>?/g;

/** Characters that usually end a sentence rather than belong to a URL. */
const TRAILING_PUNCT = /[.,;:!?、。，．！？」』】）〉》]+$/;

/**
 * Ranges that must not be touched: inline code, existing Markdown links /
 * images, and wikilinks.
 */
function protectedRanges(line: string): Array<[number, number]> {
	const ranges: Array<[number, number]> = [];
	const patterns = [
		/(`+)[\s\S]*?\1/g, // inline code
		/!?\[[^\]]*\]\([^)]*(?:\([^)]*\)[^)]*)*\)/g, // [text](url) / ![alt](url)
		/!?\[\[[^\]]*\]\]/g, // [[wikilink]]
		/\[[^\]]*\]\[[^\]]*\]/g, // [text][ref]
	];
	for (const re of patterns) {
		for (const m of line.matchAll(re)) {
			ranges.push([m.index!, m.index! + m[0].length]);
		}
	}
	// Reference definitions: `[id]: https://...`
	const def = /^\s{0,3}\[[^\]]+\]:\s*/.exec(line);
	if (def) ranges.push([0, line.length]);
	return ranges;
}

/** Drop trailing `)` that are not balanced by a `(` inside the URL. */
function trimUnbalancedParens(url: string): string {
	let open = 0;
	for (const ch of url) if (ch === "(") open++;
	let close = 0;
	for (const ch of url) if (ch === ")") close++;
	while (url.endsWith(")") && close > open) {
		url = url.slice(0, -1);
		close--;
	}
	return url;
}

/** Find bare URLs (and `<url>` autolinks) in a line that can be converted. */
export function findUrls(line: string): UrlMatch[] {
	const ranges = protectedRanges(line);
	const isProtected = (pos: number) => ranges.some(([s, e]) => pos >= s && pos < e);
	const result: UrlMatch[] = [];

	for (const m of line.matchAll(URL_RE)) {
		const start = m.index!;
		let raw = m[0];
		if (isProtected(start)) continue;

		const angled = raw.startsWith("<");
		if (angled) {
			if (!raw.endsWith(">")) {
				// `<` without a closing `>`: treat the `<` as plain text.
				raw = raw.slice(1);
				const url = cleanBareUrl(raw);
				result.push({ url, from: start + 1, to: start + 1 + url.length });
				continue;
			}
			result.push({ url: raw.slice(1, -1), from: start, to: start + raw.length });
			continue;
		}

		if (raw.endsWith(">")) raw = raw.slice(0, -1);
		const url = cleanBareUrl(raw);
		result.push({ url, from: start, to: start + url.length });
	}
	return result;
}

function cleanBareUrl(raw: string): string {
	let url = raw;
	let prev: string;
	do {
		prev = url;
		url = url.replace(TRAILING_PUNCT, "");
		url = trimUnbalancedParens(url);
	} while (url !== prev);
	return url;
}

/** Normalize whitespace and escape characters that would break link text. */
export function sanitizeTitle(title: string): string {
	return title
		.replace(/\s+/g, " ")
		.trim()
		.replace(/\\/g, "\\\\")
		.replace(/\[/g, "\\[")
		.replace(/\]/g, "\\]");
}

/** Make the URL safe to place inside `( )` of a Markdown link. */
function formatDestination(url: string): string {
	return /[\s()<>]/.test(url) && !isBalanced(url) ? `<${url}>` : url;
}

function isBalanced(url: string): boolean {
	let depth = 0;
	for (const ch of url) {
		if (ch === "(") depth++;
		else if (ch === ")" && --depth < 0) return false;
	}
	return depth === 0 && !/[\s<>]/.test(url);
}

export function buildMarkdownLink(title: string, url: string): string {
	return `[${sanitizeTitle(title)}](${formatDestination(url)})`;
}

/**
 * Replace each match whose URL has a title in `titles`. Matches without a
 * title are left untouched.
 */
export function replaceUrls(line: string, matches: UrlMatch[], titles: Map<string, string>): string {
	let out = line;
	// Replace from the end so earlier offsets stay valid.
	for (const m of [...matches].sort((a, b) => b.from - a.from)) {
		const title = titles.get(m.url);
		if (!title) continue;
		out = out.slice(0, m.from) + buildMarkdownLink(title, m.url) + out.slice(m.to);
	}
	return out;
}
