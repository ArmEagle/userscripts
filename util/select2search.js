jQuery = window.wrappedJSObject.jQuery;

(function($){
  /**
   * Search and select an option of a select2 element. Supports ajax backed data.
   * @param {string} query
   *  Option value to search for
   * @param {string} property (optional, defaults to "name")
   *  Property of data to compare `query` with.
   */
  $.fn.select2search = function(query, property) {
    var property = (typeof property === "undefined") ? "name" : property;
    function itemsLoadedHandler(event) {
      console.log(event);
      var data = event.items.results.find(data => data[property] === query);
      this.select2("data", data);
      this.select2("close");
    }
    this.one("select2-loaded", itemsLoadedHandler.bind(this));
    this.select2("search", query);
  }
}(jQuery));
