/**************************************************************************
 * Combination of DOM injected event handler and userscript-space method to
 * select an option in any Select2 element.
 **************************************************************************/

/**
 * Simple method that fires an event which is handled by the code
 *  below to select an option in a Select2 element.
 * We stringify the data because apparently objects are not allowed to cross
 *  the window/userscript boundary.
 *
 * @param {string} selector: jQuery DOM selector to find any Select2 element.
 * @param {string} query: Value to look for.
 * @param {string} property (optional): Property of select2 data to compare the value with.
 */
function select2search(selector, query, property) {
  var event = new CustomEvent("select2search", {
    "detail": JSON.stringify({
      "selector": selector,
      "query": query,
      "property": property
    })
  });
  window.dispatchEvent(event);
}

(function() {
  // Use function.toString() to keep pretty code and inject it into the body for native browser code.
  function DOM_inject_script() {
    var script = document.getElementsByTagName('head')[0].appendChild(document.createElement('script'));
    script.setAttribute('type', 'text/javascript');
    return script.textContent=DOM_inject_script.toString().replace(/[\s\S]*"\$1"\);([\s\S]*)}/,"$1");

    /**
     * Select an item in a Select2 element. Supports Ajax backed data.
     *
     * @param {string} query: Value to look for
     * @param {string} property (optional): Property of select2 data to compare the value with.
     *  Defaults to "name".
     */
    jQuery.fn.select2search = function(query, property) {
      var property = (typeof property === "undefined") ? "name" : property;
      function itemsLoadedHandler(event) {
        var data = event.items.results.find(data => data[property] === query);
        this.select2("data", data);
        // Somehow calling "close" directly doesn't close it because of the magic we're using.
        window.setTimeout(function() {
        this.select2("close");
        }.bind(this), 10);
      }
      this.one("select2-loaded", itemsLoadedHandler.bind(this));
      this.select2("search", query);
    }

    window.addEventListener("select2search", function(event) {
      if (typeof event.detail === "undefined") { return; }
      // We can't pass objects across the boundary, but a string is ok.
      var eventdata = JSON.parse(event.detail);
      if (typeof eventdata.query === "undefined" || typeof eventdata.selector === "undefined") { return; }
      // Optional property to check the select2 data query on.
      var property = (typeof eventdata.property !== "undefined") ? eventdata.property : undefined;

      jQuery(eventdata.selector).select2search(eventdata.query, property);
    });
  }
  DOM_inject_script();
})();
