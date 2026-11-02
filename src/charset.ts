/**
 * Work out the character encoding of an HTML response so that pages served
 * in e.g. Shift_JIS or EUC-JP do not turn into mojibake.
 */

function charsetFromContentType(contentType: string | undefined): string | null {
	if (!contentType) return null;
	const m = /charset\s*=\s*["']?([\w.:-]+)/i.exec(contentType);
	return m ? m[1] : null;
}

function charsetFromMeta(head: string): string | null {
	const meta = /<meta[^>]+charset\s*=\s*["']?([\w.:-]+)/i.exec(head);
	return meta ? meta[1] : null;
}

function isSupported(label: string): boolean {
	try {
		new TextDecoder(label);
		return true;
	} catch {
		return false;
	}
}

export function detectCharset(bytes: Uint8Array, contentType?: string): string {
	// Byte order marks win over everything else.
	if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return "utf-8";
	if (bytes[0] === 0xff && bytes[1] === 0xfe) return "utf-16le";
	if (bytes[0] === 0xfe && bytes[1] === 0xff) return "utf-16be";

	const fromHeader = charsetFromContentType(contentType);
	if (fromHeader && isSupported(fromHeader)) return fromHeader;

	// Look at the start of the document as Latin-1 (1 byte = 1 char).
	const head = new TextDecoder("latin1").decode(bytes.subarray(0, 4096));
	const fromMeta = charsetFromMeta(head);
	if (fromMeta && isSupported(fromMeta)) return fromMeta;

	return "utf-8";
}

export function decodeHtml(buffer: ArrayBuffer, contentType?: string): string {
	const bytes = new Uint8Array(buffer);
	return new TextDecoder(detectCharset(bytes, contentType)).decode(bytes);
}
