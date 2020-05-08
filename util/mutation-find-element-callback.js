/**
 * Use DOM mutation observer to keep looking for elements being added matching
 * the selector being added as descendant node of the root_node.
 * Calling the callback function passing the found element for each one that is found.
 */
class MutationFindElementCallback {

	/**
	 * @param root_node {DomElement} Observe within this element.
	 * @param selector {string} query Selector to find element with.
	 * @param callback {function} Function to call when a matching element is found.
	 * @param lock {string} If defined, uses this string as attribute to mark matched elements to prevent double execution of callback.
	 */
	constructor(root_node, selector, callback, lock) {
		this.root_node = root_node;
		this.callback = callback;
		this.selector = selector;
		this.lock = lock;

		// Look for elements right now.
		this.findElements();
		
		const mutationOptions = {
			childList: true,
			subtree: true
		};

		// Create an observer instance linked to the callback function.
		const mutationObserver = new MutationObserver(
			(mutationsList, observer) => {
				this.mutationCallback(mutationsList, observer)
			}
		);

		// Start observing the target node for configured mutations.
		mutationObserver.observe(this.root_node, mutationOptions);
	}

	/**
	 * Method to apply to all matched elements. Sets a flag to element to
	 * prevent double mapping.
	 * @param element {Element}
	 */
	elementHandler(element) {
		if (this.lock) {
			if (element.hasAttribute(this.lock)) {
				return;
			}
			element.setAttribute(this.lock, '');
		}
	
		this.callback(element);
	}

	/**
	 * Callback function to execute when mutations are observed.
	 * @param mutationsList {MutationRecord[]}
	 * @param observer {MutationObserver}
	 */
	mutationCallback(mutationsList, observer) {
		mutationsList.forEach((mutation) => {
			if (mutation.type !== 'childList') {
				return;
			}

			this.findElements();
		});
	}

	/**
	 * Search for elements matching selector under the target node.
	 */
	findElements() {
		this.root_node.querySelectorAll(this.selector).forEach((element) => {
			this.elementHandler(element);
		});
	}
}
