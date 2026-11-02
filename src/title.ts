import { requestUrl } from "obsidian";
import { decodeHtml } from "./charset";

/** Pull a page title out of an HTML document. */
export function extractTitle(html: string): string | null {
	const doc = new DOMParser().parseFromString(html, "text/html");
	const candidates = [
		doc.querySelector("title")?.textContent,
		doc.querySelector('meta[property="og:title"]')?.getAttribute("content"),
		doc.querySelector('meta[name="twitter:title"]')?.getAttribute("content"),
	];
	for (const c of candidates) {
		const t = c?.replace(/\s+/g, " ").trim();
		if (t) return t;
	}
	return null;
}

/**
 * Fetch a page and return its title. Uses Obsidian's `requestUrl`, which is
 * not subject to CORS restrictions.
 */
export async function fetchTitle(url: string): Promise<string> {
	const res = await requestUrl({
		url,
		method: "GET",
		headers: { Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8" },
		throw: false,
	});
	if (res.status >= 400) throw new Error(`HTTP ${res.status}`);

	const contentType = headerValue(res.headers, "content-type");
	if (contentType && !/html|xml/i.test(contentType)) {
		throw new Error(`not an HTML page (${contentType})`);
	}

	const title = extractTitle(decodeHtml(res.arrayBuffer, contentType));
	if (!title) throw new Error("no title found");
	return title;
}

function headerValue(headers: Record<string, string>, name: string): string | undefined {
	const key = Object.keys(headers).find((k) => k.toLowerCase() === name);
	return key ? headers[key] : undefined;
}
