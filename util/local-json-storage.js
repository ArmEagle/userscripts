/**
 * Helper class to make use of LocalStorage even simpler.
 * Handles serialisation of JSON to storage and back.
 *
 * Create by passing a key to use as name for your storage:
 * `let storage = new LocalJsonStorage('mysetting');`
 */
class LocalJsonStorage {

	/**
	 * @constructor
	 * @param {string} key - Key to use for this storage
	 * @param {string} prefix (optional) - Prefix for key, defaults to 'iwink-userscripts-'
	 */
	constructor(key, prefix) {
		this.keyPrefix = (typeof prefix === 'undefined') ? 'iwink-userscripts-' : prefix;

		if (typeof key === 'undefined' || !key) {
			throw new Exception('parameter "key" is required');
		}

		this.storageKey = this.keyPrefix + key;
	}

	/**
	 * Retrieve deserialised stored data.
	 * @return {*}
	 */
	get() {
		let data = localStorage[this.storageKey];
		if (typeof data !== 'string' || data === 'undefined') {
			return undefined;
		}
		return JSON.parse(data);
	}

	/**
	 * Store data. Serialises the data.
	 * @param data {*}
	 */
	set(data) {
		localStorage[this.storageKey] = JSON.stringify(data);
	}
}
