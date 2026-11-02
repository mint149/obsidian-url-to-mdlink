import { test } from "node:test";
import assert from "node:assert/strict";
import { findUrls, replaceUrls, buildMarkdownLink } from "../src/links";
import { detectCharset, decodeHtml } from "../src/charset";

const urls = (line: string) => findUrls(line).map((m) => m.url);

function convert(line: string, titles: Record<string, string>): string {
	return replaceUrls(line, findUrls(line), new Map(Object.entries(titles)));
}

test("finds a bare URL", () => {
	assert.deepEqual(urls("see https://example.com/a?b=1#c here"), ["https://example.com/a?b=1#c"]);
});

test("finds multiple URLs", () => {
	assert.deepEqual(urls("http://a.com and https://b.com"), ["http://a.com", "https://b.com"]);
});

test("strips trailing punctuation (ASCII and Japanese)", () => {
	assert.deepEqual(urls("Go to https://example.com."), ["https://example.com"]);
	assert.deepEqual(urls("リンク：https://example.com/ja。"), ["https://example.com/ja"]);
	assert.deepEqual(urls("「https://example.com」"), ["https://example.com"]);
});

test("keeps balanced parentheses, drops unbalanced", () => {
	assert.deepEqual(urls("https://en.wikipedia.org/wiki/Foo_(bar)"), ["https://en.wikipedia.org/wiki/Foo_(bar)"]);
	assert.deepEqual(urls("(see https://example.com/x)"), ["https://example.com/x"]);
});

test("ignores existing links, code and wikilinks", () => {
	assert.deepEqual(urls("[t](https://example.com)"), []);
	assert.deepEqual(urls("![img](https://example.com/a.png)"), []);
	assert.deepEqual(urls("[https://a.com](https://a.com)"), []);
	assert.deepEqual(urls("`https://example.com`"), []);
	assert.deepEqual(urls("[[https://example.com]]"), []);
	assert.deepEqual(urls("[ref]: https://example.com"), []);
	assert.deepEqual(urls("[t](https://a.com) https://b.com"), ["https://b.com"]);
});

test("converts <url> autolinks including the brackets", () => {
	assert.equal(convert("x <https://a.com> y", { "https://a.com": "A" }), "x [A](https://a.com) y");
});

test("replaces only URLs with titles, preserving surrounding text", () => {
	assert.equal(
		convert("- https://a.com と https://b.com。", { "https://a.com": "Site A" }),
		"- [Site A](https://a.com) と https://b.com。",
	);
	assert.equal(
		convert("https://a.com https://a.com", { "https://a.com": "A" }),
		"[A](https://a.com) [A](https://a.com)",
	);
});

test("escapes brackets in titles and collapses whitespace", () => {
	assert.equal(buildMarkdownLink("  [News]\n Today ", "https://a.com"), "[\\[News\\] Today](https://a.com)");
});

test("detects charset from header, meta and BOM", () => {
	const ascii = (s: string) => new TextEncoder().encode(s);
	assert.equal(detectCharset(ascii("<html>"), "text/html; charset=Shift_JIS"), "Shift_JIS");
	assert.equal(detectCharset(ascii('<meta charset="euc-jp">')), "euc-jp");
	assert.equal(
		detectCharset(ascii('<meta http-equiv="Content-Type" content="text/html; charset=shift_jis">')),
		"shift_jis",
	);
	assert.equal(detectCharset(ascii("<html>")), "utf-8");
	assert.equal(detectCharset(new Uint8Array([0xef, 0xbb, 0xbf, 0x3c])), "utf-8");
});

test("decodes Shift_JIS bytes", () => {
	// "日本" in Shift_JIS
	const bytes = new Uint8Array([...new TextEncoder().encode('<meta charset="shift_jis"><title>'), 0x93, 0xfa, 0x96, 0x7b]);
	assert.ok(decodeHtml(bytes.buffer, "text/html").endsWith("日本"));
});
