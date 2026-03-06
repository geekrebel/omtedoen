/**
 * Lightweight markdown renderer for task titles.
 * Supports: **bold**, *italic*, [links](url), `code`, ~~strikethrough~~
 * This is intentionally minimal — task titles are short.
 */
export function renderMarkdown(text: string): string {
	let html = escapeHtml(text);

	// Bold: **text** or __text__
	html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
	html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

	// Italic: *text* or _text_ (but not inside words for underscore)
	html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
	html = html.replace(/(?<!\w)_(.+?)_(?!\w)/g, '<em>$1</em>');

	// Strikethrough: ~~text~~
	html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

	// Inline code: `code`
	html = html.replace(/`(.+?)`/g, '<code>$1</code>');

	// Links: [text](url)
	html = html.replace(
		/\[(.+?)\]\((.+?)\)/g,
		'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
	);

	return html;
}

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}
