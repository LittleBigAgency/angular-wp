/*! matchMedia() polyfill - Test a CSS media type/query in JS. Authors & copyright (c) 2012: Scott Jehl, Paul Irish, Nicholas Zakas. Dual MIT/BSD license */
/*! NOTE: If you're already including a window.matchMedia polyfill via Modernizr or otherwise, you don't need this part */
(function(w) {
  "use strict";
  w.matchMedia = w.matchMedia || function(doc, undefined) {
    var bool, docElem = doc.documentElement, refNode = docElem.firstElementChild || docElem.firstChild, fakeBody = doc.createElement("body"), div = doc.createElement("div");
    div.id = "mq-test-1";
    div.style.cssText = "position:absolute;top:-100em";
    fakeBody.style.background = "none";
    fakeBody.appendChild(div);
    return function(q) {
      div.innerHTML = '&shy;<style media="' + q + '"> #mq-test-1 { width: 42px; }</style>';
      docElem.insertBefore(fakeBody, refNode);
      bool = div.offsetWidth === 42;
      docElem.removeChild(fakeBody);
      return {
        matches: bool,
        media: q
      };
    };
  }(w.document);
})(this);

/*! Respond.js v1.4.0: min/max-width media query polyfill. (c) Scott Jehl. MIT Lic. j.mp/respondjs  */
(function(w) {
  "use strict";
  var respond = {};
  w.respond = respond;
  respond.update = function() {};
  var requestQueue = [], xmlHttp = function() {
    var xmlhttpmethod = false;
    try {
      xmlhttpmethod = new w.XMLHttpRequest();
    } catch (e) {
      xmlhttpmethod = new w.ActiveXObject("Microsoft.XMLHTTP");
    }
    return function() {
      return xmlhttpmethod;
    };
  }(), ajax = function(url, callback) {
    var req = xmlHttp();
    if (!req) {
      return;
    }
    req.open("GET", url, true);
    req.onreadystatechange = function() {
      if (req.readyState !== 4 || req.status !== 200 && req.status !== 304) {
        return;
      }
      callback(req.responseText);
    };
    if (req.readyState === 4) {
      return;
    }
    req.send(null);
  };
  respond.ajax = ajax;
  respond.queue = requestQueue;
  respond.regex = {
    media: /@media[^\{]+\{([^\{\}]*\{[^\}\{]*\})+/gi,
    keyframes: /@(?:\-(?:o|moz|webkit)\-)?keyframes[^\{]+\{(?:[^\{\}]*\{[^\}\{]*\})+[^\}]*\}/gi,
    urls: /(url\()['"]?([^\/\)'"][^:\)'"]+)['"]?(\))/g,
    findStyles: /@media *([^\{]+)\{([\S\s]+?)$/,
    only: /(only\s+)?([a-zA-Z]+)\s?/,
    minw: /\([\s]*min\-width\s*:[\s]*([\s]*[0-9\.]+)(px|em)[\s]*\)/,
    maxw: /\([\s]*max\-width\s*:[\s]*([\s]*[0-9\.]+)(px|em)[\s]*\)/
  };
  respond.mediaQueriesSupported = w.matchMedia && w.matchMedia("only all") !== null && w.matchMedia("only all").matches;
  if (respond.mediaQueriesSupported) {
    return;
  }
  var doc = w.document, docElem = doc.documentElement, mediastyles = [], rules = [], appendedEls = [], parsedSheets = {}, resizeThrottle = 30, head = doc.getElementsByTagName("head")[0] || docElem, base = doc.getElementsByTagName("base")[0], links = head.getElementsByTagName("link"), lastCall, resizeDefer, eminpx, getEmValue = function() {
    var ret, div = doc.createElement("div"), body = doc.body, originalHTMLFontSize = docElem.style.fontSize, originalBodyFontSize = body && body.style.fontSize, fakeUsed = false;
    div.style.cssText = "position:absolute;font-size:1em;width:1em";
    if (!body) {
      body = fakeUsed = doc.createElement("body");
      body.style.background = "none";
    }
    docElem.style.fontSize = "100%";
    body.style.fontSize = "100%";
    body.appendChild(div);
    if (fakeUsed) {
      docElem.insertBefore(body, docElem.firstChild);
    }
    ret = div.offsetWidth;
    if (fakeUsed) {
      docElem.removeChild(body);
    } else {
      body.removeChild(div);
    }
    docElem.style.fontSize = originalHTMLFontSize;
    if (originalBodyFontSize) {
      body.style.fontSize = originalBodyFontSize;
    }
    ret = eminpx = parseFloat(ret);
    return ret;
  }, applyMedia = function(fromResize) {
    var name = "clientWidth", docElemProp = docElem[name], currWidth = doc.compatMode === "CSS1Compat" && docElemProp || doc.body[name] || docElemProp, styleBlocks = {}, lastLink = links[links.length - 1], now = new Date().getTime();
    if (fromResize && lastCall && now - lastCall < resizeThrottle) {
      w.clearTimeout(resizeDefer);
      resizeDefer = w.setTimeout(applyMedia, resizeThrottle);
      return;
    } else {
      lastCall = now;
    }
    for (var i in mediastyles) {
      if (mediastyles.hasOwnProperty(i)) {
        var thisstyle = mediastyles[i], min = thisstyle.minw, max = thisstyle.maxw, minnull = min === null, maxnull = max === null, em = "em";
        if (!!min) {
          min = parseFloat(min) * (min.indexOf(em) > -1 ? eminpx || getEmValue() : 1);
        }
        if (!!max) {
          max = parseFloat(max) * (max.indexOf(em) > -1 ? eminpx || getEmValue() : 1);
        }
        if (!thisstyle.hasquery || (!minnull || !maxnull) && (minnull || currWidth >= min) && (maxnull || currWidth <= max)) {
          if (!styleBlocks[thisstyle.media]) {
            styleBlocks[thisstyle.media] = [];
          }
          styleBlocks[thisstyle.media].push(rules[thisstyle.rules]);
        }
      }
    }
    for (var j in appendedEls) {
      if (appendedEls.hasOwnProperty(j)) {
        if (appendedEls[j] && appendedEls[j].parentNode === head) {
          head.removeChild(appendedEls[j]);
        }
      }
    }
    appendedEls.length = 0;
    for (var k in styleBlocks) {
      if (styleBlocks.hasOwnProperty(k)) {
        var ss = doc.createElement("style"), css = styleBlocks[k].join("\n");
        ss.type = "text/css";
        ss.media = k;
        head.insertBefore(ss, lastLink.nextSibling);
        if (ss.styleSheet) {
          ss.styleSheet.cssText = css;
        } else {
          ss.appendChild(doc.createTextNode(css));
        }
        appendedEls.push(ss);
      }
    }
  }, translate = function(styles, href, media) {
    var qs = styles.replace(respond.regex.keyframes, "").match(respond.regex.media), ql = qs && qs.length || 0;
    href = href.substring(0, href.lastIndexOf("/"));
    var repUrls = function(css) {
      return css.replace(respond.regex.urls, "$1" + href + "$2$3");
    }, useMedia = !ql && media;
    if (href.length) {
      href += "/";
    }
    if (useMedia) {
      ql = 1;
    }
    for (var i = 0; i < ql; i++) {
      var fullq, thisq, eachq, eql;
      if (useMedia) {
        fullq = media;
        rules.push(repUrls(styles));
      } else {
        fullq = qs[i].match(respond.regex.findStyles) && RegExp.$1;
        rules.push(RegExp.$2 && repUrls(RegExp.$2));
      }
      eachq = fullq.split(",");
      eql = eachq.length;
      for (var j = 0; j < eql; j++) {
        thisq = eachq[j];
        mediastyles.push({
          media: thisq.split("(")[0].match(respond.regex.only) && RegExp.$2 || "all",
          rules: rules.length - 1,
          hasquery: thisq.indexOf("(") > -1,
          minw: thisq.match(respond.regex.minw) && parseFloat(RegExp.$1) + (RegExp.$2 || ""),
          maxw: thisq.match(respond.regex.maxw) && parseFloat(RegExp.$1) + (RegExp.$2 || "")
        });
      }
    }
    applyMedia();
  }, makeRequests = function() {
    if (requestQueue.length) {
      var thisRequest = requestQueue.shift();
      ajax(thisRequest.href, function(styles) {
        translate(styles, thisRequest.href, thisRequest.media);
        parsedSheets[thisRequest.href] = true;
        w.setTimeout(function() {
          makeRequests();
        }, 0);
      });
    }
  }, ripCSS = function() {
    for (var i = 0; i < links.length; i++) {
      var sheet = links[i], href = sheet.href, media = sheet.media, isCSS = sheet.rel && sheet.rel.toLowerCase() === "stylesheet";
      if (!!href && isCSS && !parsedSheets[href]) {
        if (sheet.styleSheet && sheet.styleSheet.rawCssText) {
          translate(sheet.styleSheet.rawCssText, href, media);
          parsedSheets[href] = true;
        } else {
          if (!/^([a-zA-Z:]*\/\/)/.test(href) && !base || href.replace(RegExp.$1, "").split("/")[0] === w.location.host) {
            if (href.substring(0, 2) === "//") {
              href = w.location.protocol + href;
            }
            requestQueue.push({
              href: href,
              media: media
            });
          }
        }
      }
    }
    makeRequests();
  };
  ripCSS();
  respond.update = ripCSS;
  respond.getEmValue = getEmValue;
  function callMedia() {
    applyMedia(true);
  }
  if (w.addEventListener) {
    w.addEventListener("resize", callMedia, false);
  } else if (w.attachEvent) {
    w.attachEvent("onresize", callMedia);
  }
})(this);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJyZXNwb25kLnNyYy5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiEgbWF0Y2hNZWRpYSgpIHBvbHlmaWxsIC0gVGVzdCBhIENTUyBtZWRpYSB0eXBlL3F1ZXJ5IGluIEpTLiBBdXRob3JzICYgY29weXJpZ2h0IChjKSAyMDEyOiBTY290dCBKZWhsLCBQYXVsIElyaXNoLCBOaWNob2xhcyBaYWthcy4gRHVhbCBNSVQvQlNEIGxpY2Vuc2UgKi9cbi8qISBOT1RFOiBJZiB5b3UncmUgYWxyZWFkeSBpbmNsdWRpbmcgYSB3aW5kb3cubWF0Y2hNZWRpYSBwb2x5ZmlsbCB2aWEgTW9kZXJuaXpyIG9yIG90aGVyd2lzZSwgeW91IGRvbid0IG5lZWQgdGhpcyBwYXJ0ICovXG4oZnVuY3Rpb24odykge1xuICBcInVzZSBzdHJpY3RcIjtcbiAgdy5tYXRjaE1lZGlhID0gdy5tYXRjaE1lZGlhIHx8IGZ1bmN0aW9uKGRvYywgdW5kZWZpbmVkKSB7XG4gICAgdmFyIGJvb2wsIGRvY0VsZW0gPSBkb2MuZG9jdW1lbnRFbGVtZW50LCByZWZOb2RlID0gZG9jRWxlbS5maXJzdEVsZW1lbnRDaGlsZCB8fCBkb2NFbGVtLmZpcnN0Q2hpbGQsIGZha2VCb2R5ID0gZG9jLmNyZWF0ZUVsZW1lbnQoXCJib2R5XCIpLCBkaXYgPSBkb2MuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICBkaXYuaWQgPSBcIm1xLXRlc3QtMVwiO1xuICAgIGRpdi5zdHlsZS5jc3NUZXh0ID0gXCJwb3NpdGlvbjphYnNvbHV0ZTt0b3A6LTEwMGVtXCI7XG4gICAgZmFrZUJvZHkuc3R5bGUuYmFja2dyb3VuZCA9IFwibm9uZVwiO1xuICAgIGZha2VCb2R5LmFwcGVuZENoaWxkKGRpdik7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHEpIHtcbiAgICAgIGRpdi5pbm5lckhUTUwgPSAnJnNoeTs8c3R5bGUgbWVkaWE9XCInICsgcSArICdcIj4gI21xLXRlc3QtMSB7IHdpZHRoOiA0MnB4OyB9PC9zdHlsZT4nO1xuICAgICAgZG9jRWxlbS5pbnNlcnRCZWZvcmUoZmFrZUJvZHksIHJlZk5vZGUpO1xuICAgICAgYm9vbCA9IGRpdi5vZmZzZXRXaWR0aCA9PT0gNDI7XG4gICAgICBkb2NFbGVtLnJlbW92ZUNoaWxkKGZha2VCb2R5KTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG1hdGNoZXM6IGJvb2wsXG4gICAgICAgIG1lZGlhOiBxXG4gICAgICB9O1xuICAgIH07XG4gIH0ody5kb2N1bWVudCk7XG59KSh0aGlzKTtcblxuLyohIFJlc3BvbmQuanMgdjEuNC4wOiBtaW4vbWF4LXdpZHRoIG1lZGlhIHF1ZXJ5IHBvbHlmaWxsLiAoYykgU2NvdHQgSmVobC4gTUlUIExpYy4gai5tcC9yZXNwb25kanMgICovXG4oZnVuY3Rpb24odykge1xuICBcInVzZSBzdHJpY3RcIjtcbiAgdmFyIHJlc3BvbmQgPSB7fTtcbiAgdy5yZXNwb25kID0gcmVzcG9uZDtcbiAgcmVzcG9uZC51cGRhdGUgPSBmdW5jdGlvbigpIHt9O1xuICB2YXIgcmVxdWVzdFF1ZXVlID0gW10sIHhtbEh0dHAgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgeG1saHR0cG1ldGhvZCA9IGZhbHNlO1xuICAgIHRyeSB7XG4gICAgICB4bWxodHRwbWV0aG9kID0gbmV3IHcuWE1MSHR0cFJlcXVlc3QoKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB4bWxodHRwbWV0aG9kID0gbmV3IHcuQWN0aXZlWE9iamVjdChcIk1pY3Jvc29mdC5YTUxIVFRQXCIpO1xuICAgIH1cbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4geG1saHR0cG1ldGhvZDtcbiAgICB9O1xuICB9KCksIGFqYXggPSBmdW5jdGlvbih1cmwsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHJlcSA9IHhtbEh0dHAoKTtcbiAgICBpZiAoIXJlcSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICByZXEub3BlbihcIkdFVFwiLCB1cmwsIHRydWUpO1xuICAgIHJlcS5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcbiAgICAgIGlmIChyZXEucmVhZHlTdGF0ZSAhPT0gNCB8fCByZXEuc3RhdHVzICE9PSAyMDAgJiYgcmVxLnN0YXR1cyAhPT0gMzA0KSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNhbGxiYWNrKHJlcS5yZXNwb25zZVRleHQpO1xuICAgIH07XG4gICAgaWYgKHJlcS5yZWFkeVN0YXRlID09PSA0KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHJlcS5zZW5kKG51bGwpO1xuICB9O1xuICByZXNwb25kLmFqYXggPSBhamF4O1xuICByZXNwb25kLnF1ZXVlID0gcmVxdWVzdFF1ZXVlO1xuICByZXNwb25kLnJlZ2V4ID0ge1xuICAgIG1lZGlhOiAvQG1lZGlhW15cXHtdK1xceyhbXlxce1xcfV0qXFx7W15cXH1cXHtdKlxcfSkrL2dpLFxuICAgIGtleWZyYW1lczogL0AoPzpcXC0oPzpvfG1venx3ZWJraXQpXFwtKT9rZXlmcmFtZXNbXlxce10rXFx7KD86W15cXHtcXH1dKlxce1teXFx9XFx7XSpcXH0pK1teXFx9XSpcXH0vZ2ksXG4gICAgdXJsczogLyh1cmxcXCgpWydcIl0/KFteXFwvXFwpJ1wiXVteOlxcKSdcIl0rKVsnXCJdPyhcXCkpL2csXG4gICAgZmluZFN0eWxlczogL0BtZWRpYSAqKFteXFx7XSspXFx7KFtcXFNcXHNdKz8pJC8sXG4gICAgb25seTogLyhvbmx5XFxzKyk/KFthLXpBLVpdKylcXHM/LyxcbiAgICBtaW53OiAvXFwoW1xcc10qbWluXFwtd2lkdGhcXHMqOltcXHNdKihbXFxzXSpbMC05XFwuXSspKHB4fGVtKVtcXHNdKlxcKS8sXG4gICAgbWF4dzogL1xcKFtcXHNdKm1heFxcLXdpZHRoXFxzKjpbXFxzXSooW1xcc10qWzAtOVxcLl0rKShweHxlbSlbXFxzXSpcXCkvXG4gIH07XG4gIHJlc3BvbmQubWVkaWFRdWVyaWVzU3VwcG9ydGVkID0gdy5tYXRjaE1lZGlhICYmIHcubWF0Y2hNZWRpYShcIm9ubHkgYWxsXCIpICE9PSBudWxsICYmIHcubWF0Y2hNZWRpYShcIm9ubHkgYWxsXCIpLm1hdGNoZXM7XG4gIGlmIChyZXNwb25kLm1lZGlhUXVlcmllc1N1cHBvcnRlZCkge1xuICAgIHJldHVybjtcbiAgfVxuICB2YXIgZG9jID0gdy5kb2N1bWVudCwgZG9jRWxlbSA9IGRvYy5kb2N1bWVudEVsZW1lbnQsIG1lZGlhc3R5bGVzID0gW10sIHJ1bGVzID0gW10sIGFwcGVuZGVkRWxzID0gW10sIHBhcnNlZFNoZWV0cyA9IHt9LCByZXNpemVUaHJvdHRsZSA9IDMwLCBoZWFkID0gZG9jLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiaGVhZFwiKVswXSB8fCBkb2NFbGVtLCBiYXNlID0gZG9jLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiYmFzZVwiKVswXSwgbGlua3MgPSBoZWFkLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwibGlua1wiKSwgbGFzdENhbGwsIHJlc2l6ZURlZmVyLCBlbWlucHgsIGdldEVtVmFsdWUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcmV0LCBkaXYgPSBkb2MuY3JlYXRlRWxlbWVudChcImRpdlwiKSwgYm9keSA9IGRvYy5ib2R5LCBvcmlnaW5hbEhUTUxGb250U2l6ZSA9IGRvY0VsZW0uc3R5bGUuZm9udFNpemUsIG9yaWdpbmFsQm9keUZvbnRTaXplID0gYm9keSAmJiBib2R5LnN0eWxlLmZvbnRTaXplLCBmYWtlVXNlZCA9IGZhbHNlO1xuICAgIGRpdi5zdHlsZS5jc3NUZXh0ID0gXCJwb3NpdGlvbjphYnNvbHV0ZTtmb250LXNpemU6MWVtO3dpZHRoOjFlbVwiO1xuICAgIGlmICghYm9keSkge1xuICAgICAgYm9keSA9IGZha2VVc2VkID0gZG9jLmNyZWF0ZUVsZW1lbnQoXCJib2R5XCIpO1xuICAgICAgYm9keS5zdHlsZS5iYWNrZ3JvdW5kID0gXCJub25lXCI7XG4gICAgfVxuICAgIGRvY0VsZW0uc3R5bGUuZm9udFNpemUgPSBcIjEwMCVcIjtcbiAgICBib2R5LnN0eWxlLmZvbnRTaXplID0gXCIxMDAlXCI7XG4gICAgYm9keS5hcHBlbmRDaGlsZChkaXYpO1xuICAgIGlmIChmYWtlVXNlZCkge1xuICAgICAgZG9jRWxlbS5pbnNlcnRCZWZvcmUoYm9keSwgZG9jRWxlbS5maXJzdENoaWxkKTtcbiAgICB9XG4gICAgcmV0ID0gZGl2Lm9mZnNldFdpZHRoO1xuICAgIGlmIChmYWtlVXNlZCkge1xuICAgICAgZG9jRWxlbS5yZW1vdmVDaGlsZChib2R5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgYm9keS5yZW1vdmVDaGlsZChkaXYpO1xuICAgIH1cbiAgICBkb2NFbGVtLnN0eWxlLmZvbnRTaXplID0gb3JpZ2luYWxIVE1MRm9udFNpemU7XG4gICAgaWYgKG9yaWdpbmFsQm9keUZvbnRTaXplKSB7XG4gICAgICBib2R5LnN0eWxlLmZvbnRTaXplID0gb3JpZ2luYWxCb2R5Rm9udFNpemU7XG4gICAgfVxuICAgIHJldCA9IGVtaW5weCA9IHBhcnNlRmxvYXQocmV0KTtcbiAgICByZXR1cm4gcmV0O1xuICB9LCBhcHBseU1lZGlhID0gZnVuY3Rpb24oZnJvbVJlc2l6ZSkge1xuICAgIHZhciBuYW1lID0gXCJjbGllbnRXaWR0aFwiLCBkb2NFbGVtUHJvcCA9IGRvY0VsZW1bbmFtZV0sIGN1cnJXaWR0aCA9IGRvYy5jb21wYXRNb2RlID09PSBcIkNTUzFDb21wYXRcIiAmJiBkb2NFbGVtUHJvcCB8fCBkb2MuYm9keVtuYW1lXSB8fCBkb2NFbGVtUHJvcCwgc3R5bGVCbG9ja3MgPSB7fSwgbGFzdExpbmsgPSBsaW5rc1tsaW5rcy5sZW5ndGggLSAxXSwgbm93ID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgaWYgKGZyb21SZXNpemUgJiYgbGFzdENhbGwgJiYgbm93IC0gbGFzdENhbGwgPCByZXNpemVUaHJvdHRsZSkge1xuICAgICAgdy5jbGVhclRpbWVvdXQocmVzaXplRGVmZXIpO1xuICAgICAgcmVzaXplRGVmZXIgPSB3LnNldFRpbWVvdXQoYXBwbHlNZWRpYSwgcmVzaXplVGhyb3R0bGUpO1xuICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSB7XG4gICAgICBsYXN0Q2FsbCA9IG5vdztcbiAgICB9XG4gICAgZm9yICh2YXIgaSBpbiBtZWRpYXN0eWxlcykge1xuICAgICAgaWYgKG1lZGlhc3R5bGVzLmhhc093blByb3BlcnR5KGkpKSB7XG4gICAgICAgIHZhciB0aGlzc3R5bGUgPSBtZWRpYXN0eWxlc1tpXSwgbWluID0gdGhpc3N0eWxlLm1pbncsIG1heCA9IHRoaXNzdHlsZS5tYXh3LCBtaW5udWxsID0gbWluID09PSBudWxsLCBtYXhudWxsID0gbWF4ID09PSBudWxsLCBlbSA9IFwiZW1cIjtcbiAgICAgICAgaWYgKCEhbWluKSB7XG4gICAgICAgICAgbWluID0gcGFyc2VGbG9hdChtaW4pICogKG1pbi5pbmRleE9mKGVtKSA+IC0xID8gZW1pbnB4IHx8IGdldEVtVmFsdWUoKSA6IDEpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghIW1heCkge1xuICAgICAgICAgIG1heCA9IHBhcnNlRmxvYXQobWF4KSAqIChtYXguaW5kZXhPZihlbSkgPiAtMSA/IGVtaW5weCB8fCBnZXRFbVZhbHVlKCkgOiAxKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRoaXNzdHlsZS5oYXNxdWVyeSB8fCAoIW1pbm51bGwgfHwgIW1heG51bGwpICYmIChtaW5udWxsIHx8IGN1cnJXaWR0aCA+PSBtaW4pICYmIChtYXhudWxsIHx8IGN1cnJXaWR0aCA8PSBtYXgpKSB7XG4gICAgICAgICAgaWYgKCFzdHlsZUJsb2Nrc1t0aGlzc3R5bGUubWVkaWFdKSB7XG4gICAgICAgICAgICBzdHlsZUJsb2Nrc1t0aGlzc3R5bGUubWVkaWFdID0gW107XG4gICAgICAgICAgfVxuICAgICAgICAgIHN0eWxlQmxvY2tzW3RoaXNzdHlsZS5tZWRpYV0ucHVzaChydWxlc1t0aGlzc3R5bGUucnVsZXNdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKHZhciBqIGluIGFwcGVuZGVkRWxzKSB7XG4gICAgICBpZiAoYXBwZW5kZWRFbHMuaGFzT3duUHJvcGVydHkoaikpIHtcbiAgICAgICAgaWYgKGFwcGVuZGVkRWxzW2pdICYmIGFwcGVuZGVkRWxzW2pdLnBhcmVudE5vZGUgPT09IGhlYWQpIHtcbiAgICAgICAgICBoZWFkLnJlbW92ZUNoaWxkKGFwcGVuZGVkRWxzW2pdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBhcHBlbmRlZEVscy5sZW5ndGggPSAwO1xuICAgIGZvciAodmFyIGsgaW4gc3R5bGVCbG9ja3MpIHtcbiAgICAgIGlmIChzdHlsZUJsb2Nrcy5oYXNPd25Qcm9wZXJ0eShrKSkge1xuICAgICAgICB2YXIgc3MgPSBkb2MuY3JlYXRlRWxlbWVudChcInN0eWxlXCIpLCBjc3MgPSBzdHlsZUJsb2Nrc1trXS5qb2luKFwiXFxuXCIpO1xuICAgICAgICBzcy50eXBlID0gXCJ0ZXh0L2Nzc1wiO1xuICAgICAgICBzcy5tZWRpYSA9IGs7XG4gICAgICAgIGhlYWQuaW5zZXJ0QmVmb3JlKHNzLCBsYXN0TGluay5uZXh0U2libGluZyk7XG4gICAgICAgIGlmIChzcy5zdHlsZVNoZWV0KSB7XG4gICAgICAgICAgc3Muc3R5bGVTaGVldC5jc3NUZXh0ID0gY3NzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHNzLmFwcGVuZENoaWxkKGRvYy5jcmVhdGVUZXh0Tm9kZShjc3MpKTtcbiAgICAgICAgfVxuICAgICAgICBhcHBlbmRlZEVscy5wdXNoKHNzKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sIHRyYW5zbGF0ZSA9IGZ1bmN0aW9uKHN0eWxlcywgaHJlZiwgbWVkaWEpIHtcbiAgICB2YXIgcXMgPSBzdHlsZXMucmVwbGFjZShyZXNwb25kLnJlZ2V4LmtleWZyYW1lcywgXCJcIikubWF0Y2gocmVzcG9uZC5yZWdleC5tZWRpYSksIHFsID0gcXMgJiYgcXMubGVuZ3RoIHx8IDA7XG4gICAgaHJlZiA9IGhyZWYuc3Vic3RyaW5nKDAsIGhyZWYubGFzdEluZGV4T2YoXCIvXCIpKTtcbiAgICB2YXIgcmVwVXJscyA9IGZ1bmN0aW9uKGNzcykge1xuICAgICAgcmV0dXJuIGNzcy5yZXBsYWNlKHJlc3BvbmQucmVnZXgudXJscywgXCIkMVwiICsgaHJlZiArIFwiJDIkM1wiKTtcbiAgICB9LCB1c2VNZWRpYSA9ICFxbCAmJiBtZWRpYTtcbiAgICBpZiAoaHJlZi5sZW5ndGgpIHtcbiAgICAgIGhyZWYgKz0gXCIvXCI7XG4gICAgfVxuICAgIGlmICh1c2VNZWRpYSkge1xuICAgICAgcWwgPSAxO1xuICAgIH1cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHFsOyBpKyspIHtcbiAgICAgIHZhciBmdWxscSwgdGhpc3EsIGVhY2hxLCBlcWw7XG4gICAgICBpZiAodXNlTWVkaWEpIHtcbiAgICAgICAgZnVsbHEgPSBtZWRpYTtcbiAgICAgICAgcnVsZXMucHVzaChyZXBVcmxzKHN0eWxlcykpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZnVsbHEgPSBxc1tpXS5tYXRjaChyZXNwb25kLnJlZ2V4LmZpbmRTdHlsZXMpICYmIFJlZ0V4cC4kMTtcbiAgICAgICAgcnVsZXMucHVzaChSZWdFeHAuJDIgJiYgcmVwVXJscyhSZWdFeHAuJDIpKTtcbiAgICAgIH1cbiAgICAgIGVhY2hxID0gZnVsbHEuc3BsaXQoXCIsXCIpO1xuICAgICAgZXFsID0gZWFjaHEubGVuZ3RoO1xuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBlcWw7IGorKykge1xuICAgICAgICB0aGlzcSA9IGVhY2hxW2pdO1xuICAgICAgICBtZWRpYXN0eWxlcy5wdXNoKHtcbiAgICAgICAgICBtZWRpYTogdGhpc3Euc3BsaXQoXCIoXCIpWzBdLm1hdGNoKHJlc3BvbmQucmVnZXgub25seSkgJiYgUmVnRXhwLiQyIHx8IFwiYWxsXCIsXG4gICAgICAgICAgcnVsZXM6IHJ1bGVzLmxlbmd0aCAtIDEsXG4gICAgICAgICAgaGFzcXVlcnk6IHRoaXNxLmluZGV4T2YoXCIoXCIpID4gLTEsXG4gICAgICAgICAgbWludzogdGhpc3EubWF0Y2gocmVzcG9uZC5yZWdleC5taW53KSAmJiBwYXJzZUZsb2F0KFJlZ0V4cC4kMSkgKyAoUmVnRXhwLiQyIHx8IFwiXCIpLFxuICAgICAgICAgIG1heHc6IHRoaXNxLm1hdGNoKHJlc3BvbmQucmVnZXgubWF4dykgJiYgcGFyc2VGbG9hdChSZWdFeHAuJDEpICsgKFJlZ0V4cC4kMiB8fCBcIlwiKVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gICAgYXBwbHlNZWRpYSgpO1xuICB9LCBtYWtlUmVxdWVzdHMgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAocmVxdWVzdFF1ZXVlLmxlbmd0aCkge1xuICAgICAgdmFyIHRoaXNSZXF1ZXN0ID0gcmVxdWVzdFF1ZXVlLnNoaWZ0KCk7XG4gICAgICBhamF4KHRoaXNSZXF1ZXN0LmhyZWYsIGZ1bmN0aW9uKHN0eWxlcykge1xuICAgICAgICB0cmFuc2xhdGUoc3R5bGVzLCB0aGlzUmVxdWVzdC5ocmVmLCB0aGlzUmVxdWVzdC5tZWRpYSk7XG4gICAgICAgIHBhcnNlZFNoZWV0c1t0aGlzUmVxdWVzdC5ocmVmXSA9IHRydWU7XG4gICAgICAgIHcuc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICBtYWtlUmVxdWVzdHMoKTtcbiAgICAgICAgfSwgMCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH0sIHJpcENTUyA9IGZ1bmN0aW9uKCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGlua3MubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBzaGVldCA9IGxpbmtzW2ldLCBocmVmID0gc2hlZXQuaHJlZiwgbWVkaWEgPSBzaGVldC5tZWRpYSwgaXNDU1MgPSBzaGVldC5yZWwgJiYgc2hlZXQucmVsLnRvTG93ZXJDYXNlKCkgPT09IFwic3R5bGVzaGVldFwiO1xuICAgICAgaWYgKCEhaHJlZiAmJiBpc0NTUyAmJiAhcGFyc2VkU2hlZXRzW2hyZWZdKSB7XG4gICAgICAgIGlmIChzaGVldC5zdHlsZVNoZWV0ICYmIHNoZWV0LnN0eWxlU2hlZXQucmF3Q3NzVGV4dCkge1xuICAgICAgICAgIHRyYW5zbGF0ZShzaGVldC5zdHlsZVNoZWV0LnJhd0Nzc1RleHQsIGhyZWYsIG1lZGlhKTtcbiAgICAgICAgICBwYXJzZWRTaGVldHNbaHJlZl0gPSB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmICghL14oW2EtekEtWjpdKlxcL1xcLykvLnRlc3QoaHJlZikgJiYgIWJhc2UgfHwgaHJlZi5yZXBsYWNlKFJlZ0V4cC4kMSwgXCJcIikuc3BsaXQoXCIvXCIpWzBdID09PSB3LmxvY2F0aW9uLmhvc3QpIHtcbiAgICAgICAgICAgIGlmIChocmVmLnN1YnN0cmluZygwLCAyKSA9PT0gXCIvL1wiKSB7XG4gICAgICAgICAgICAgIGhyZWYgPSB3LmxvY2F0aW9uLnByb3RvY29sICsgaHJlZjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlcXVlc3RRdWV1ZS5wdXNoKHtcbiAgICAgICAgICAgICAgaHJlZjogaHJlZixcbiAgICAgICAgICAgICAgbWVkaWE6IG1lZGlhXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgbWFrZVJlcXVlc3RzKCk7XG4gIH07XG4gIHJpcENTUygpO1xuICByZXNwb25kLnVwZGF0ZSA9IHJpcENTUztcbiAgcmVzcG9uZC5nZXRFbVZhbHVlID0gZ2V0RW1WYWx1ZTtcbiAgZnVuY3Rpb24gY2FsbE1lZGlhKCkge1xuICAgIGFwcGx5TWVkaWEodHJ1ZSk7XG4gIH1cbiAgaWYgKHcuYWRkRXZlbnRMaXN0ZW5lcikge1xuICAgIHcuYWRkRXZlbnRMaXN0ZW5lcihcInJlc2l6ZVwiLCBjYWxsTWVkaWEsIGZhbHNlKTtcbiAgfSBlbHNlIGlmICh3LmF0dGFjaEV2ZW50KSB7XG4gICAgdy5hdHRhY2hFdmVudChcIm9ucmVzaXplXCIsIGNhbGxNZWRpYSk7XG4gIH1cbn0pKHRoaXMpOyJdLCJmaWxlIjoicmVzcG9uZC5zcmMuanMiLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==