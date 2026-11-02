import { Editor, MarkdownFileInfo, MarkdownView, Notice, Plugin } from "obsidian";
import { findUrls, replaceUrls } from "./links";
import { fetchTitle } from "./title";

export default class UrlToMdLinkPlugin extends Plugin {
	async onload() {
		this.addCommand({
			id: "convert-urls-on-current-line",
			name: "Convert URLs on current line to Markdown links",
			editorCallback: (editor, ctx) => this.convertCurrentLine(editor, ctx),
		});
	}

	private async convertCurrentLine(editor: Editor, ctx: MarkdownView | MarkdownFileInfo) {
		const lineNo = editor.getCursor().line;
		const original = editor.getLine(lineNo);
		const filePath = ctx.file?.path;

		const matches = findUrls(original);
		if (matches.length === 0) {
			new Notice("No URL to convert on this line.");
			return;
		}

		const urls = [...new Set(matches.map((m) => m.url))];
		const progress = new Notice(`Fetching title${urls.length > 1 ? "s" : ""}…`, 0);

		const titles = new Map<string, string>();
		const failures: string[] = [];
		const results = await Promise.allSettled(urls.map((u) => fetchTitle(u)));
		results.forEach((r, i) => {
			if (r.status === "fulfilled") titles.set(urls[i], r.value);
			else failures.push(`${urls[i]}: ${r.reason instanceof Error ? r.reason.message : r.reason}`);
		});
		progress.hide();

		if (titles.size === 0) {
			new Notice(`Could not fetch a title.\n${failures.join("\n")}`, 8000);
			return;
		}

		// The user may have edited the note or switched files while we waited.
		if (ctx.file?.path !== filePath) {
			new Notice("The active note changed while fetching; nothing was converted.");
			return;
		}
		const target = locateLine(editor, lineNo, original);
		if (target === null) {
			new Notice("The line changed while fetching; nothing was converted.");
			return;
		}

		const updated = replaceUrls(original, matches, titles);
		editor.replaceRange(updated, { line: target, ch: 0 }, { line: target, ch: original.length });

		// Keep the cursor at the end of the line if it was on that line.
		const cursor = editor.getCursor();
		if (cursor.line === target && cursor.ch > updated.length) {
			editor.setCursor({ line: target, ch: updated.length });
		}

		if (failures.length > 0) {
			new Notice(`Some URLs could not be converted.\n${failures.join("\n")}`, 8000);
		}
	}
}

/** Find the line that still holds `text`, preferring the one nearest `lineNo`. */
function locateLine(editor: Editor, lineNo: number, text: string): number | null {
	const last = editor.lastLine();
	for (let d = 0; d <= last; d++) {
		const candidates = d === 0 ? [lineNo] : [lineNo - d, lineNo + d];
		for (const l of candidates) {
			if (l >= 0 && l <= last && editor.getLine(l) === text) return l;
		}
		if (lineNo - d < 0 && lineNo + d > last) break;
	}
	return null;
}
