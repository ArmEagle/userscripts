/**
 * https://stackoverflow.com/a/33928558/4728696
 * Copies a string to the clipboard. Must be called from within an
 * event handler such as click. May return false if it failed, but
 * this is not always possible. Browser support for Chrome 43+,
 * Firefox 42+, Safari 10+, Edge and IE 10+.
 * IE: The clipboard feature may be disabled by an administrator. By
 * default a prompt is shown the first time the clipboard is
 * used (per session).
 */
class CopyToClipboard {
	/**
	 * @param text {string} Text to put in clipboard.
	 * @return {boolean} Whether the action succeeded.
	 */
	static copy(text) {
		if (window.clipboardData && window.clipboardData.setData) {
			// IE specific code path to prevent textarea being shown while dialog is visible.
			return window.clipboardData.setData('Text', text);

		} else if (document.queryCommandSupported && document.queryCommandSupported('copy')) {
			let textarea = document.createElement('textarea');
			textarea.textContent = text;
			textarea.style.position = 'fixed';  // Prevent scrolling to bottom of page in MS Edge.
			document.body.appendChild(textarea);
			textarea.select();
			try {
				return document.execCommand('copy');  // Security exception may be thrown by some browsers.
			} catch (ex) {
				console.warn('Copy to clipboard failed.', ex);
				return false;
			} finally {
				document.body.removeChild(textarea);
			}
		}
	}
}
