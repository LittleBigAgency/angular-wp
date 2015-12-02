/**
* @preserve HTML5 Shiv 3.7.3 | @afarkas @jdalton @jon_neal @rem | MIT/GPL2 Licensed
*/
;(function(window, document) {
/*jshint evil:true */
  /** version */
  var version = '3.7.3';

  /** Preset options */
  var options = window.html5 || {};

  /** Used to skip problem elements */
  var reSkip = /^<|^(?:button|map|select|textarea|object|iframe|option|optgroup)$/i;

  /** Not all elements can be cloned in IE **/
  var saveClones = /^(?:a|b|code|div|fieldset|h1|h2|h3|h4|h5|h6|i|label|li|ol|p|q|span|strong|style|table|tbody|td|th|tr|ul)$/i;

  /** Detect whether the browser supports default html5 styles */
  var supportsHtml5Styles;

  /** Name of the expando, to work with multiple documents or to re-shiv one document */
  var expando = '_html5shiv';

  /** The id for the the documents expando */
  var expanID = 0;

  /** Cached data for each document */
  var expandoData = {};

  /** Detect whether the browser supports unknown elements */
  var supportsUnknownElements;

  (function() {
    try {
        var a = document.createElement('a');
        a.innerHTML = '<xyz></xyz>';
        //if the hidden property is implemented we can assume, that the browser supports basic HTML5 Styles
        supportsHtml5Styles = ('hidden' in a);

        supportsUnknownElements = a.childNodes.length == 1 || (function() {
          // assign a false positive if unable to shiv
          (document.createElement)('a');
          var frag = document.createDocumentFragment();
          return (
            typeof frag.cloneNode == 'undefined' ||
            typeof frag.createDocumentFragment == 'undefined' ||
            typeof frag.createElement == 'undefined'
          );
        }());
    } catch(e) {
      // assign a false positive if detection fails => unable to shiv
      supportsHtml5Styles = true;
      supportsUnknownElements = true;
    }

  }());

  /*--------------------------------------------------------------------------*/

  /**
   * Creates a style sheet with the given CSS text and adds it to the document.
   * @private
   * @param {Document} ownerDocument The document.
   * @param {String} cssText The CSS text.
   * @returns {StyleSheet} The style element.
   */
  function addStyleSheet(ownerDocument, cssText) {
    var p = ownerDocument.createElement('p'),
        parent = ownerDocument.getElementsByTagName('head')[0] || ownerDocument.documentElement;

    p.innerHTML = 'x<style>' + cssText + '</style>';
    return parent.insertBefore(p.lastChild, parent.firstChild);
  }

  /**
   * Returns the value of `html5.elements` as an array.
   * @private
   * @returns {Array} An array of shived element node names.
   */
  function getElements() {
    var elements = html5.elements;
    return typeof elements == 'string' ? elements.split(' ') : elements;
  }

  /**
   * Extends the built-in list of html5 elements
   * @memberOf html5
   * @param {String|Array} newElements whitespace separated list or array of new element names to shiv
   * @param {Document} ownerDocument The context document.
   */
  function addElements(newElements, ownerDocument) {
    var elements = html5.elements;
    if(typeof elements != 'string'){
      elements = elements.join(' ');
    }
    if(typeof newElements != 'string'){
      newElements = newElements.join(' ');
    }
    html5.elements = elements +' '+ newElements;
    shivDocument(ownerDocument);
  }

   /**
   * Returns the data associated to the given document
   * @private
   * @param {Document} ownerDocument The document.
   * @returns {Object} An object of data.
   */
  function getExpandoData(ownerDocument) {
    var data = expandoData[ownerDocument[expando]];
    if (!data) {
        data = {};
        expanID++;
        ownerDocument[expando] = expanID;
        expandoData[expanID] = data;
    }
    return data;
  }

  /**
   * returns a shived element for the given nodeName and document
   * @memberOf html5
   * @param {String} nodeName name of the element
   * @param {Document|DocumentFragment} ownerDocument The context document.
   * @returns {Object} The shived element.
   */
  function createElement(nodeName, ownerDocument, data){
    if (!ownerDocument) {
        ownerDocument = document;
    }
    if(supportsUnknownElements){
        return ownerDocument.createElement(nodeName);
    }
    if (!data) {
        data = getExpandoData(ownerDocument);
    }
    var node;

    if (data.cache[nodeName]) {
        node = data.cache[nodeName].cloneNode();
    } else if (saveClones.test(nodeName)) {
        node = (data.cache[nodeName] = data.createElem(nodeName)).cloneNode();
    } else {
        node = data.createElem(nodeName);
    }

    // Avoid adding some elements to fragments in IE < 9 because
    // * Attributes like `name` or `type` cannot be set/changed once an element
    //   is inserted into a document/fragment
    // * Link elements with `src` attributes that are inaccessible, as with
    //   a 403 response, will cause the tab/window to crash
    // * Script elements appended to fragments will execute when their `src`
    //   or `text` property is set
    return node.canHaveChildren && !reSkip.test(nodeName) && !node.tagUrn ? data.frag.appendChild(node) : node;
  }

  /**
   * returns a shived DocumentFragment for the given document
   * @memberOf html5
   * @param {Document} ownerDocument The context document.
   * @returns {Object} The shived DocumentFragment.
   */
  function createDocumentFragment(ownerDocument, data){
    if (!ownerDocument) {
        ownerDocument = document;
    }
    if(supportsUnknownElements){
        return ownerDocument.createDocumentFragment();
    }
    data = data || getExpandoData(ownerDocument);
    var clone = data.frag.cloneNode(),
        i = 0,
        elems = getElements(),
        l = elems.length;
    for(;i<l;i++){
        clone.createElement(elems[i]);
    }
    return clone;
  }

  /**
   * Shivs the `createElement` and `createDocumentFragment` methods of the document.
   * @private
   * @param {Document|DocumentFragment} ownerDocument The document.
   * @param {Object} data of the document.
   */
  function shivMethods(ownerDocument, data) {
    if (!data.cache) {
        data.cache = {};
        data.createElem = ownerDocument.createElement;
        data.createFrag = ownerDocument.createDocumentFragment;
        data.frag = data.createFrag();
    }


    ownerDocument.createElement = function(nodeName) {
      //abort shiv
      if (!html5.shivMethods) {
          return data.createElem(nodeName);
      }
      return createElement(nodeName, ownerDocument, data);
    };

    ownerDocument.createDocumentFragment = Function('h,f', 'return function(){' +
      'var n=f.cloneNode(),c=n.createElement;' +
      'h.shivMethods&&(' +
        // unroll the `createElement` calls
        getElements().join().replace(/[\w\-:]+/g, function(nodeName) {
          data.createElem(nodeName);
          data.frag.createElement(nodeName);
          return 'c("' + nodeName + '")';
        }) +
      ');return n}'
    )(html5, data.frag);
  }

  /*--------------------------------------------------------------------------*/

  /**
   * Shivs the given document.
   * @memberOf html5
   * @param {Document} ownerDocument The document to shiv.
   * @returns {Document} The shived document.
   */
  function shivDocument(ownerDocument) {
    if (!ownerDocument) {
        ownerDocument = document;
    }
    var data = getExpandoData(ownerDocument);

    if (html5.shivCSS && !supportsHtml5Styles && !data.hasCSS) {
      data.hasCSS = !!addStyleSheet(ownerDocument,
        // corrects block display not defined in IE6/7/8/9
        'article,aside,dialog,figcaption,figure,footer,header,hgroup,main,nav,section{display:block}' +
        // adds styling not present in IE6/7/8/9
        'mark{background:#FF0;color:#000}' +
        // hides non-rendered elements
        'template{display:none}'
      );
    }
    if (!supportsUnknownElements) {
      shivMethods(ownerDocument, data);
    }
    return ownerDocument;
  }

  /*--------------------------------------------------------------------------*/

  /**
   * The `html5` object is exposed so that more elements can be shived and
   * existing shiving can be detected on iframes.
   * @type Object
   * @example
   *
   * // options can be changed before the script is included
   * html5 = { 'elements': 'mark section', 'shivCSS': false, 'shivMethods': false };
   */
  var html5 = {

    /**
     * An array or space separated string of node names of the elements to shiv.
     * @memberOf html5
     * @type Array|String
     */
    'elements': options.elements || 'abbr article aside audio bdi canvas data datalist details dialog figcaption figure footer header hgroup main mark meter nav output picture progress section summary template time video',

    /**
     * current version of html5shiv
     */
    'version': version,

    /**
     * A flag to indicate that the HTML5 style sheet should be inserted.
     * @memberOf html5
     * @type Boolean
     */
    'shivCSS': (options.shivCSS !== false),

    /**
     * Is equal to true if a browser supports creating unknown/HTML5 elements
     * @memberOf html5
     * @type boolean
     */
    'supportsUnknownElements': supportsUnknownElements,

    /**
     * A flag to indicate that the document's `createElement` and `createDocumentFragment`
     * methods should be overwritten.
     * @memberOf html5
     * @type Boolean
     */
    'shivMethods': (options.shivMethods !== false),

    /**
     * A string to describe the type of `html5` object ("default" or "default print").
     * @memberOf html5
     * @type String
     */
    'type': 'default',

    // shivs the document according to the specified `html5` object options
    'shivDocument': shivDocument,

    //creates a shived element
    createElement: createElement,

    //creates a shived documentFragment
    createDocumentFragment: createDocumentFragment,

    //extends list of elements
    addElements: addElements
  };

  /*--------------------------------------------------------------------------*/

  // expose html5
  window.html5 = html5;

  // shiv the document
  shivDocument(document);

  if(typeof module == 'object' && module.exports){
    module.exports = html5;
  }

}(typeof window !== "undefined" ? window : this, document));

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJodG1sNXNoaXYuanMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4qIEBwcmVzZXJ2ZSBIVE1MNSBTaGl2IDMuNy4zIHwgQGFmYXJrYXMgQGpkYWx0b24gQGpvbl9uZWFsIEByZW0gfCBNSVQvR1BMMiBMaWNlbnNlZFxuKi9cbjsoZnVuY3Rpb24od2luZG93LCBkb2N1bWVudCkge1xuLypqc2hpbnQgZXZpbDp0cnVlICovXG4gIC8qKiB2ZXJzaW9uICovXG4gIHZhciB2ZXJzaW9uID0gJzMuNy4zJztcblxuICAvKiogUHJlc2V0IG9wdGlvbnMgKi9cbiAgdmFyIG9wdGlvbnMgPSB3aW5kb3cuaHRtbDUgfHwge307XG5cbiAgLyoqIFVzZWQgdG8gc2tpcCBwcm9ibGVtIGVsZW1lbnRzICovXG4gIHZhciByZVNraXAgPSAvXjx8Xig/OmJ1dHRvbnxtYXB8c2VsZWN0fHRleHRhcmVhfG9iamVjdHxpZnJhbWV8b3B0aW9ufG9wdGdyb3VwKSQvaTtcblxuICAvKiogTm90IGFsbCBlbGVtZW50cyBjYW4gYmUgY2xvbmVkIGluIElFICoqL1xuICB2YXIgc2F2ZUNsb25lcyA9IC9eKD86YXxifGNvZGV8ZGl2fGZpZWxkc2V0fGgxfGgyfGgzfGg0fGg1fGg2fGl8bGFiZWx8bGl8b2x8cHxxfHNwYW58c3Ryb25nfHN0eWxlfHRhYmxlfHRib2R5fHRkfHRofHRyfHVsKSQvaTtcblxuICAvKiogRGV0ZWN0IHdoZXRoZXIgdGhlIGJyb3dzZXIgc3VwcG9ydHMgZGVmYXVsdCBodG1sNSBzdHlsZXMgKi9cbiAgdmFyIHN1cHBvcnRzSHRtbDVTdHlsZXM7XG5cbiAgLyoqIE5hbWUgb2YgdGhlIGV4cGFuZG8sIHRvIHdvcmsgd2l0aCBtdWx0aXBsZSBkb2N1bWVudHMgb3IgdG8gcmUtc2hpdiBvbmUgZG9jdW1lbnQgKi9cbiAgdmFyIGV4cGFuZG8gPSAnX2h0bWw1c2hpdic7XG5cbiAgLyoqIFRoZSBpZCBmb3IgdGhlIHRoZSBkb2N1bWVudHMgZXhwYW5kbyAqL1xuICB2YXIgZXhwYW5JRCA9IDA7XG5cbiAgLyoqIENhY2hlZCBkYXRhIGZvciBlYWNoIGRvY3VtZW50ICovXG4gIHZhciBleHBhbmRvRGF0YSA9IHt9O1xuXG4gIC8qKiBEZXRlY3Qgd2hldGhlciB0aGUgYnJvd3NlciBzdXBwb3J0cyB1bmtub3duIGVsZW1lbnRzICovXG4gIHZhciBzdXBwb3J0c1Vua25vd25FbGVtZW50cztcblxuICAoZnVuY3Rpb24oKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgdmFyIGEgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG4gICAgICAgIGEuaW5uZXJIVE1MID0gJzx4eXo+PC94eXo+JztcbiAgICAgICAgLy9pZiB0aGUgaGlkZGVuIHByb3BlcnR5IGlzIGltcGxlbWVudGVkIHdlIGNhbiBhc3N1bWUsIHRoYXQgdGhlIGJyb3dzZXIgc3VwcG9ydHMgYmFzaWMgSFRNTDUgU3R5bGVzXG4gICAgICAgIHN1cHBvcnRzSHRtbDVTdHlsZXMgPSAoJ2hpZGRlbicgaW4gYSk7XG5cbiAgICAgICAgc3VwcG9ydHNVbmtub3duRWxlbWVudHMgPSBhLmNoaWxkTm9kZXMubGVuZ3RoID09IDEgfHwgKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIC8vIGFzc2lnbiBhIGZhbHNlIHBvc2l0aXZlIGlmIHVuYWJsZSB0byBzaGl2XG4gICAgICAgICAgKGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQpKCdhJyk7XG4gICAgICAgICAgdmFyIGZyYWcgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIHR5cGVvZiBmcmFnLmNsb25lTm9kZSA9PSAndW5kZWZpbmVkJyB8fFxuICAgICAgICAgICAgdHlwZW9mIGZyYWcuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCA9PSAndW5kZWZpbmVkJyB8fFxuICAgICAgICAgICAgdHlwZW9mIGZyYWcuY3JlYXRlRWxlbWVudCA9PSAndW5kZWZpbmVkJ1xuICAgICAgICAgICk7XG4gICAgICAgIH0oKSk7XG4gICAgfSBjYXRjaChlKSB7XG4gICAgICAvLyBhc3NpZ24gYSBmYWxzZSBwb3NpdGl2ZSBpZiBkZXRlY3Rpb24gZmFpbHMgPT4gdW5hYmxlIHRvIHNoaXZcbiAgICAgIHN1cHBvcnRzSHRtbDVTdHlsZXMgPSB0cnVlO1xuICAgICAgc3VwcG9ydHNVbmtub3duRWxlbWVudHMgPSB0cnVlO1xuICAgIH1cblxuICB9KCkpO1xuXG4gIC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgc3R5bGUgc2hlZXQgd2l0aCB0aGUgZ2l2ZW4gQ1NTIHRleHQgYW5kIGFkZHMgaXQgdG8gdGhlIGRvY3VtZW50LlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge0RvY3VtZW50fSBvd25lckRvY3VtZW50IFRoZSBkb2N1bWVudC5cbiAgICogQHBhcmFtIHtTdHJpbmd9IGNzc1RleHQgVGhlIENTUyB0ZXh0LlxuICAgKiBAcmV0dXJucyB7U3R5bGVTaGVldH0gVGhlIHN0eWxlIGVsZW1lbnQuXG4gICAqL1xuICBmdW5jdGlvbiBhZGRTdHlsZVNoZWV0KG93bmVyRG9jdW1lbnQsIGNzc1RleHQpIHtcbiAgICB2YXIgcCA9IG93bmVyRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpLFxuICAgICAgICBwYXJlbnQgPSBvd25lckRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF0gfHwgb3duZXJEb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG5cbiAgICBwLmlubmVySFRNTCA9ICd4PHN0eWxlPicgKyBjc3NUZXh0ICsgJzwvc3R5bGU+JztcbiAgICByZXR1cm4gcGFyZW50Lmluc2VydEJlZm9yZShwLmxhc3RDaGlsZCwgcGFyZW50LmZpcnN0Q2hpbGQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIHZhbHVlIG9mIGBodG1sNS5lbGVtZW50c2AgYXMgYW4gYXJyYXkuXG4gICAqIEBwcml2YXRlXG4gICAqIEByZXR1cm5zIHtBcnJheX0gQW4gYXJyYXkgb2Ygc2hpdmVkIGVsZW1lbnQgbm9kZSBuYW1lcy5cbiAgICovXG4gIGZ1bmN0aW9uIGdldEVsZW1lbnRzKCkge1xuICAgIHZhciBlbGVtZW50cyA9IGh0bWw1LmVsZW1lbnRzO1xuICAgIHJldHVybiB0eXBlb2YgZWxlbWVudHMgPT0gJ3N0cmluZycgPyBlbGVtZW50cy5zcGxpdCgnICcpIDogZWxlbWVudHM7XG4gIH1cblxuICAvKipcbiAgICogRXh0ZW5kcyB0aGUgYnVpbHQtaW4gbGlzdCBvZiBodG1sNSBlbGVtZW50c1xuICAgKiBAbWVtYmVyT2YgaHRtbDVcbiAgICogQHBhcmFtIHtTdHJpbmd8QXJyYXl9IG5ld0VsZW1lbnRzIHdoaXRlc3BhY2Ugc2VwYXJhdGVkIGxpc3Qgb3IgYXJyYXkgb2YgbmV3IGVsZW1lbnQgbmFtZXMgdG8gc2hpdlxuICAgKiBAcGFyYW0ge0RvY3VtZW50fSBvd25lckRvY3VtZW50IFRoZSBjb250ZXh0IGRvY3VtZW50LlxuICAgKi9cbiAgZnVuY3Rpb24gYWRkRWxlbWVudHMobmV3RWxlbWVudHMsIG93bmVyRG9jdW1lbnQpIHtcbiAgICB2YXIgZWxlbWVudHMgPSBodG1sNS5lbGVtZW50cztcbiAgICBpZih0eXBlb2YgZWxlbWVudHMgIT0gJ3N0cmluZycpe1xuICAgICAgZWxlbWVudHMgPSBlbGVtZW50cy5qb2luKCcgJyk7XG4gICAgfVxuICAgIGlmKHR5cGVvZiBuZXdFbGVtZW50cyAhPSAnc3RyaW5nJyl7XG4gICAgICBuZXdFbGVtZW50cyA9IG5ld0VsZW1lbnRzLmpvaW4oJyAnKTtcbiAgICB9XG4gICAgaHRtbDUuZWxlbWVudHMgPSBlbGVtZW50cyArJyAnKyBuZXdFbGVtZW50cztcbiAgICBzaGl2RG9jdW1lbnQob3duZXJEb2N1bWVudCk7XG4gIH1cblxuICAgLyoqXG4gICAqIFJldHVybnMgdGhlIGRhdGEgYXNzb2NpYXRlZCB0byB0aGUgZ2l2ZW4gZG9jdW1lbnRcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtEb2N1bWVudH0gb3duZXJEb2N1bWVudCBUaGUgZG9jdW1lbnQuXG4gICAqIEByZXR1cm5zIHtPYmplY3R9IEFuIG9iamVjdCBvZiBkYXRhLlxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0RXhwYW5kb0RhdGEob3duZXJEb2N1bWVudCkge1xuICAgIHZhciBkYXRhID0gZXhwYW5kb0RhdGFbb3duZXJEb2N1bWVudFtleHBhbmRvXV07XG4gICAgaWYgKCFkYXRhKSB7XG4gICAgICAgIGRhdGEgPSB7fTtcbiAgICAgICAgZXhwYW5JRCsrO1xuICAgICAgICBvd25lckRvY3VtZW50W2V4cGFuZG9dID0gZXhwYW5JRDtcbiAgICAgICAgZXhwYW5kb0RhdGFbZXhwYW5JRF0gPSBkYXRhO1xuICAgIH1cbiAgICByZXR1cm4gZGF0YTtcbiAgfVxuXG4gIC8qKlxuICAgKiByZXR1cm5zIGEgc2hpdmVkIGVsZW1lbnQgZm9yIHRoZSBnaXZlbiBub2RlTmFtZSBhbmQgZG9jdW1lbnRcbiAgICogQG1lbWJlck9mIGh0bWw1XG4gICAqIEBwYXJhbSB7U3RyaW5nfSBub2RlTmFtZSBuYW1lIG9mIHRoZSBlbGVtZW50XG4gICAqIEBwYXJhbSB7RG9jdW1lbnR8RG9jdW1lbnRGcmFnbWVudH0gb3duZXJEb2N1bWVudCBUaGUgY29udGV4dCBkb2N1bWVudC5cbiAgICogQHJldHVybnMge09iamVjdH0gVGhlIHNoaXZlZCBlbGVtZW50LlxuICAgKi9cbiAgZnVuY3Rpb24gY3JlYXRlRWxlbWVudChub2RlTmFtZSwgb3duZXJEb2N1bWVudCwgZGF0YSl7XG4gICAgaWYgKCFvd25lckRvY3VtZW50KSB7XG4gICAgICAgIG93bmVyRG9jdW1lbnQgPSBkb2N1bWVudDtcbiAgICB9XG4gICAgaWYoc3VwcG9ydHNVbmtub3duRWxlbWVudHMpe1xuICAgICAgICByZXR1cm4gb3duZXJEb2N1bWVudC5jcmVhdGVFbGVtZW50KG5vZGVOYW1lKTtcbiAgICB9XG4gICAgaWYgKCFkYXRhKSB7XG4gICAgICAgIGRhdGEgPSBnZXRFeHBhbmRvRGF0YShvd25lckRvY3VtZW50KTtcbiAgICB9XG4gICAgdmFyIG5vZGU7XG5cbiAgICBpZiAoZGF0YS5jYWNoZVtub2RlTmFtZV0pIHtcbiAgICAgICAgbm9kZSA9IGRhdGEuY2FjaGVbbm9kZU5hbWVdLmNsb25lTm9kZSgpO1xuICAgIH0gZWxzZSBpZiAoc2F2ZUNsb25lcy50ZXN0KG5vZGVOYW1lKSkge1xuICAgICAgICBub2RlID0gKGRhdGEuY2FjaGVbbm9kZU5hbWVdID0gZGF0YS5jcmVhdGVFbGVtKG5vZGVOYW1lKSkuY2xvbmVOb2RlKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgbm9kZSA9IGRhdGEuY3JlYXRlRWxlbShub2RlTmFtZSk7XG4gICAgfVxuXG4gICAgLy8gQXZvaWQgYWRkaW5nIHNvbWUgZWxlbWVudHMgdG8gZnJhZ21lbnRzIGluIElFIDwgOSBiZWNhdXNlXG4gICAgLy8gKiBBdHRyaWJ1dGVzIGxpa2UgYG5hbWVgIG9yIGB0eXBlYCBjYW5ub3QgYmUgc2V0L2NoYW5nZWQgb25jZSBhbiBlbGVtZW50XG4gICAgLy8gICBpcyBpbnNlcnRlZCBpbnRvIGEgZG9jdW1lbnQvZnJhZ21lbnRcbiAgICAvLyAqIExpbmsgZWxlbWVudHMgd2l0aCBgc3JjYCBhdHRyaWJ1dGVzIHRoYXQgYXJlIGluYWNjZXNzaWJsZSwgYXMgd2l0aFxuICAgIC8vICAgYSA0MDMgcmVzcG9uc2UsIHdpbGwgY2F1c2UgdGhlIHRhYi93aW5kb3cgdG8gY3Jhc2hcbiAgICAvLyAqIFNjcmlwdCBlbGVtZW50cyBhcHBlbmRlZCB0byBmcmFnbWVudHMgd2lsbCBleGVjdXRlIHdoZW4gdGhlaXIgYHNyY2BcbiAgICAvLyAgIG9yIGB0ZXh0YCBwcm9wZXJ0eSBpcyBzZXRcbiAgICByZXR1cm4gbm9kZS5jYW5IYXZlQ2hpbGRyZW4gJiYgIXJlU2tpcC50ZXN0KG5vZGVOYW1lKSAmJiAhbm9kZS50YWdVcm4gPyBkYXRhLmZyYWcuYXBwZW5kQ2hpbGQobm9kZSkgOiBub2RlO1xuICB9XG5cbiAgLyoqXG4gICAqIHJldHVybnMgYSBzaGl2ZWQgRG9jdW1lbnRGcmFnbWVudCBmb3IgdGhlIGdpdmVuIGRvY3VtZW50XG4gICAqIEBtZW1iZXJPZiBodG1sNVxuICAgKiBAcGFyYW0ge0RvY3VtZW50fSBvd25lckRvY3VtZW50IFRoZSBjb250ZXh0IGRvY3VtZW50LlxuICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgc2hpdmVkIERvY3VtZW50RnJhZ21lbnQuXG4gICAqL1xuICBmdW5jdGlvbiBjcmVhdGVEb2N1bWVudEZyYWdtZW50KG93bmVyRG9jdW1lbnQsIGRhdGEpe1xuICAgIGlmICghb3duZXJEb2N1bWVudCkge1xuICAgICAgICBvd25lckRvY3VtZW50ID0gZG9jdW1lbnQ7XG4gICAgfVxuICAgIGlmKHN1cHBvcnRzVW5rbm93bkVsZW1lbnRzKXtcbiAgICAgICAgcmV0dXJuIG93bmVyRG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgIH1cbiAgICBkYXRhID0gZGF0YSB8fCBnZXRFeHBhbmRvRGF0YShvd25lckRvY3VtZW50KTtcbiAgICB2YXIgY2xvbmUgPSBkYXRhLmZyYWcuY2xvbmVOb2RlKCksXG4gICAgICAgIGkgPSAwLFxuICAgICAgICBlbGVtcyA9IGdldEVsZW1lbnRzKCksXG4gICAgICAgIGwgPSBlbGVtcy5sZW5ndGg7XG4gICAgZm9yKDtpPGw7aSsrKXtcbiAgICAgICAgY2xvbmUuY3JlYXRlRWxlbWVudChlbGVtc1tpXSk7XG4gICAgfVxuICAgIHJldHVybiBjbG9uZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTaGl2cyB0aGUgYGNyZWF0ZUVsZW1lbnRgIGFuZCBgY3JlYXRlRG9jdW1lbnRGcmFnbWVudGAgbWV0aG9kcyBvZiB0aGUgZG9jdW1lbnQuXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7RG9jdW1lbnR8RG9jdW1lbnRGcmFnbWVudH0gb3duZXJEb2N1bWVudCBUaGUgZG9jdW1lbnQuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIG9mIHRoZSBkb2N1bWVudC5cbiAgICovXG4gIGZ1bmN0aW9uIHNoaXZNZXRob2RzKG93bmVyRG9jdW1lbnQsIGRhdGEpIHtcbiAgICBpZiAoIWRhdGEuY2FjaGUpIHtcbiAgICAgICAgZGF0YS5jYWNoZSA9IHt9O1xuICAgICAgICBkYXRhLmNyZWF0ZUVsZW0gPSBvd25lckRvY3VtZW50LmNyZWF0ZUVsZW1lbnQ7XG4gICAgICAgIGRhdGEuY3JlYXRlRnJhZyA9IG93bmVyRG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudDtcbiAgICAgICAgZGF0YS5mcmFnID0gZGF0YS5jcmVhdGVGcmFnKCk7XG4gICAgfVxuXG5cbiAgICBvd25lckRvY3VtZW50LmNyZWF0ZUVsZW1lbnQgPSBmdW5jdGlvbihub2RlTmFtZSkge1xuICAgICAgLy9hYm9ydCBzaGl2XG4gICAgICBpZiAoIWh0bWw1LnNoaXZNZXRob2RzKSB7XG4gICAgICAgICAgcmV0dXJuIGRhdGEuY3JlYXRlRWxlbShub2RlTmFtZSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gY3JlYXRlRWxlbWVudChub2RlTmFtZSwgb3duZXJEb2N1bWVudCwgZGF0YSk7XG4gICAgfTtcblxuICAgIG93bmVyRG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCA9IEZ1bmN0aW9uKCdoLGYnLCAncmV0dXJuIGZ1bmN0aW9uKCl7JyArXG4gICAgICAndmFyIG49Zi5jbG9uZU5vZGUoKSxjPW4uY3JlYXRlRWxlbWVudDsnICtcbiAgICAgICdoLnNoaXZNZXRob2RzJiYoJyArXG4gICAgICAgIC8vIHVucm9sbCB0aGUgYGNyZWF0ZUVsZW1lbnRgIGNhbGxzXG4gICAgICAgIGdldEVsZW1lbnRzKCkuam9pbigpLnJlcGxhY2UoL1tcXHdcXC06XSsvZywgZnVuY3Rpb24obm9kZU5hbWUpIHtcbiAgICAgICAgICBkYXRhLmNyZWF0ZUVsZW0obm9kZU5hbWUpO1xuICAgICAgICAgIGRhdGEuZnJhZy5jcmVhdGVFbGVtZW50KG5vZGVOYW1lKTtcbiAgICAgICAgICByZXR1cm4gJ2MoXCInICsgbm9kZU5hbWUgKyAnXCIpJztcbiAgICAgICAgfSkgK1xuICAgICAgJyk7cmV0dXJuIG59J1xuICAgICkoaHRtbDUsIGRhdGEuZnJhZyk7XG4gIH1cblxuICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuICAvKipcbiAgICogU2hpdnMgdGhlIGdpdmVuIGRvY3VtZW50LlxuICAgKiBAbWVtYmVyT2YgaHRtbDVcbiAgICogQHBhcmFtIHtEb2N1bWVudH0gb3duZXJEb2N1bWVudCBUaGUgZG9jdW1lbnQgdG8gc2hpdi5cbiAgICogQHJldHVybnMge0RvY3VtZW50fSBUaGUgc2hpdmVkIGRvY3VtZW50LlxuICAgKi9cbiAgZnVuY3Rpb24gc2hpdkRvY3VtZW50KG93bmVyRG9jdW1lbnQpIHtcbiAgICBpZiAoIW93bmVyRG9jdW1lbnQpIHtcbiAgICAgICAgb3duZXJEb2N1bWVudCA9IGRvY3VtZW50O1xuICAgIH1cbiAgICB2YXIgZGF0YSA9IGdldEV4cGFuZG9EYXRhKG93bmVyRG9jdW1lbnQpO1xuXG4gICAgaWYgKGh0bWw1LnNoaXZDU1MgJiYgIXN1cHBvcnRzSHRtbDVTdHlsZXMgJiYgIWRhdGEuaGFzQ1NTKSB7XG4gICAgICBkYXRhLmhhc0NTUyA9ICEhYWRkU3R5bGVTaGVldChvd25lckRvY3VtZW50LFxuICAgICAgICAvLyBjb3JyZWN0cyBibG9jayBkaXNwbGF5IG5vdCBkZWZpbmVkIGluIElFNi83LzgvOVxuICAgICAgICAnYXJ0aWNsZSxhc2lkZSxkaWFsb2csZmlnY2FwdGlvbixmaWd1cmUsZm9vdGVyLGhlYWRlcixoZ3JvdXAsbWFpbixuYXYsc2VjdGlvbntkaXNwbGF5OmJsb2NrfScgK1xuICAgICAgICAvLyBhZGRzIHN0eWxpbmcgbm90IHByZXNlbnQgaW4gSUU2LzcvOC85XG4gICAgICAgICdtYXJre2JhY2tncm91bmQ6I0ZGMDtjb2xvcjojMDAwfScgK1xuICAgICAgICAvLyBoaWRlcyBub24tcmVuZGVyZWQgZWxlbWVudHNcbiAgICAgICAgJ3RlbXBsYXRle2Rpc3BsYXk6bm9uZX0nXG4gICAgICApO1xuICAgIH1cbiAgICBpZiAoIXN1cHBvcnRzVW5rbm93bkVsZW1lbnRzKSB7XG4gICAgICBzaGl2TWV0aG9kcyhvd25lckRvY3VtZW50LCBkYXRhKTtcbiAgICB9XG4gICAgcmV0dXJuIG93bmVyRG9jdW1lbnQ7XG4gIH1cblxuICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuICAvKipcbiAgICogVGhlIGBodG1sNWAgb2JqZWN0IGlzIGV4cG9zZWQgc28gdGhhdCBtb3JlIGVsZW1lbnRzIGNhbiBiZSBzaGl2ZWQgYW5kXG4gICAqIGV4aXN0aW5nIHNoaXZpbmcgY2FuIGJlIGRldGVjdGVkIG9uIGlmcmFtZXMuXG4gICAqIEB0eXBlIE9iamVjdFxuICAgKiBAZXhhbXBsZVxuICAgKlxuICAgKiAvLyBvcHRpb25zIGNhbiBiZSBjaGFuZ2VkIGJlZm9yZSB0aGUgc2NyaXB0IGlzIGluY2x1ZGVkXG4gICAqIGh0bWw1ID0geyAnZWxlbWVudHMnOiAnbWFyayBzZWN0aW9uJywgJ3NoaXZDU1MnOiBmYWxzZSwgJ3NoaXZNZXRob2RzJzogZmFsc2UgfTtcbiAgICovXG4gIHZhciBodG1sNSA9IHtcblxuICAgIC8qKlxuICAgICAqIEFuIGFycmF5IG9yIHNwYWNlIHNlcGFyYXRlZCBzdHJpbmcgb2Ygbm9kZSBuYW1lcyBvZiB0aGUgZWxlbWVudHMgdG8gc2hpdi5cbiAgICAgKiBAbWVtYmVyT2YgaHRtbDVcbiAgICAgKiBAdHlwZSBBcnJheXxTdHJpbmdcbiAgICAgKi9cbiAgICAnZWxlbWVudHMnOiBvcHRpb25zLmVsZW1lbnRzIHx8ICdhYmJyIGFydGljbGUgYXNpZGUgYXVkaW8gYmRpIGNhbnZhcyBkYXRhIGRhdGFsaXN0IGRldGFpbHMgZGlhbG9nIGZpZ2NhcHRpb24gZmlndXJlIGZvb3RlciBoZWFkZXIgaGdyb3VwIG1haW4gbWFyayBtZXRlciBuYXYgb3V0cHV0IHBpY3R1cmUgcHJvZ3Jlc3Mgc2VjdGlvbiBzdW1tYXJ5IHRlbXBsYXRlIHRpbWUgdmlkZW8nLFxuXG4gICAgLyoqXG4gICAgICogY3VycmVudCB2ZXJzaW9uIG9mIGh0bWw1c2hpdlxuICAgICAqL1xuICAgICd2ZXJzaW9uJzogdmVyc2lvbixcblxuICAgIC8qKlxuICAgICAqIEEgZmxhZyB0byBpbmRpY2F0ZSB0aGF0IHRoZSBIVE1MNSBzdHlsZSBzaGVldCBzaG91bGQgYmUgaW5zZXJ0ZWQuXG4gICAgICogQG1lbWJlck9mIGh0bWw1XG4gICAgICogQHR5cGUgQm9vbGVhblxuICAgICAqL1xuICAgICdzaGl2Q1NTJzogKG9wdGlvbnMuc2hpdkNTUyAhPT0gZmFsc2UpLFxuXG4gICAgLyoqXG4gICAgICogSXMgZXF1YWwgdG8gdHJ1ZSBpZiBhIGJyb3dzZXIgc3VwcG9ydHMgY3JlYXRpbmcgdW5rbm93bi9IVE1MNSBlbGVtZW50c1xuICAgICAqIEBtZW1iZXJPZiBodG1sNVxuICAgICAqIEB0eXBlIGJvb2xlYW5cbiAgICAgKi9cbiAgICAnc3VwcG9ydHNVbmtub3duRWxlbWVudHMnOiBzdXBwb3J0c1Vua25vd25FbGVtZW50cyxcblxuICAgIC8qKlxuICAgICAqIEEgZmxhZyB0byBpbmRpY2F0ZSB0aGF0IHRoZSBkb2N1bWVudCdzIGBjcmVhdGVFbGVtZW50YCBhbmQgYGNyZWF0ZURvY3VtZW50RnJhZ21lbnRgXG4gICAgICogbWV0aG9kcyBzaG91bGQgYmUgb3ZlcndyaXR0ZW4uXG4gICAgICogQG1lbWJlck9mIGh0bWw1XG4gICAgICogQHR5cGUgQm9vbGVhblxuICAgICAqL1xuICAgICdzaGl2TWV0aG9kcyc6IChvcHRpb25zLnNoaXZNZXRob2RzICE9PSBmYWxzZSksXG5cbiAgICAvKipcbiAgICAgKiBBIHN0cmluZyB0byBkZXNjcmliZSB0aGUgdHlwZSBvZiBgaHRtbDVgIG9iamVjdCAoXCJkZWZhdWx0XCIgb3IgXCJkZWZhdWx0IHByaW50XCIpLlxuICAgICAqIEBtZW1iZXJPZiBodG1sNVxuICAgICAqIEB0eXBlIFN0cmluZ1xuICAgICAqL1xuICAgICd0eXBlJzogJ2RlZmF1bHQnLFxuXG4gICAgLy8gc2hpdnMgdGhlIGRvY3VtZW50IGFjY29yZGluZyB0byB0aGUgc3BlY2lmaWVkIGBodG1sNWAgb2JqZWN0IG9wdGlvbnNcbiAgICAnc2hpdkRvY3VtZW50Jzogc2hpdkRvY3VtZW50LFxuXG4gICAgLy9jcmVhdGVzIGEgc2hpdmVkIGVsZW1lbnRcbiAgICBjcmVhdGVFbGVtZW50OiBjcmVhdGVFbGVtZW50LFxuXG4gICAgLy9jcmVhdGVzIGEgc2hpdmVkIGRvY3VtZW50RnJhZ21lbnRcbiAgICBjcmVhdGVEb2N1bWVudEZyYWdtZW50OiBjcmVhdGVEb2N1bWVudEZyYWdtZW50LFxuXG4gICAgLy9leHRlbmRzIGxpc3Qgb2YgZWxlbWVudHNcbiAgICBhZGRFbGVtZW50czogYWRkRWxlbWVudHNcbiAgfTtcblxuICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuICAvLyBleHBvc2UgaHRtbDVcbiAgd2luZG93Lmh0bWw1ID0gaHRtbDU7XG5cbiAgLy8gc2hpdiB0aGUgZG9jdW1lbnRcbiAgc2hpdkRvY3VtZW50KGRvY3VtZW50KTtcblxuICBpZih0eXBlb2YgbW9kdWxlID09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKXtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGh0bWw1O1xuICB9XG5cbn0odHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHRoaXMsIGRvY3VtZW50KSk7XG4iXSwiZmlsZSI6Imh0bWw1c2hpdi5qcyIsInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9