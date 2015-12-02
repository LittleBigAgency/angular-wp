/*!
 * angular-translate - v2.7.2 - 2015-06-01
 * http://github.com/angular-translate/angular-translate
 * Copyright (c) 2015 ; Licensed MIT
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module unless amdModuleId is set
    define([], function () {
      return (factory());
    });
  } else if (typeof exports === 'object') {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory();
  } else {
    factory();
  }
}(this, function () {

/**
 * @ngdoc overview
 * @name pascalprecht.translate
 *
 * @description
 * The main module which holds everything together.
 */
angular.module('pascalprecht.translate', ['ng'])
  .run(runTranslate);

function runTranslate($translate) {

  'use strict';

  var key = $translate.storageKey(),
    storage = $translate.storage();

  var fallbackFromIncorrectStorageValue = function () {
    var preferred = $translate.preferredLanguage();
    if (angular.isString(preferred)) {
      $translate.use(preferred);
      // $translate.use() will also remember the language.
      // So, we don't need to call storage.put() here.
    } else {
      storage.put(key, $translate.use());
    }
  };

  fallbackFromIncorrectStorageValue.displayName = 'fallbackFromIncorrectStorageValue';

  if (storage) {
    if (!storage.get(key)) {
      fallbackFromIncorrectStorageValue();
    } else {
      $translate.use(storage.get(key))['catch'](fallbackFromIncorrectStorageValue);
    }
  } else if (angular.isString($translate.preferredLanguage())) {
    $translate.use($translate.preferredLanguage());
  }
}
runTranslate.$inject = ['$translate'];

runTranslate.displayName = 'runTranslate';

/**
 * @ngdoc object
 * @name pascalprecht.translate.$translateSanitizationProvider
 *
 * @description
 *
 * Configurations for $translateSanitization
 */
angular.module('pascalprecht.translate').provider('$translateSanitization', $translateSanitizationProvider);

function $translateSanitizationProvider () {

  'use strict';

  var $sanitize,
      currentStrategy = null, // TODO change to either 'sanitize', 'escape' or ['sanitize', 'escapeParameters'] in 3.0.
      hasConfiguredStrategy = false,
      hasShownNoStrategyConfiguredWarning = false,
      strategies;

  /**
   * Definition of a sanitization strategy function
   * @callback StrategyFunction
   * @param {string|object} value - value to be sanitized (either a string or an interpolated value map)
   * @param {string} mode - either 'text' for a string (translation) or 'params' for the interpolated params
   * @return {string|object}
   */

  /**
   * @ngdoc property
   * @name strategies
   * @propertyOf pascalprecht.translate.$translateSanitizationProvider
   *
   * @description
   * Following strategies are built-in:
   * <dl>
   *   <dt>sanitize</dt>
   *   <dd>Sanitizes HTML in the translation text using $sanitize</dd>
   *   <dt>escape</dt>
   *   <dd>Escapes HTML in the translation</dd>
   *   <dt>sanitizeParameters</dt>
   *   <dd>Sanitizes HTML in the values of the interpolation parameters using $sanitize</dd>
   *   <dt>escapeParameters</dt>
   *   <dd>Escapes HTML in the values of the interpolation parameters</dd>
   *   <dt>escaped</dt>
   *   <dd>Support legacy strategy name 'escaped' for backwards compatibility (will be removed in 3.0)</dd>
   * </dl>
   *
   */

  strategies = {
    sanitize: function (value, mode) {
      if (mode === 'text') {
        value = htmlSanitizeValue(value);
      }
      return value;
    },
    escape: function (value, mode) {
      if (mode === 'text') {
        value = htmlEscapeValue(value);
      }
      return value;
    },
    sanitizeParameters: function (value, mode) {
      if (mode === 'params') {
        value = mapInterpolationParameters(value, htmlSanitizeValue);
      }
      return value;
    },
    escapeParameters: function (value, mode) {
      if (mode === 'params') {
        value = mapInterpolationParameters(value, htmlEscapeValue);
      }
      return value;
    }
  };
  // Support legacy strategy name 'escaped' for backwards compatibility.
  // TODO should be removed in 3.0
  strategies.escaped = strategies.escapeParameters;

  /**
   * @ngdoc function
   * @name pascalprecht.translate.$translateSanitizationProvider#addStrategy
   * @methodOf pascalprecht.translate.$translateSanitizationProvider
   *
   * @description
   * Adds a sanitization strategy to the list of known strategies.
   *
   * @param {string} strategyName - unique key for a strategy
   * @param {StrategyFunction} strategyFunction - strategy function
   * @returns {object} this
   */
  this.addStrategy = function (strategyName, strategyFunction) {
    strategies[strategyName] = strategyFunction;
    return this;
  };

  /**
   * @ngdoc function
   * @name pascalprecht.translate.$translateSanitizationProvider#removeStrategy
   * @methodOf pascalprecht.translate.$translateSanitizationProvider
   *
   * @description
   * Removes a sanitization strategy from the list of known strategies.
   *
   * @param {string} strategyName - unique key for a strategy
   * @returns {object} this
   */
  this.removeStrategy = function (strategyName) {
    delete strategies[strategyName];
    return this;
  };

  /**
   * @ngdoc function
   * @name pascalprecht.translate.$translateSanitizationProvider#useStrategy
   * @methodOf pascalprecht.translate.$translateSanitizationProvider
   *
   * @description
   * Selects a sanitization strategy. When an array is provided the strategies will be executed in order.
   *
   * @param {string|StrategyFunction|array} strategy The sanitization strategy / strategies which should be used. Either a name of an existing strategy, a custom strategy function, or an array consisting of multiple names and / or custom functions.
   * @returns {object} this
   */
  this.useStrategy = function (strategy) {
    hasConfiguredStrategy = true;
    currentStrategy = strategy;
    return this;
  };

  /**
   * @ngdoc object
   * @name pascalprecht.translate.$translateSanitization
   * @requires $injector
   * @requires $log
   *
   * @description
   * Sanitizes interpolation parameters and translated texts.
   *
   */
  this.$get = ['$injector', '$log', function ($injector, $log) {

    var applyStrategies = function (value, mode, selectedStrategies) {
      angular.forEach(selectedStrategies, function (selectedStrategy) {
        if (angular.isFunction(selectedStrategy)) {
          value = selectedStrategy(value, mode);
        } else if (angular.isFunction(strategies[selectedStrategy])) {
          value = strategies[selectedStrategy](value, mode);
        } else {
          throw new Error('pascalprecht.translate.$translateSanitization: Unknown sanitization strategy: \'' + selectedStrategy + '\'');
        }
      });
      return value;
    };

    // TODO: should be removed in 3.0
    var showNoStrategyConfiguredWarning = function () {
      if (!hasConfiguredStrategy && !hasShownNoStrategyConfiguredWarning) {
        $log.warn('pascalprecht.translate.$translateSanitization: No sanitization strategy has been configured. This can have serious security implications. See http://angular-translate.github.io/docs/#/guide/19_security for details.');
        hasShownNoStrategyConfiguredWarning = true;
      }
    };

    if ($injector.has('$sanitize')) {
      $sanitize = $injector.get('$sanitize');
    }

    return {
      /**
       * @ngdoc function
       * @name pascalprecht.translate.$translateSanitization#useStrategy
       * @methodOf pascalprecht.translate.$translateSanitization
       *
       * @description
       * Selects a sanitization strategy. When an array is provided the strategies will be executed in order.
       *
       * @param {string|StrategyFunction|array} strategy The sanitization strategy / strategies which should be used. Either a name of an existing strategy, a custom strategy function, or an array consisting of multiple names and / or custom functions.
       */
      useStrategy: (function (self) {
        return function (strategy) {
          self.useStrategy(strategy);
        };
      })(this),

      /**
       * @ngdoc function
       * @name pascalprecht.translate.$translateSanitization#sanitize
       * @methodOf pascalprecht.translate.$translateSanitization
       *
       * @description
       * Sanitizes a value.
       *
       * @param {string|object} value The value which should be sanitized.
       * @param {string} mode The current sanitization mode, either 'params' or 'text'.
       * @param {string|StrategyFunction|array} [strategy] Optional custom strategy which should be used instead of the currently selected strategy.
       * @returns {string|object} sanitized value
       */
      sanitize: function (value, mode, strategy) {
        if (!currentStrategy) {
          showNoStrategyConfiguredWarning();
        }

        if (arguments.length < 3) {
          strategy = currentStrategy;
        }

        if (!strategy) {
          return value;
        }

        var selectedStrategies = angular.isArray(strategy) ? strategy : [strategy];
        return applyStrategies(value, mode, selectedStrategies);
      }
    };
  }];

  var htmlEscapeValue = function (value) {
    var element = angular.element('<div></div>');
    element.text(value); // not chainable, see #1044
    return element.html();
  };

  var htmlSanitizeValue = function (value) {
    if (!$sanitize) {
      throw new Error('pascalprecht.translate.$translateSanitization: Error cannot find $sanitize service. Either include the ngSanitize module (https://docs.angularjs.org/api/ngSanitize) or use a sanitization strategy which does not depend on $sanitize, such as \'escape\'.');
    }
    return $sanitize(value);
  };

  var mapInterpolationParameters = function (value, iteratee) {
    if (angular.isObject(value)) {
      var result = angular.isArray(value) ? [] : {};

      angular.forEach(value, function (propertyValue, propertyKey) {
        result[propertyKey] = mapInterpolationParameters(propertyValue, iteratee);
      });

      return result;
    } else if (angular.isNumber(value)) {
      return value;
    } else {
      return iteratee(value);
    }
  };
}

/**
 * @ngdoc object
 * @name pascalprecht.translate.$translateProvider
 * @description
 *
 * $translateProvider allows developers to register translation-tables, asynchronous loaders
 * and similar to configure translation behavior directly inside of a module.
 *
 */
angular.module('pascalprecht.translate')
.constant('pascalprechtTranslateOverrider', {})
.provider('$translate', $translate);

function $translate($STORAGE_KEY, $windowProvider, $translateSanitizationProvider, pascalprechtTranslateOverrider) {

  'use strict';

  var $translationTable = {},
      $preferredLanguage,
      $availableLanguageKeys = [],
      $languageKeyAliases,
      $fallbackLanguage,
      $fallbackWasString,
      $uses,
      $nextLang,
      $storageFactory,
      $storageKey = $STORAGE_KEY,
      $storagePrefix,
      $missingTranslationHandlerFactory,
      $interpolationFactory,
      $interpolatorFactories = [],
      $loaderFactory,
      $cloakClassName = 'translate-cloak',
      $loaderOptions,
      $notFoundIndicatorLeft,
      $notFoundIndicatorRight,
      $postCompilingEnabled = false,
      $forceAsyncReloadEnabled = false,
      NESTED_OBJECT_DELIMITER = '.',
      loaderCache,
      directivePriority = 0,
      statefulFilter = true,
      uniformLanguageTagResolver = 'default',
      languageTagResolver = {
        'default': function (tag) {
          return (tag || '').split('-').join('_');
        },
        java: function (tag) {
          var temp = (tag || '').split('-').join('_');
          var parts = temp.split('_');
          return parts.length > 1 ? (parts[0].toLowerCase() + '_' + parts[1].toUpperCase()) : temp;
        },
        bcp47: function (tag) {
          var temp = (tag || '').split('_').join('-');
          var parts = temp.split('-');
          return parts.length > 1 ? (parts[0].toLowerCase() + '-' + parts[1].toUpperCase()) : temp;
        }
      };

  var version = '2.7.2';

  // tries to determine the browsers language
  var getFirstBrowserLanguage = function () {

    // internal purpose only
    if (angular.isFunction(pascalprechtTranslateOverrider.getLocale)) {
      return pascalprechtTranslateOverrider.getLocale();
    }

    var nav = $windowProvider.$get().navigator,
        browserLanguagePropertyKeys = ['language', 'browserLanguage', 'systemLanguage', 'userLanguage'],
        i,
        language;

    // support for HTML 5.1 "navigator.languages"
    if (angular.isArray(nav.languages)) {
      for (i = 0; i < nav.languages.length; i++) {
        language = nav.languages[i];
        if (language && language.length) {
          return language;
        }
      }
    }

    // support for other well known properties in browsers
    for (i = 0; i < browserLanguagePropertyKeys.length; i++) {
      language = nav[browserLanguagePropertyKeys[i]];
      if (language && language.length) {
        return language;
      }
    }

    return null;
  };
  getFirstBrowserLanguage.displayName = 'angular-translate/service: getFirstBrowserLanguage';

  // tries to determine the browsers locale
  var getLocale = function () {
    var locale = getFirstBrowserLanguage() || '';
    if (languageTagResolver[uniformLanguageTagResolver]) {
      locale = languageTagResolver[uniformLanguageTagResolver](locale);
    }
    return locale;
  };
  getLocale.displayName = 'angular-translate/service: getLocale';

  /**
   * @name indexOf
   * @private
   *
   * @description
   * indexOf polyfill. Kinda sorta.
   *
   * @param {array} array Array to search in.
   * @param {string} searchElement Element to search for.
   *
   * @returns {int} Index of search element.
   */
  var indexOf = function(array, searchElement) {
    for (var i = 0, len = array.length; i < len; i++) {
      if (array[i] === searchElement) {
        return i;
      }
    }
    return -1;
  };

  /**
   * @name trim
   * @private
   *
   * @description
   * trim polyfill
   *
   * @returns {string} The string stripped of whitespace from both ends
   */
  var trim = function() {
    return this.toString().replace(/^\s+|\s+$/g, '');
  };

  var negotiateLocale = function (preferred) {

    var avail = [],
        locale = angular.lowercase(preferred),
        i = 0,
        n = $availableLanguageKeys.length;

    for (; i < n; i++) {
      avail.push(angular.lowercase($availableLanguageKeys[i]));
    }

    if (indexOf(avail, locale) > -1) {
      return preferred;
    }

    if ($languageKeyAliases) {
      var alias;
      for (var langKeyAlias in $languageKeyAliases) {
        var hasWildcardKey = false;
        var hasExactKey = Object.prototype.hasOwnProperty.call($languageKeyAliases, langKeyAlias) &&
          angular.lowercase(langKeyAlias) === angular.lowercase(preferred);

        if (langKeyAlias.slice(-1) === '*') {
          hasWildcardKey = langKeyAlias.slice(0, -1) === preferred.slice(0, langKeyAlias.length-1);
        }
        if (hasExactKey || hasWildcardKey) {
          alias = $languageKeyAliases[langKeyAlias];
          if (indexOf(avail, angular.lowercase(alias)) > -1) {
            return alias;
          }
        }
      }
    }

    if (preferred) {
      var parts = preferred.split('_');

      if (parts.length > 1 && indexOf(avail, angular.lowercase(parts[0])) > -1) {
        return parts[0];
      }
    }

    // If everything fails, just return the preferred, unchanged.
    return preferred;
  };

  /**
   * @ngdoc function
   * @name pascalprecht.translate.$translateProvider#translations
   * @methodOf pascalprecht.translate.$translateProvider
   *
   * @description
   * Registers a new translation table for specific language key.
   *
   * To register a translation table for specific language, pass a defined language
   * key as first parameter.
   *
   * <pre>
   *  // register translation table for language: 'de_DE'
   *  $translateProvider.translations('de_DE', {
   *    'GREETING': 'Hallo Welt!'
   *  });
   *
   *  // register another one
   *  $translateProvider.translations('en_US', {
   *    'GREETING': 'Hello world!'
   *  });
   * </pre>
   *
   * When registering multiple translation tables for for the same language key,
   * the actual translation table gets extended. This allows you to define module
   * specific translation which only get added, once a specific module is loaded in
   * your app.
   *
   * Invoking this method with no arguments returns the translation table which was
   * registered with no language key. Invoking it with a language key returns the
   * related translation table.
   *
   * @param {string} key A language key.
   * @param {object} translationTable A plain old JavaScript object that represents a translation table.
   *
   */
  var translations = function (langKey, translationTable) {

    if (!langKey && !translationTable) {
      return $translationTable;
    }

    if (langKey && !translationTable) {
      if (angular.isString(langKey)) {
        return $translationTable[langKey];
      }
    } else {
      if (!angular.isObject($translationTable[langKey])) {
        $translationTable[langKey] = {};
      }
      angular.extend($translationTable[langKey], flatObject(translationTable));
    }
    return this;
  };

  this.translations = translations;

  /**
   * @ngdoc function
   * @name pascalprecht.translate.$translateProvider#cloakClassName
   * @methodOf pascalprecht.translate.$translateProvider
   *
   * @description
   *
   * Let's you change the class name for `translate-cloak` directive.
   * Default class name is `translate-cloak`.
   *
   * @param {string} name translate-cloak class name
   */
  this.cloakClassName = function (name) {
    if (!name) {
      return $cloakClassName;
    }
    $cloakClassName = name;
    return this;
  };

  /**
   * @name flatObject
   * @private
   *
   * @description
   * Flats an object. This function is used to flatten given translation data with
   * namespaces, so they are later accessible via dot notation.
   */
  var flatObject = function (data, path, result, prevKey) {
    var key, keyWithPath, keyWithShortPath, val;

    if (!path) {
      path = [];
    }
    if (!result) {
      result = {};
    }
    for (key in data) {
      if (!Object.prototype.hasOwnProperty.call(data, key)) {
        continue;
      }
      val = data[key];
      if (angular.isObject(val)) {
        flatObject(val, path.concat(key), result, key);
      } else {
        keyWithPath = path.length ? ('' + path.join(NESTED_OBJECT_DELIMITER) + NESTED_OBJECT_DELIMITER + key) : key;
        if(path.length && key === prevKey){
          // Create shortcut path (foo.bar == foo.bar.bar)
          keyWithShortPath = '' + path.join(NESTED_OBJECT_DELIMITER);
          // Link it to original path
          result[keyWithShortPath] = '@:' + keyWithPath;
        }
        result[keyWithPath] = val;
      }
    }
    return result;
  };
  flatObject.displayName = 'flatObject';

  /**
   * @ngdoc function
   * @name pascalprecht.translate.$translateProvider#addInterpolation
   * @methodOf pascalprecht.translate.$translateProvider
   *
   * @description
   * Adds interpolation services to angular-translate, so it can manage them.
   *
   * @param {object} factory Interpolation service factory
   */
  this.addInterpolation = function (factory) {
    $interpolatorFactories.push(factory);
    return this;
  };

  /**
   * @ngdoc function
   * @name pascalprecht.translate.$translateProvider#useMessageFormatInterpolation
   * @methodOf pascalprecht.translate.$translateProvider
   *
   * @description
   * Tells angular-translate to use interpolation functionality of messageformat.js.
   * This is useful when having high level pluralization and gender selection.
   */
  this.useMessageFormatInterpolation = function () {
    return this.useInterpolation('$translateMessageFormatInterpolation');
  };

  /**
   * @ngdoc function
   * @name pascalprecht.translate.$translateProvider#useInterpolation
   * @methodOf pascalprecht.translate.$translateProvider
   *
   * @description
   * Tells angular-translate which interpolation style to use as default, application-wide.
   * Simply pass a factory/service name. The interpolation service has to implement
   * the correct interface.
   *
   * @param {string} factory Interpolation service name.
   */
  this.useInterpolation = function (factory) {
    $interpolationFactory = factory;
    return this;
  };

  /**
   * @ngdoc function
   * @name pascalprecht.translate.$translateProvider#useSanitizeStrategy
   * @methodOf pascalprecht.translate.$translateProvider
   *
   * @description
   * Simply sets a sanitation strategy type.
   *
   * @param {string} value Strategy type.
   */
  this.useSanitizeValueStrategy = function (value) {
    $translateSanitizationProvider.useStrategy(value);
    return this;
  };

 /**
   * @ngdoc function
   * @name pascalprecht.translate.$translateProvider#preferredLanguage
   * @methodOf pascalprecht.translate.$translateProvider
   *
   * @description
   * Tells the module which of the registered translation tables to use for translation
   * at initial startup by passing a language key. Similar to `$translateProvider#use`
   * only that it says which language to **prefer**.
   *
   * @param {string} langKey A language key.
   *
   */
  this.preferredLanguage = function(langKey) {
    setupPreferredLanguage(langKey);
    return this;

  };
  var setupPreferredLanguage = function (langKey) {
    if (langKey) {
      $preferredLanguage = langKey;
    }
    return $preferredLanguage;
  };
  /**
   * @ngdoc function
   * @name pascalprecht.translate.$translateProvider#translationNotFoundIndicator
   * @methodOf pascalprecht.translate.$translateProvider
   *
   * @description
   * Sets an indicator which is used when a translation isn't found. E.g. when
   * setting the indicator as 'X' and one tries to translate a translation id
   * called `NOT_FOUND`, this will result in `X NOT_FOUND X`.
   *
   * Internally this methods sets a left indicator and a right indicator using
   * `$translateProvider.translationNotFoundIndicatorLeft()` and
   * `$translateProvider.translationNotFoundIndicatorRight()`.
   *
   * **Note**: These methods automatically add a whitespace between the indicators
   * and the translation id.
   *
   * @param {string} indicator An indicator, could be any string.
   */
  this.translationNotFoundIndicator = function (indicator) {
    this.translationNotFoundIndicatorLeft(indicator);
    this.translationNotFoundIndicatorRight(indicator);
    return this;
  };

  /**
   * ngdoc function
   * @name pascalprecht.translate.$translateProvider#translationNotFoundIndicatorLeft
   * @methodOf pascalprecht.translate.$translateProvider
   *
   * @description
   * Sets an indicator which is used when a translation isn't found left to the
   * translation id.
   *
   * @param {string} indicator An indicator.
   */
  this.translationNotFoundIndicatorLeft = function (indicator) {
    if (!indicator) {
      return $notFoundIndicatorLeft;
    }
    $notFoundIndicatorLeft = indicator;
    return this;
  };

  /**
   * ngdoc function
   * @name pascalprecht.translate.$translateProvider#translationNotFoundIndicatorLeft
   * @methodOf pascalprecht.translate.$translateProvider
   *
   * @description
   * Sets an indicator which is used when a translation isn't found right to the
   * translation id.
   *
   * @param {string} indicator An indicator.
   */
  this.translationNotFoundIndicatorRight = function (indicator) {
    if (!indicator) {
      return $notFoundIndicatorRight;
    }
    $notFoundIndicatorRight = indicator;
    return this;
  };

  /**
   * @ngdoc function
   * @name pascalprecht.translate.$translateProvider#fallbackLanguage
   * @methodOf pascalprecht.translate.$translateProvider
   *
   * @description
   * Tells the module which of the registered translation tables to use when missing translations
   * at initial startup by passing a language key. Similar to `$translateProvider#use`
   * only that it says which language to **fallback**.
   *
   * @param {string||array} langKey A language key.
   *
   */
  this.fallbackLanguage = function (langKey) {
    fallbackStack(langKey);
    return this;
  };

  var fallbackStack = function (langKey) {
    if (langKey) {
      if (angular.isString(langKey)) {
        $fallbackWasString = true;
        $fallbackLanguage = [ langKey ];
      } else if (angular.isArray(langKey)) {
        $fallbackWasString = false;
        $fallbackLanguage = langKey;
      }
      if (angular.isString($preferredLanguage)  && indexOf($fallbackLanguage, $preferredLanguage) < 0) {
        $fallbackLanguage.push($preferredLanguage);
      }

      return this;
    } else {
      if ($fallbackWasString) {
        return $fallbackLanguage[0];
      } else {
        return $fallbackLanguage;
      }
    }
  };

  /**
   * @ngdoc function
   * @name pascalprecht.translate.$translateProvider#use
   * @methodOf pascalprecht.translate.$translateProvider
   *
   * @description
   * Set which translation table to use for translation by given language key. When
   * trying to 'use' a language which isn't provided, it'll throw an error.
   *
   * You actually don't have to use this method since `$translateProvider#preferredLanguage`
   * does the job too.
   *
   * @param {string} langKey A language key.
   */
  this.use = function (langKey) {
    if (langKey) {
      if (!$translationTable[langKey] && (!$loaderFactory)) {
        // only throw an error, when not loading translation data asynchronously
        throw new Error('$translateProvider couldn\'t find translationTable for langKey: \'' + langKey + '\'');
      }
      $uses = langKey;
      return this;
    }
    return $uses;
  };

 /**
   * @ngdoc function
   * @name pascalprecht.translate.$translateProvider#storageKey
   * @methodOf pascalprecht.translate.$translateProvider
   *
   * @description
   * Tells the module which key must represent the choosed language by a user in the storage.
   *
   * @param {string} key A key for the storage.
   */
  var storageKey = function(key) {
    if (!key) {
      if ($storagePrefix) {
        return $storagePrefix + $storageKey;
      }
      return $storageKey;
    }
    $storageKey = key;
    return this;
  };

  this.storageKey = storageKey;

  /**
   * @ngdoc function
   * @name pascalprecht.translate.$translateProvider#useUrlLoader
   * @methodOf pascalprecht.translate.$translateProvider
   *
   * @description
   * Tells angular-translate to use `$translateUrlLoader` extension service as loader.
   *
   * @param {string} url Url
   * @param {Object=} options Optional configuration object
   */
  this.useUrlLoader = function (url, options) {
    return this.useLoader('$translateUrlLoader', angular.extend({ url: url }, options));
  };

  /**
   * @ngdoc function
   * @name pascalprecht.translate.$translateProvider#useStaticFilesLoader
   * @methodOf pascalprecht.translate.$translateProvider
   *
   * @description
   * Tells angular-translate to use `$translateStaticFilesLoader` extension service as loader.
   *
   * @param {Object=} options Optional configuration object
   */
  this.useStaticFilesLoader = function (options) {
    return this.useLoader('$translateStaticFilesLoader', options);
  };

  /**
   * @ngdoc function
   * @name pascalprecht.translate.$translateProvider#useLoader
   * @methodOf pascalprecht.translate.$translateProvider
   *
   * @description
   * Tells angular-translate to use any other service as loader.
   *
   * @param {string} loaderFactory Factory name to use
   * @param {Object=} options Optional configuration object
   */
  this.useLoader = function (loaderFactory, options) {
    $loaderFactory = loaderFactory;
    $loaderOptions = options || {};
    return this;
  };

  /**
   * @ngdoc function
   * @name pascalprecht.translate.$translateProvider#useLocalStorage
   * @methodOf pascalprecht.translate.$translateProvider
   *
   * @description
   * Tells angular-translate to use `$translateLocalStorage` service as storage layer.
   *
   */
  this.useLocalStorage = function () {
    return this.useStorage('$translateLocalStorage');
  };

  /**
   * @ngdoc function
   * @name pascalprecht.translate.$translateProvider#useCookieStorage
   * @methodOf pascalprecht.translate.$translateProvider
   *
   * @description
   * Tells angular-translate to use `$translateCookieStorage` service as storage layer.
   */
  this.useCookieStorage = function () {
    return this.useStorage('$translateCookieStorage');
  };

  /**
   * @ngdoc function
   * @name pascalprecht.translate.$translateProvider#useStorage
   * @methodOf pascalprecht.translate.$translateProvider
   *
   * @description
   * Tells angular-translate to use custom service as storage layer.
   */
  this.useStorage = function (storageFactory) {
    $storageFactory = storageFactory;
    return this;
  };

  /**
   * @ngdoc function
   * @name pascalprecht.translate.$translateProvider#storagePrefix
   * @methodOf pascalprecht.translate.$translateProvider
   *
   * @description
   * Sets prefix for storage key.
   *
   * @param {string} prefix Storage key prefix
   */
  this.storagePrefix = function (prefix) {
    if (!prefix) {
      return prefix;
    }
    $storagePrefix = prefix;
    return this;
  };

  /**
   * @ngdoc function
   * @name pascalprecht.translate.$translateProvider#useMissingTranslationHandlerLog
   * @methodOf pascalprecht.translate.$translateProvider
   *
   * @description
   * Tells angular-translate to use built-in log handler when trying to translate
   * a translation Id which doesn't exist.
   *
   * This is actually a shortcut method for `useMissingTranslationHandler()`.
   *
   */
  this.useMissingTranslationHandlerLog = function () {
    return this.useMissingTranslationHandler('$translateMissingTranslationHandlerLog');
  };

  /**
   * @ngdoc function
   * @name pascalprecht.translate.$translateProvider#useMissingTranslationHandler
   * @methodOf pascalprecht.translate.$translateProvider
   *
   * @description
   * Expects a factory name which later gets instantiated with `$injector`.
   * This method can be used to tell angular-translate to use a custom
   * missingTranslationHandler. Just build a factory which returns a function
   * and expects a translation id as argument.
   *
   * Example:
   * <pre>
   *  app.config(function ($translateProvider) {
   *    $translateProvider.useMissingTranslationHandler('customHandler');
   *  });
   *
   *  app.factory('customHandler', function (dep1, dep2) {
   *    return function (translationId) {
   *      // something with translationId and dep1 and dep2
   *    };
   *  });
   * </pre>
   *
   * @param {string} factory Factory name
   */
  this.useMissingTranslationHandler = function (factory) {
    $missingTranslationHandlerFactory = factory;
    return this;
  };

  /**
   * @ngdoc function
   * @name pascalprecht.translate.$translateProvider#usePostCompiling
   * @methodOf pascalprecht.translate.$translateProvider
   *
   * @description
   * If post compiling is enabled, all translated values will be processed
   * again with AngularJS' $compile.
   *
   * Example:
   * <pre>
   *  app.config(function ($translateProvider) {
   *    $translateProvider.usePostCompiling(true);
   *  });
   * </pre>
   *
   * @param {string} factory Factory name
   */
  this.usePostCompiling = function (value) {
    $postCompilingEnabled = !(!value);
    return this;
  };

  /**
   * @ngdoc function
   * @name pascalprecht.translate.$translateProvider#forceAsyncReload
   * @methodOf pascalprecht.translate.$translateProvider
   *
   * @description
   * If force async reload is enabled, async loader will always be called
   * even if $translationTable already contains the language key, adding
   * possible new entries to the $translationTable.
   *
   * Example:
   * <pre>
   *  app.config(function ($translateProvider) {
   *    $translateProvider.forceAsyncReload(true);
   *  });
   * </pre>
   *
   * @param {boolean} value - valid values are true or false
   */
  this.forceAsyncReload = function (value) {
    $forceAsyncReloadEnabled = !(!value);
    return this;
  };

  /**
   * @ngdoc function
   * @name pascalprecht.translate.$translateProvider#uniformLanguageTag
   * @methodOf pascalprecht.translate.$translateProvider
   *
   * @description
   * Tells angular-translate which language tag should be used as a result when determining
   * the current browser language.
   *
   * This setting must be set before invoking {@link pascalprecht.translate.$translateProvider#methods_determinePreferredLanguage determinePreferredLanguage()}.
   *
   * <pre>
   * $translateProvider
   *   .uniformLanguageTag('bcp47')
   *   .determinePreferredLanguage()
   * </pre>
   *
   * The resolver currently supports:
   * * default
   *     (traditionally: hyphens will be converted into underscores, i.e. en-US => en_US)
   *     en-US => en_US
   *     en_US => en_US
   *     en-us => en_us
   * * java
   *     like default, but the second part will be always in uppercase
   *     en-US => en_US
   *     en_US => en_US
   *     en-us => en_US
   * * BCP 47 (RFC 4646 & 4647)
   *     en-US => en-US
   *     en_US => en-US
   *     en-us => en-US
   *
   * See also:
   * * http://en.wikipedia.org/wiki/IETF_language_tag
   * * http://www.w3.org/International/core/langtags/
   * * http://tools.ietf.org/html/bcp47
   *
   * @param {string|object} options - options (or standard)
   * @param {string} options.standard - valid values are 'default', 'bcp47', 'java'
   */
  this.uniformLanguageTag = function (options) {

    if (!options) {
      options = {};
    } else if (angular.isString(options)) {
      options = {
        standard: options
      };
    }

    uniformLanguageTagResolver = options.standard;

    return this;
  };

  /**
   * @ngdoc function
   * @name pascalprecht.translate.$translateProvider#determinePreferredLanguage
   * @methodOf pascalprecht.translate.$translateProvider
   *
   * @description
   * Tells angular-translate to try to determine on its own which language key
   * to set as preferred language. When `fn` is given, angular-translate uses it
   * to determine a language key, otherwise it uses the built-in `getLocale()`
   * method.
   *
   * The `getLocale()` returns a language key in the format `[lang]_[country]` or
   * `[lang]` depending on what the browser provides.
   *
   * Use this method at your own risk, since not all browsers return a valid
   * locale (see {@link pascalprecht.translate.$translateProvider#methods_uniformLanguageTag uniformLanguageTag()}).
   *
   * @param {Function=} fn Function to determine a browser's locale
   */
  this.determinePreferredLanguage = function (fn) {

    var locale = (fn && angular.isFunction(fn)) ? fn() : getLocale();

    if (!$availableLanguageKeys.length) {
      $preferredLanguage = locale;
    } else {
      $preferredLanguage = negotiateLocale(locale);
    }

    return this;
  };

  /**
   * @ngdoc function
   * @name pascalprecht.translate.$translateProvider#registerAvailableLanguageKeys
   * @methodOf pascalprecht.translate.$translateProvider
   *
   * @description
   * Registers a set of language keys the app will work with. Use this method in
   * combination with
   * {@link pascalprecht.translate.$translateProvider#determinePreferredLanguage determinePreferredLanguage}.
   * When available languages keys are registered, angular-translate
   * tries to find the best fitting language key depending on the browsers locale,
   * considering your language key convention.
   *
   * @param {object} languageKeys Array of language keys the your app will use
   * @param {object=} aliases Alias map.
   */
  this.registerAvailableLanguageKeys = function (languageKeys, aliases) {
    if (languageKeys) {
      $availableLanguageKeys = languageKeys;
      if (aliases) {
        $languageKeyAliases = aliases;
      }
      return this;
    }
    return $availableLanguageKeys;
  };

  /**
   * @ngdoc function
   * @name pascalprecht.translate.$translateProvider#useLoaderCache
   * @methodOf pascalprecht.translate.$translateProvider
   *
   * @description
   * Registers a cache for internal $http based loaders.
   * {@link pascalprecht.translate.$translateProvider#determinePreferredLanguage determinePreferredLanguage}.
   * When false the cache will be disabled (default). When true or undefined
   * the cache will be a default (see $cacheFactory). When an object it will
   * be treat as a cache object itself: the usage is $http({cache: cache})
   *
   * @param {object} cache boolean, string or cache-object
   */
  this.useLoaderCache = function (cache) {
    if (cache === false) {
      // disable cache
      loaderCache = undefined;
    } else if (cache === true) {
      // enable cache using AJS defaults
      loaderCache = true;
    } else if (typeof(cache) === 'undefined') {
      // enable cache using default
      loaderCache = '$translationCache';
    } else if (cache) {
      // enable cache using given one (see $cacheFactory)
      loaderCache = cache;
    }
    return this;
  };

  /**
   * @ngdoc function
   * @name pascalprecht.translate.$translateProvider#directivePriority
   * @methodOf pascalprecht.translate.$translateProvider
   *
   * @description
   * Sets the default priority of the translate directive. The standard value is `0`.
   * Calling this function without an argument will return the current value.
   *
   * @param {number} priority for the translate-directive
   */
  this.directivePriority = function (priority) {
    if (priority === undefined) {
      // getter
      return directivePriority;
    } else {
      // setter with chaining
      directivePriority = priority;
      return this;
    }
  };

  /**
   * @ngdoc function
   * @name pascalprecht.translate.$translateProvider#statefulFilter
   * @methodOf pascalprecht.translate.$translateProvider
   *
   * @description
   * Since AngularJS 1.3, filters which are not stateless (depending at the scope)
   * have to explicit define this behavior.
   * Sets whether the translate filter should be stateful or stateless. The standard value is `true`
   * meaning being stateful.
   * Calling this function without an argument will return the current value.
   *
   * @param {boolean} state - defines the state of the filter
   */
  this.statefulFilter = function (state) {
    if (state === undefined) {
      // getter
      return statefulFilter;
    } else {
      // setter with chaining
      statefulFilter = state;
      return this;
    }
  };

  /**
   * @ngdoc object
   * @name pascalprecht.translate.$translate
   * @requires $interpolate
   * @requires $log
   * @requires $rootScope
   * @requires $q
   *
   * @description
   * The `$translate` service is the actual core of angular-translate. It expects a translation id
   * and optional interpolate parameters to translate contents.
   *
   * <pre>
   *  $translate('HEADLINE_TEXT').then(function (translation) {
   *    $scope.translatedText = translation;
   *  });
   * </pre>
   *
   * @param {string|array} translationId A token which represents a translation id
   *                                     This can be optionally an array of translation ids which
   *                                     results that the function returns an object where each key
   *                                     is the translation id and the value the translation.
   * @param {object=} interpolateParams An object hash for dynamic values
   * @param {string} interpolationId The id of the interpolation to use
   * @returns {object} promise
   */
  this.$get = [
    '$log',
    '$injector',
    '$rootScope',
    '$q',
    function ($log, $injector, $rootScope, $q) {

      var Storage,
          defaultInterpolator = $injector.get($interpolationFactory || '$translateDefaultInterpolation'),
          pendingLoader = false,
          interpolatorHashMap = {},
          langPromises = {},
          fallbackIndex,
          startFallbackIteration;

      var $translate = function (translationId, interpolateParams, interpolationId, defaultTranslationText) {

        // Duck detection: If the first argument is an array, a bunch of translations was requested.
        // The result is an object.
        if (angular.isArray(translationId)) {
          // Inspired by Q.allSettled by Kris Kowal
          // https://github.com/kriskowal/q/blob/b0fa72980717dc202ffc3cbf03b936e10ebbb9d7/q.js#L1553-1563
          // This transforms all promises regardless resolved or rejected
          var translateAll = function (translationIds) {
            var results = {}; // storing the actual results
            var promises = []; // promises to wait for
            // Wraps the promise a) being always resolved and b) storing the link id->value
            var translate = function (translationId) {
              var deferred = $q.defer();
              var regardless = function (value) {
                results[translationId] = value;
                deferred.resolve([translationId, value]);
              };
              // we don't care whether the promise was resolved or rejected; just store the values
              $translate(translationId, interpolateParams, interpolationId, defaultTranslationText).then(regardless, regardless);
              return deferred.promise;
            };
            for (var i = 0, c = translationIds.length; i < c; i++) {
              promises.push(translate(translationIds[i]));
            }
            // wait for all (including storing to results)
            return $q.all(promises).then(function () {
              // return the results
              return results;
            });
          };
          return translateAll(translationId);
        }

        var deferred = $q.defer();

        // trim off any whitespace
        if (translationId) {
          translationId = trim.apply(translationId);
        }

        var promiseToWaitFor = (function () {
          var promise = $preferredLanguage ?
            langPromises[$preferredLanguage] :
            langPromises[$uses];

          fallbackIndex = 0;

          if ($storageFactory && !promise) {
            // looks like there's no pending promise for $preferredLanguage or
            // $uses. Maybe there's one pending for a language that comes from
            // storage.
            var langKey = Storage.get($storageKey);
            promise = langPromises[langKey];

            if ($fallbackLanguage && $fallbackLanguage.length) {
                var index = indexOf($fallbackLanguage, langKey);
                // maybe the language from storage is also defined as fallback language
                // we increase the fallback language index to not search in that language
                // as fallback, since it's probably the first used language
                // in that case the index starts after the first element
                fallbackIndex = (index === 0) ? 1 : 0;

                // but we can make sure to ALWAYS fallback to preferred language at least
                if (indexOf($fallbackLanguage, $preferredLanguage) < 0) {
                  $fallbackLanguage.push($preferredLanguage);
                }
            }
          }
          return promise;
        }());

        if (!promiseToWaitFor) {
          // no promise to wait for? okay. Then there's no loader registered
          // nor is a one pending for language that comes from storage.
          // We can just translate.
          determineTranslation(translationId, interpolateParams, interpolationId, defaultTranslationText).then(deferred.resolve, deferred.reject);
        } else {
          var promiseResolved = function () {
            determineTranslation(translationId, interpolateParams, interpolationId, defaultTranslationText).then(deferred.resolve, deferred.reject);
          };
          promiseResolved.displayName = 'promiseResolved';

          promiseToWaitFor['finally'](promiseResolved, deferred.reject);
        }
        return deferred.promise;
      };

      /**
       * @name applyNotFoundIndicators
       * @private
       *
       * @description
       * Applies not fount indicators to given translation id, if needed.
       * This function gets only executed, if a translation id doesn't exist,
       * which is why a translation id is expected as argument.
       *
       * @param {string} translationId Translation id.
       * @returns {string} Same as given translation id but applied with not found
       * indicators.
       */
      var applyNotFoundIndicators = function (translationId) {
        // applying notFoundIndicators
        if ($notFoundIndicatorLeft) {
          translationId = [$notFoundIndicatorLeft, translationId].join(' ');
        }
        if ($notFoundIndicatorRight) {
          translationId = [translationId, $notFoundIndicatorRight].join(' ');
        }
        return translationId;
      };

      /**
       * @name useLanguage
       * @private
       *
       * @description
       * Makes actual use of a language by setting a given language key as used
       * language and informs registered interpolators to also use the given
       * key as locale.
       *
       * @param {key} Locale key.
       */
      var useLanguage = function (key) {
        $uses = key;
        $rootScope.$emit('$translateChangeSuccess', {language: key});

        if ($storageFactory) {
          Storage.put($translate.storageKey(), $uses);
        }
        // inform default interpolator
        defaultInterpolator.setLocale($uses);

        var eachInterpolator = function (interpolator, id) {
          interpolatorHashMap[id].setLocale($uses);
        };
        eachInterpolator.displayName = 'eachInterpolatorLocaleSetter';

        // inform all others too!
        angular.forEach(interpolatorHashMap, eachInterpolator);
        $rootScope.$emit('$translateChangeEnd', {language: key});
      };

      /**
       * @name loadAsync
       * @private
       *
       * @description
       * Kicks of registered async loader using `$injector` and applies existing
       * loader options. When resolved, it updates translation tables accordingly
       * or rejects with given language key.
       *
       * @param {string} key Language key.
       * @return {Promise} A promise.
       */
      var loadAsync = function (key) {
        if (!key) {
          throw 'No language key specified for loading.';
        }

        var deferred = $q.defer();

        $rootScope.$emit('$translateLoadingStart', {language: key});
        pendingLoader = true;

        var cache = loaderCache;
        if (typeof(cache) === 'string') {
          // getting on-demand instance of loader
          cache = $injector.get(cache);
        }

        var loaderOptions = angular.extend({}, $loaderOptions, {
          key: key,
          $http: angular.extend({}, {
            cache: cache
          }, $loaderOptions.$http)
        });

        var onLoaderSuccess = function (data) {
          var translationTable = {};
          $rootScope.$emit('$translateLoadingSuccess', {language: key});

          if (angular.isArray(data)) {
            angular.forEach(data, function (table) {
              angular.extend(translationTable, flatObject(table));
            });
          } else {
            angular.extend(translationTable, flatObject(data));
          }
          pendingLoader = false;
          deferred.resolve({
            key: key,
            table: translationTable
          });
          $rootScope.$emit('$translateLoadingEnd', {language: key});
        };
        onLoaderSuccess.displayName = 'onLoaderSuccess';

        var onLoaderError = function (key) {
          $rootScope.$emit('$translateLoadingError', {language: key});
          deferred.reject(key);
          $rootScope.$emit('$translateLoadingEnd', {language: key});
        };
        onLoaderError.displayName = 'onLoaderError';

        $injector.get($loaderFactory)(loaderOptions)
          .then(onLoaderSuccess, onLoaderError);

        return deferred.promise;
      };

      if ($storageFactory) {
        Storage = $injector.get($storageFactory);

        if (!Storage.get || !Storage.put) {
          throw new Error('Couldn\'t use storage \'' + $storageFactory + '\', missing get() or put() method!');
        }
      }

      // if we have additional interpolations that were added via
      // $translateProvider.addInterpolation(), we have to map'em
      if ($interpolatorFactories.length) {
        var eachInterpolationFactory = function (interpolatorFactory) {
          var interpolator = $injector.get(interpolatorFactory);
          // setting initial locale for each interpolation service
          interpolator.setLocale($preferredLanguage || $uses);
          // make'em recognizable through id
          interpolatorHashMap[interpolator.getInterpolationIdentifier()] = interpolator;
        };
        eachInterpolationFactory.displayName = 'interpolationFactoryAdder';

        angular.forEach($interpolatorFactories, eachInterpolationFactory);
      }

      /**
       * @name getTranslationTable
       * @private
       *
       * @description
       * Returns a promise that resolves to the translation table
       * or is rejected if an error occurred.
       *
       * @param langKey
       * @returns {Q.promise}
       */
      var getTranslationTable = function (langKey) {
        var deferred = $q.defer();
        if (Object.prototype.hasOwnProperty.call($translationTable, langKey)) {
          deferred.resolve($translationTable[langKey]);
        } else if (langPromises[langKey]) {
          var onResolve = function (data) {
            translations(data.key, data.table);
            deferred.resolve(data.table);
          };
          onResolve.displayName = 'translationTableResolver';
          langPromises[langKey].then(onResolve, deferred.reject);
        } else {
          deferred.reject();
        }
        return deferred.promise;
      };

      /**
       * @name getFallbackTranslation
       * @private
       *
       * @description
       * Returns a promise that will resolve to the translation
       * or be rejected if no translation was found for the language.
       * This function is currently only used for fallback language translation.
       *
       * @param langKey The language to translate to.
       * @param translationId
       * @param interpolateParams
       * @param Interpolator
       * @returns {Q.promise}
       */
      var getFallbackTranslation = function (langKey, translationId, interpolateParams, Interpolator) {
        var deferred = $q.defer();

        var onResolve = function (translationTable) {
          if (Object.prototype.hasOwnProperty.call(translationTable, translationId)) {
            Interpolator.setLocale(langKey);
            var translation = translationTable[translationId];
            if (translation.substr(0, 2) === '@:') {
              getFallbackTranslation(langKey, translation.substr(2), interpolateParams, Interpolator)
                .then(deferred.resolve, deferred.reject);
            } else {
              deferred.resolve(Interpolator.interpolate(translationTable[translationId], interpolateParams));
            }
            Interpolator.setLocale($uses);
          } else {
            deferred.reject();
          }
        };
        onResolve.displayName = 'fallbackTranslationResolver';

        getTranslationTable(langKey).then(onResolve, deferred.reject);

        return deferred.promise;
      };

      /**
       * @name getFallbackTranslationInstant
       * @private
       *
       * @description
       * Returns a translation
       * This function is currently only used for fallback language translation.
       *
       * @param langKey The language to translate to.
       * @param translationId
       * @param interpolateParams
       * @param Interpolator
       * @returns {string} translation
       */
      var getFallbackTranslationInstant = function (langKey, translationId, interpolateParams, Interpolator) {
        var result, translationTable = $translationTable[langKey];

        if (translationTable && Object.prototype.hasOwnProperty.call(translationTable, translationId)) {
          Interpolator.setLocale(langKey);
          result = Interpolator.interpolate(translationTable[translationId], interpolateParams);
          if (result.substr(0, 2) === '@:') {
            return getFallbackTranslationInstant(langKey, result.substr(2), interpolateParams, Interpolator);
          }
          Interpolator.setLocale($uses);
        }

        return result;
      };


      /**
       * @name translateByHandler
       * @private
       *
       * Translate by missing translation handler.
       *
       * @param translationId
       * @returns translation created by $missingTranslationHandler or translationId is $missingTranslationHandler is
       * absent
       */
      var translateByHandler = function (translationId, interpolateParams) {
        // If we have a handler factory - we might also call it here to determine if it provides
        // a default text for a translationid that can't be found anywhere in our tables
        if ($missingTranslationHandlerFactory) {
          var resultString = $injector.get($missingTranslationHandlerFactory)(translationId, $uses, interpolateParams);
          if (resultString !== undefined) {
            return resultString;
          } else {
            return translationId;
          }
        } else {
          return translationId;
        }
      };

      /**
       * @name resolveForFallbackLanguage
       * @private
       *
       * Recursive helper function for fallbackTranslation that will sequentially look
       * for a translation in the fallbackLanguages starting with fallbackLanguageIndex.
       *
       * @param fallbackLanguageIndex
       * @param translationId
       * @param interpolateParams
       * @param Interpolator
       * @returns {Q.promise} Promise that will resolve to the translation.
       */
      var resolveForFallbackLanguage = function (fallbackLanguageIndex, translationId, interpolateParams, Interpolator, defaultTranslationText) {
        var deferred = $q.defer();

        if (fallbackLanguageIndex < $fallbackLanguage.length) {
          var langKey = $fallbackLanguage[fallbackLanguageIndex];
          getFallbackTranslation(langKey, translationId, interpolateParams, Interpolator).then(
            deferred.resolve,
            function () {
              // Look in the next fallback language for a translation.
              // It delays the resolving by passing another promise to resolve.
              resolveForFallbackLanguage(fallbackLanguageIndex + 1, translationId, interpolateParams, Interpolator, defaultTranslationText).then(deferred.resolve);
            }
          );
        } else {
          // No translation found in any fallback language
          // if a default translation text is set in the directive, then return this as a result
          if (defaultTranslationText) {
            deferred.resolve(defaultTranslationText);
          } else {
            // if no default translation is set and an error handler is defined, send it to the handler
            // and then return the result
            deferred.resolve(translateByHandler(translationId, interpolateParams));
          }
        }
        return deferred.promise;
      };

      /**
       * @name resolveForFallbackLanguageInstant
       * @private
       *
       * Recursive helper function for fallbackTranslation that will sequentially look
       * for a translation in the fallbackLanguages starting with fallbackLanguageIndex.
       *
       * @param fallbackLanguageIndex
       * @param translationId
       * @param interpolateParams
       * @param Interpolator
       * @returns {string} translation
       */
      var resolveForFallbackLanguageInstant = function (fallbackLanguageIndex, translationId, interpolateParams, Interpolator) {
        var result;

        if (fallbackLanguageIndex < $fallbackLanguage.length) {
          var langKey = $fallbackLanguage[fallbackLanguageIndex];
          result = getFallbackTranslationInstant(langKey, translationId, interpolateParams, Interpolator);
          if (!result) {
            result = resolveForFallbackLanguageInstant(fallbackLanguageIndex + 1, translationId, interpolateParams, Interpolator);
          }
        }
        return result;
      };

      /**
       * Translates with the usage of the fallback languages.
       *
       * @param translationId
       * @param interpolateParams
       * @param Interpolator
       * @returns {Q.promise} Promise, that resolves to the translation.
       */
      var fallbackTranslation = function (translationId, interpolateParams, Interpolator, defaultTranslationText) {
        // Start with the fallbackLanguage with index 0
        return resolveForFallbackLanguage((startFallbackIteration>0 ? startFallbackIteration : fallbackIndex), translationId, interpolateParams, Interpolator, defaultTranslationText);
      };

      /**
       * Translates with the usage of the fallback languages.
       *
       * @param translationId
       * @param interpolateParams
       * @param Interpolator
       * @returns {String} translation
       */
      var fallbackTranslationInstant = function (translationId, interpolateParams, Interpolator) {
        // Start with the fallbackLanguage with index 0
        return resolveForFallbackLanguageInstant((startFallbackIteration>0 ? startFallbackIteration : fallbackIndex), translationId, interpolateParams, Interpolator);
      };

      var determineTranslation = function (translationId, interpolateParams, interpolationId, defaultTranslationText) {

        var deferred = $q.defer();

        var table = $uses ? $translationTable[$uses] : $translationTable,
            Interpolator = (interpolationId) ? interpolatorHashMap[interpolationId] : defaultInterpolator;

        // if the translation id exists, we can just interpolate it
        if (table && Object.prototype.hasOwnProperty.call(table, translationId)) {
          var translation = table[translationId];

          // If using link, rerun $translate with linked translationId and return it
          if (translation.substr(0, 2) === '@:') {

            $translate(translation.substr(2), interpolateParams, interpolationId, defaultTranslationText)
              .then(deferred.resolve, deferred.reject);
          } else {
            deferred.resolve(Interpolator.interpolate(translation, interpolateParams));
          }
        } else {
          var missingTranslationHandlerTranslation;
          // for logging purposes only (as in $translateMissingTranslationHandlerLog), value is not returned to promise
          if ($missingTranslationHandlerFactory && !pendingLoader) {
            missingTranslationHandlerTranslation = translateByHandler(translationId, interpolateParams);
          }

          // since we couldn't translate the inital requested translation id,
          // we try it now with one or more fallback languages, if fallback language(s) is
          // configured.
          if ($uses && $fallbackLanguage && $fallbackLanguage.length) {
            fallbackTranslation(translationId, interpolateParams, Interpolator, defaultTranslationText)
                .then(function (translation) {
                  deferred.resolve(translation);
                }, function (_translationId) {
                  deferred.reject(applyNotFoundIndicators(_translationId));
                });
          } else if ($missingTranslationHandlerFactory && !pendingLoader && missingTranslationHandlerTranslation) {
            // looks like the requested translation id doesn't exists.
            // Now, if there is a registered handler for missing translations and no
            // asyncLoader is pending, we execute the handler
            if (defaultTranslationText) {
              deferred.resolve(defaultTranslationText);
              } else {
                deferred.resolve(missingTranslationHandlerTranslation);
              }
          } else {
            if (defaultTranslationText) {
              deferred.resolve(defaultTranslationText);
            } else {
              deferred.reject(applyNotFoundIndicators(translationId));
            }
          }
        }
        return deferred.promise;
      };

      var determineTranslationInstant = function (translationId, interpolateParams, interpolationId) {

        var result, table = $uses ? $translationTable[$uses] : $translationTable,
            Interpolator = defaultInterpolator;

        // if the interpolation id exists use custom interpolator
        if (interpolatorHashMap && Object.prototype.hasOwnProperty.call(interpolatorHashMap, interpolationId)) {
          Interpolator = interpolatorHashMap[interpolationId];
        }

        // if the translation id exists, we can just interpolate it
        if (table && Object.prototype.hasOwnProperty.call(table, translationId)) {
          var translation = table[translationId];

          // If using link, rerun $translate with linked translationId and return it
          if (translation.substr(0, 2) === '@:') {
            result = determineTranslationInstant(translation.substr(2), interpolateParams, interpolationId);
          } else {
            result = Interpolator.interpolate(translation, interpolateParams);
          }
        } else {
          var missingTranslationHandlerTranslation;
          // for logging purposes only (as in $translateMissingTranslationHandlerLog), value is not returned to promise
          if ($missingTranslationHandlerFactory && !pendingLoader) {
            missingTranslationHandlerTranslation = translateByHandler(translationId, interpolateParams);
          }

          // since we couldn't translate the inital requested translation id,
          // we try it now with one or more fallback languages, if fallback language(s) is
          // configured.
          if ($uses && $fallbackLanguage && $fallbackLanguage.length) {
            fallbackIndex = 0;
            result = fallbackTranslationInstant(translationId, interpolateParams, Interpolator);
          } else if ($missingTranslationHandlerFactory && !pendingLoader && missingTranslationHandlerTranslation) {
            // looks like the requested translation id doesn't exists.
            // Now, if there is a registered handler for missing translations and no
            // asyncLoader is pending, we execute the handler
            result = missingTranslationHandlerTranslation;
          } else {
            result = applyNotFoundIndicators(translationId);
          }
        }

        return result;
      };

      var clearNextLangAndPromise = function(key) {
        if ($nextLang === key) {
          $nextLang = undefined;
        }
        langPromises[key] = undefined;
      };

      /**
       * @ngdoc function
       * @name pascalprecht.translate.$translate#preferredLanguage
       * @methodOf pascalprecht.translate.$translate
       *
       * @description
       * Returns the language key for the preferred language.
       *
       * @param {string} langKey language String or Array to be used as preferredLanguage (changing at runtime)
       *
       * @return {string} preferred language key
       */
      $translate.preferredLanguage = function (langKey) {
        if(langKey) {
          setupPreferredLanguage(langKey);
        }
        return $preferredLanguage;
      };

      /**
       * @ngdoc function
       * @name pascalprecht.translate.$translate#cloakClassName
       * @methodOf pascalprecht.translate.$translate
       *
       * @description
       * Returns the configured class name for `translate-cloak` directive.
       *
       * @return {string} cloakClassName
       */
      $translate.cloakClassName = function () {
        return $cloakClassName;
      };

      /**
       * @ngdoc function
       * @name pascalprecht.translate.$translate#fallbackLanguage
       * @methodOf pascalprecht.translate.$translate
       *
       * @description
       * Returns the language key for the fallback languages or sets a new fallback stack.
       *
       * @param {string=} langKey language String or Array of fallback languages to be used (to change stack at runtime)
       *
       * @return {string||array} fallback language key
       */
      $translate.fallbackLanguage = function (langKey) {
        if (langKey !== undefined && langKey !== null) {
          fallbackStack(langKey);

          // as we might have an async loader initiated and a new translation language might have been defined
          // we need to add the promise to the stack also. So - iterate.
          if ($loaderFactory) {
            if ($fallbackLanguage && $fallbackLanguage.length) {
              for (var i = 0, len = $fallbackLanguage.length; i < len; i++) {
                if (!langPromises[$fallbackLanguage[i]]) {
                  langPromises[$fallbackLanguage[i]] = loadAsync($fallbackLanguage[i]);
                }
              }
            }
          }
          $translate.use($translate.use());
        }
        if ($fallbackWasString) {
          return $fallbackLanguage[0];
        } else {
          return $fallbackLanguage;
        }

      };

      /**
       * @ngdoc function
       * @name pascalprecht.translate.$translate#useFallbackLanguage
       * @methodOf pascalprecht.translate.$translate
       *
       * @description
       * Sets the first key of the fallback language stack to be used for translation.
       * Therefore all languages in the fallback array BEFORE this key will be skipped!
       *
       * @param {string=} langKey Contains the langKey the iteration shall start with. Set to false if you want to
       * get back to the whole stack
       */
      $translate.useFallbackLanguage = function (langKey) {
        if (langKey !== undefined && langKey !== null) {
          if (!langKey) {
            startFallbackIteration = 0;
          } else {
            var langKeyPosition = indexOf($fallbackLanguage, langKey);
            if (langKeyPosition > -1) {
              startFallbackIteration = langKeyPosition;
            }
          }

        }

      };

      /**
       * @ngdoc function
       * @name pascalprecht.translate.$translate#proposedLanguage
       * @methodOf pascalprecht.translate.$translate
       *
       * @description
       * Returns the language key of language that is currently loaded asynchronously.
       *
       * @return {string} language key
       */
      $translate.proposedLanguage = function () {
        return $nextLang;
      };

      /**
       * @ngdoc function
       * @name pascalprecht.translate.$translate#storage
       * @methodOf pascalprecht.translate.$translate
       *
       * @description
       * Returns registered storage.
       *
       * @return {object} Storage
       */
      $translate.storage = function () {
        return Storage;
      };

      /**
       * @ngdoc function
       * @name pascalprecht.translate.$translate#use
       * @methodOf pascalprecht.translate.$translate
       *
       * @description
       * Tells angular-translate which language to use by given language key. This method is
       * used to change language at runtime. It also takes care of storing the language
       * key in a configured store to let your app remember the choosed language.
       *
       * When trying to 'use' a language which isn't available it tries to load it
       * asynchronously with registered loaders.
       *
       * Returns promise object with loaded language file data
       * @example
       * $translate.use("en_US").then(function(data){
       *   $scope.text = $translate("HELLO");
       * });
       *
       * @param {string} key Language key
       * @return {string} Language key
       */
      $translate.use = function (key) {
        if (!key) {
          return $uses;
        }

        var deferred = $q.defer();

        $rootScope.$emit('$translateChangeStart', {language: key});

        // Try to get the aliased language key
        var aliasedKey = negotiateLocale(key);
        if (aliasedKey) {
          key = aliasedKey;
        }

        // if there isn't a translation table for the language we've requested,
        // we load it asynchronously
        if (($forceAsyncReloadEnabled || !$translationTable[key]) && $loaderFactory && !langPromises[key]) {
          $nextLang = key;
          langPromises[key] = loadAsync(key).then(function (translation) {
            translations(translation.key, translation.table);
            deferred.resolve(translation.key);
            useLanguage(translation.key);
            return translation;
          }, function (key) {
            $rootScope.$emit('$translateChangeError', {language: key});
            deferred.reject(key);
            $rootScope.$emit('$translateChangeEnd', {language: key});
            return $q.reject(key);
          });
          langPromises[key]['finally'](function () {
            clearNextLangAndPromise(key);
          });
        } else if ($nextLang === key && langPromises[key]) {
          // we are already loading this asynchronously
          // resolve our new deferred when the old langPromise is resolved
          langPromises[key].then(function (translation) {
            deferred.resolve(translation.key);
            return translation;
          }, function (key) {
            deferred.reject(key);
            return $q.reject(key);
          });
        } else {
          deferred.resolve(key);
          useLanguage(key);
        }

        return deferred.promise;
      };

      /**
       * @ngdoc function
       * @name pascalprecht.translate.$translate#storageKey
       * @methodOf pascalprecht.translate.$translate
       *
       * @description
       * Returns the key for the storage.
       *
       * @return {string} storage key
       */
      $translate.storageKey = function () {
        return storageKey();
      };

      /**
       * @ngdoc function
       * @name pascalprecht.translate.$translate#isPostCompilingEnabled
       * @methodOf pascalprecht.translate.$translate
       *
       * @description
       * Returns whether post compiling is enabled or not
       *
       * @return {bool} storage key
       */
      $translate.isPostCompilingEnabled = function () {
        return $postCompilingEnabled;
      };

      /**
       * @ngdoc function
       * @name pascalprecht.translate.$translate#isForceAsyncReloadEnabled
       * @methodOf pascalprecht.translate.$translate
       *
       * @description
       * Returns whether force async reload is enabled or not
       *
       * @return {boolean} forceAsyncReload value
       */
      $translate.isForceAsyncReloadEnabled = function () {
        return $forceAsyncReloadEnabled;
      };

      /**
       * @ngdoc function
       * @name pascalprecht.translate.$translate#refresh
       * @methodOf pascalprecht.translate.$translate
       *
       * @description
       * Refreshes a translation table pointed by the given langKey. If langKey is not specified,
       * the module will drop all existent translation tables and load new version of those which
       * are currently in use.
       *
       * Refresh means that the module will drop target translation table and try to load it again.
       *
       * In case there are no loaders registered the refresh() method will throw an Error.
       *
       * If the module is able to refresh translation tables refresh() method will broadcast
       * $translateRefreshStart and $translateRefreshEnd events.
       *
       * @example
       * // this will drop all currently existent translation tables and reload those which are
       * // currently in use
       * $translate.refresh();
       * // this will refresh a translation table for the en_US language
       * $translate.refresh('en_US');
       *
       * @param {string} langKey A language key of the table, which has to be refreshed
       *
       * @return {promise} Promise, which will be resolved in case a translation tables refreshing
       * process is finished successfully, and reject if not.
       */
      $translate.refresh = function (langKey) {
        if (!$loaderFactory) {
          throw new Error('Couldn\'t refresh translation table, no loader registered!');
        }

        var deferred = $q.defer();

        function resolve() {
          deferred.resolve();
          $rootScope.$emit('$translateRefreshEnd', {language: langKey});
        }

        function reject() {
          deferred.reject();
          $rootScope.$emit('$translateRefreshEnd', {language: langKey});
        }

        $rootScope.$emit('$translateRefreshStart', {language: langKey});

        if (!langKey) {
          // if there's no language key specified we refresh ALL THE THINGS!
          var tables = [], loadingKeys = {};

          // reload registered fallback languages
          if ($fallbackLanguage && $fallbackLanguage.length) {
            for (var i = 0, len = $fallbackLanguage.length; i < len; i++) {
              tables.push(loadAsync($fallbackLanguage[i]));
              loadingKeys[$fallbackLanguage[i]] = true;
            }
          }

          // reload currently used language
          if ($uses && !loadingKeys[$uses]) {
            tables.push(loadAsync($uses));
          }

          var allTranslationsLoaded = function (tableData) {
            $translationTable = {};
            angular.forEach(tableData, function (data) {
              translations(data.key, data.table);
            });
            if ($uses) {
              useLanguage($uses);
            }
            resolve();
          };
          allTranslationsLoaded.displayName = 'refreshPostProcessor';

          $q.all(tables).then(allTranslationsLoaded, reject);

        } else if ($translationTable[langKey]) {

          var oneTranslationsLoaded = function (data) {
            translations(data.key, data.table);
            if (langKey === $uses) {
              useLanguage($uses);
            }
            resolve();
          };
          oneTranslationsLoaded.displayName = 'refreshPostProcessor';

          loadAsync(langKey).then(oneTranslationsLoaded, reject);

        } else {
          reject();
        }
        return deferred.promise;
      };

      /**
       * @ngdoc function
       * @name pascalprecht.translate.$translate#instant
       * @methodOf pascalprecht.translate.$translate
       *
       * @description
       * Returns a translation instantly from the internal state of loaded translation. All rules
       * regarding the current language, the preferred language of even fallback languages will be
       * used except any promise handling. If a language was not found, an asynchronous loading
       * will be invoked in the background.
       *
       * @param {string|array} translationId A token which represents a translation id
       *                                     This can be optionally an array of translation ids which
       *                                     results that the function's promise returns an object where
       *                                     each key is the translation id and the value the translation.
       * @param {object} interpolateParams Params
       * @param {string} interpolationId The id of the interpolation to use
       *
       * @return {string|object} translation
       */
      $translate.instant = function (translationId, interpolateParams, interpolationId) {

        // Detect undefined and null values to shorten the execution and prevent exceptions
        if (translationId === null || angular.isUndefined(translationId)) {
          return translationId;
        }

        // Duck detection: If the first argument is an array, a bunch of translations was requested.
        // The result is an object.
        if (angular.isArray(translationId)) {
          var results = {};
          for (var i = 0, c = translationId.length; i < c; i++) {
            results[translationId[i]] = $translate.instant(translationId[i], interpolateParams, interpolationId);
          }
          return results;
        }

        // We discarded unacceptable values. So we just need to verify if translationId is empty String
        if (angular.isString(translationId) && translationId.length < 1) {
          return translationId;
        }

        // trim off any whitespace
        if (translationId) {
          translationId = trim.apply(translationId);
        }

        var result, possibleLangKeys = [];
        if ($preferredLanguage) {
          possibleLangKeys.push($preferredLanguage);
        }
        if ($uses) {
          possibleLangKeys.push($uses);
        }
        if ($fallbackLanguage && $fallbackLanguage.length) {
          possibleLangKeys = possibleLangKeys.concat($fallbackLanguage);
        }
        for (var j = 0, d = possibleLangKeys.length; j < d; j++) {
          var possibleLangKey = possibleLangKeys[j];
          if ($translationTable[possibleLangKey]) {
            if (typeof $translationTable[possibleLangKey][translationId] !== 'undefined') {
              result = determineTranslationInstant(translationId, interpolateParams, interpolationId);
            } else if ($notFoundIndicatorLeft || $notFoundIndicatorRight) {
              result = applyNotFoundIndicators(translationId);
            }
          }
          if (typeof result !== 'undefined') {
            break;
          }
        }

        if (!result && result !== '') {
          // Return translation of default interpolator if not found anything.
          result = defaultInterpolator.interpolate(translationId, interpolateParams);
          if ($missingTranslationHandlerFactory && !pendingLoader) {
            result = translateByHandler(translationId, interpolateParams);
          }
        }

        return result;
      };

      /**
       * @ngdoc function
       * @name pascalprecht.translate.$translate#versionInfo
       * @methodOf pascalprecht.translate.$translate
       *
       * @description
       * Returns the current version information for the angular-translate library
       *
       * @return {string} angular-translate version
       */
      $translate.versionInfo = function () {
        return version;
      };

      /**
       * @ngdoc function
       * @name pascalprecht.translate.$translate#loaderCache
       * @methodOf pascalprecht.translate.$translate
       *
       * @description
       * Returns the defined loaderCache.
       *
       * @return {boolean|string|object} current value of loaderCache
       */
      $translate.loaderCache = function () {
        return loaderCache;
      };

      // internal purpose only
      $translate.directivePriority = function () {
        return directivePriority;
      };

      // internal purpose only
      $translate.statefulFilter = function () {
        return statefulFilter;
      };

      if ($loaderFactory) {

        // If at least one async loader is defined and there are no
        // (default) translations available we should try to load them.
        if (angular.equals($translationTable, {})) {
          $translate.use($translate.use());
        }

        // Also, if there are any fallback language registered, we start
        // loading them asynchronously as soon as we can.
        if ($fallbackLanguage && $fallbackLanguage.length) {
          var processAsyncResult = function (translation) {
            translations(translation.key, translation.table);
            $rootScope.$emit('$translateChangeEnd', { language: translation.key });
            return translation;
          };
          for (var i = 0, len = $fallbackLanguage.length; i < len; i++) {
            var fallbackLanguageId = $fallbackLanguage[i];
            if ($forceAsyncReloadEnabled || !$translationTable[fallbackLanguageId]) {
              langPromises[fallbackLanguageId] = loadAsync(fallbackLanguageId).then(processAsyncResult);
            }
          }
        }
      }

      return $translate;
    }
  ];
}
$translate.$inject = ['$STORAGE_KEY', '$windowProvider', '$translateSanitizationProvider', 'pascalprechtTranslateOverrider'];

$translate.displayName = 'displayName';

/**
 * @ngdoc object
 * @name pascalprecht.translate.$translateDefaultInterpolation
 * @requires $interpolate
 *
 * @description
 * Uses angular's `$interpolate` services to interpolate strings against some values.
 *
 * Be aware to configure a proper sanitization strategy.
 *
 * See also:
 * * {@link pascalprecht.translate.$translateSanitization}
 *
 * @return {object} $translateDefaultInterpolation Interpolator service
 */
angular.module('pascalprecht.translate').factory('$translateDefaultInterpolation', $translateDefaultInterpolation);

function $translateDefaultInterpolation ($interpolate, $translateSanitization) {

  'use strict';

  var $translateInterpolator = {},
      $locale,
      $identifier = 'default';

  /**
   * @ngdoc function
   * @name pascalprecht.translate.$translateDefaultInterpolation#setLocale
   * @methodOf pascalprecht.translate.$translateDefaultInterpolation
   *
   * @description
   * Sets current locale (this is currently not use in this interpolation).
   *
   * @param {string} locale Language key or locale.
   */
  $translateInterpolator.setLocale = function (locale) {
    $locale = locale;
  };

  /**
   * @ngdoc function
   * @name pascalprecht.translate.$translateDefaultInterpolation#getInterpolationIdentifier
   * @methodOf pascalprecht.translate.$translateDefaultInterpolation
   *
   * @description
   * Returns an identifier for this interpolation service.
   *
   * @returns {string} $identifier
   */
  $translateInterpolator.getInterpolationIdentifier = function () {
    return $identifier;
  };

  /**
   * @deprecated will be removed in 3.0
   * @see {@link pascalprecht.translate.$translateSanitization}
   */
  $translateInterpolator.useSanitizeValueStrategy = function (value) {
    $translateSanitization.useStrategy(value);
    return this;
  };

  /**
   * @ngdoc function
   * @name pascalprecht.translate.$translateDefaultInterpolation#interpolate
   * @methodOf pascalprecht.translate.$translateDefaultInterpolation
   *
   * @description
   * Interpolates given string agains given interpolate params using angulars
   * `$interpolate` service.
   *
   * @returns {string} interpolated string.
   */
  $translateInterpolator.interpolate = function (string, interpolationParams) {
    interpolationParams = interpolationParams || {};
    interpolationParams = $translateSanitization.sanitize(interpolationParams, 'params');

    var interpolatedText = $interpolate(string)(interpolationParams);
    interpolatedText = $translateSanitization.sanitize(interpolatedText, 'text');

    return interpolatedText;
  };

  return $translateInterpolator;
}
$translateDefaultInterpolation.$inject = ['$interpolate', '$translateSanitization'];

$translateDefaultInterpolation.displayName = '$translateDefaultInterpolation';

angular.module('pascalprecht.translate').constant('$STORAGE_KEY', 'NG_TRANSLATE_LANG_KEY');

angular.module('pascalprecht.translate')
/**
 * @ngdoc directive
 * @name pascalprecht.translate.directive:translate
 * @requires $compile
 * @requires $filter
 * @requires $interpolate
 * @restrict A
 *
 * @description
 * Translates given translation id either through attribute or DOM content.
 * Internally it uses `translate` filter to translate translation id. It possible to
 * pass an optional `translate-values` object literal as string into translation id.
 *
 * @param {string=} translate Translation id which could be either string or interpolated string.
 * @param {string=} translate-values Values to pass into translation id. Can be passed as object literal string or interpolated object.
 * @param {string=} translate-attr-ATTR translate Translation id and put it into ATTR attribute.
 * @param {string=} translate-default will be used unless translation was successful
 * @param {boolean=} translate-compile (default true if present) defines locally activation of {@link pascalprecht.translate.$translateProvider#methods_usePostCompiling}
 *
 * @example
   <example module="ngView">
    <file name="index.html">
      <div ng-controller="TranslateCtrl">

        <pre translate="TRANSLATION_ID"></pre>
        <pre translate>TRANSLATION_ID</pre>
        <pre translate translate-attr-title="TRANSLATION_ID"></pre>
        <pre translate="{{translationId}}"></pre>
        <pre translate>{{translationId}}</pre>
        <pre translate="WITH_VALUES" translate-values="{value: 5}"></pre>
        <pre translate translate-values="{value: 5}">WITH_VALUES</pre>
        <pre translate="WITH_VALUES" translate-values="{{values}}"></pre>
        <pre translate translate-values="{{values}}">WITH_VALUES</pre>
        <pre translate translate-attr-title="WITH_VALUES" translate-values="{{values}}"></pre>

      </div>
    </file>
    <file name="script.js">
      angular.module('ngView', ['pascalprecht.translate'])

      .config(function ($translateProvider) {

        $translateProvider.translations('en',{
          'TRANSLATION_ID': 'Hello there!',
          'WITH_VALUES': 'The following value is dynamic: {{value}}'
        }).preferredLanguage('en');

      });

      angular.module('ngView').controller('TranslateCtrl', function ($scope) {
        $scope.translationId = 'TRANSLATION_ID';

        $scope.values = {
          value: 78
        };
      });
    </file>
    <file name="scenario.js">
      it('should translate', function () {
        inject(function ($rootScope, $compile) {
          $rootScope.translationId = 'TRANSLATION_ID';

          element = $compile('<p translate="TRANSLATION_ID"></p>')($rootScope);
          $rootScope.$digest();
          expect(element.text()).toBe('Hello there!');

          element = $compile('<p translate="{{translationId}}"></p>')($rootScope);
          $rootScope.$digest();
          expect(element.text()).toBe('Hello there!');

          element = $compile('<p translate>TRANSLATION_ID</p>')($rootScope);
          $rootScope.$digest();
          expect(element.text()).toBe('Hello there!');

          element = $compile('<p translate>{{translationId}}</p>')($rootScope);
          $rootScope.$digest();
          expect(element.text()).toBe('Hello there!');

          element = $compile('<p translate translate-attr-title="TRANSLATION_ID"></p>')($rootScope);
          $rootScope.$digest();
          expect(element.attr('title')).toBe('Hello there!');
        });
      });
    </file>
   </example>
 */
.directive('translate', translateDirective);
function translateDirective($translate, $q, $interpolate, $compile, $parse, $rootScope) {

  'use strict';

  /**
   * @name trim
   * @private
   *
   * @description
   * trim polyfill
   *
   * @returns {string} The string stripped of whitespace from both ends
   */
  var trim = function() {
    return this.toString().replace(/^\s+|\s+$/g, '');
  };

  return {
    restrict: 'AE',
    scope: true,
    priority: $translate.directivePriority(),
    compile: function (tElement, tAttr) {

      var translateValuesExist = (tAttr.translateValues) ?
        tAttr.translateValues : undefined;

      var translateInterpolation = (tAttr.translateInterpolation) ?
        tAttr.translateInterpolation : undefined;

      var translateValueExist = tElement[0].outerHTML.match(/translate-value-+/i);

      var interpolateRegExp = '^(.*)(' + $interpolate.startSymbol() + '.*' + $interpolate.endSymbol() + ')(.*)',
          watcherRegExp = '^(.*)' + $interpolate.startSymbol() + '(.*)' + $interpolate.endSymbol() + '(.*)';

      return function linkFn(scope, iElement, iAttr) {

        scope.interpolateParams = {};
        scope.preText = '';
        scope.postText = '';
        var translationIds = {};

        var initInterpolationParams = function (interpolateParams, iAttr, tAttr) {
          // initial setup
          if (iAttr.translateValues) {
            angular.extend(interpolateParams, $parse(iAttr.translateValues)(scope.$parent));
          }
          // initially fetch all attributes if existing and fill the params
          if (translateValueExist) {
            for (var attr in tAttr) {
              if (Object.prototype.hasOwnProperty.call(iAttr, attr) && attr.substr(0, 14) === 'translateValue' && attr !== 'translateValues') {
                var attributeName = angular.lowercase(attr.substr(14, 1)) + attr.substr(15);
                interpolateParams[attributeName] = tAttr[attr];
              }
            }
          }
        };

        // Ensures any change of the attribute "translate" containing the id will
        // be re-stored to the scope's "translationId".
        // If the attribute has no content, the element's text value (white spaces trimmed off) will be used.
        var observeElementTranslation = function (translationId) {

          // Remove any old watcher
          if (angular.isFunction(observeElementTranslation._unwatchOld)) {
            observeElementTranslation._unwatchOld();
            observeElementTranslation._unwatchOld = undefined;
          }

          if (angular.equals(translationId , '') || !angular.isDefined(translationId)) {
            // Resolve translation id by inner html if required
            var interpolateMatches = trim.apply(iElement.text()).match(interpolateRegExp);
            // Interpolate translation id if required
            if (angular.isArray(interpolateMatches)) {
              scope.preText = interpolateMatches[1];
              scope.postText = interpolateMatches[3];
              translationIds.translate = $interpolate(interpolateMatches[2])(scope.$parent);
              var watcherMatches = iElement.text().match(watcherRegExp);
              if (angular.isArray(watcherMatches) && watcherMatches[2] && watcherMatches[2].length) {
                observeElementTranslation._unwatchOld = scope.$watch(watcherMatches[2], function (newValue) {
                  translationIds.translate = newValue;
                  updateTranslations();
                });
              }
            } else {
              translationIds.translate = iElement.text().replace(/^\s+|\s+$/g,'');
            }
          } else {
            translationIds.translate = translationId;
          }
          updateTranslations();
        };

        var observeAttributeTranslation = function (translateAttr) {
          iAttr.$observe(translateAttr, function (translationId) {
            translationIds[translateAttr] = translationId;
            updateTranslations();
          });
        };

        // initial setup with values
        initInterpolationParams(scope.interpolateParams, iAttr, tAttr);

        var firstAttributeChangedEvent = true;
        iAttr.$observe('translate', function (translationId) {
          if (typeof translationId === 'undefined') {
            // case of element "<translate>xyz</translate>"
            observeElementTranslation('');
          } else {
            // case of regular attribute
            if (translationId !== '' || !firstAttributeChangedEvent) {
              translationIds.translate = translationId;
              updateTranslations();
            }
          }
          firstAttributeChangedEvent = false;
        });

        for (var translateAttr in iAttr) {
          if (iAttr.hasOwnProperty(translateAttr) && translateAttr.substr(0, 13) === 'translateAttr') {
            observeAttributeTranslation(translateAttr);
          }
        }

        iAttr.$observe('translateDefault', function (value) {
          scope.defaultText = value;
        });

        if (translateValuesExist) {
          iAttr.$observe('translateValues', function (interpolateParams) {
            if (interpolateParams) {
              scope.$parent.$watch(function () {
                angular.extend(scope.interpolateParams, $parse(interpolateParams)(scope.$parent));
              });
            }
          });
        }

        if (translateValueExist) {
          var observeValueAttribute = function (attrName) {
            iAttr.$observe(attrName, function (value) {
              var attributeName = angular.lowercase(attrName.substr(14, 1)) + attrName.substr(15);
              scope.interpolateParams[attributeName] = value;
            });
          };
          for (var attr in iAttr) {
            if (Object.prototype.hasOwnProperty.call(iAttr, attr) && attr.substr(0, 14) === 'translateValue' && attr !== 'translateValues') {
              observeValueAttribute(attr);
            }
          }
        }

        // Master update function
        var updateTranslations = function () {
          for (var key in translationIds) {

            if (translationIds.hasOwnProperty(key) && translationIds[key] !== undefined) {
              updateTranslation(key, translationIds[key], scope, scope.interpolateParams, scope.defaultText);
            }
          }
        };

        // Put translation processing function outside loop
        var updateTranslation = function(translateAttr, translationId, scope, interpolateParams, defaultTranslationText) {
          if (translationId) {
            $translate(translationId, interpolateParams, translateInterpolation, defaultTranslationText)
              .then(function (translation) {
                applyTranslation(translation, scope, true, translateAttr);
              }, function (translationId) {
                applyTranslation(translationId, scope, false, translateAttr);
              });
          } else {
            // as an empty string cannot be translated, we can solve this using successful=false
            applyTranslation(translationId, scope, false, translateAttr);
          }
        };

        var applyTranslation = function (value, scope, successful, translateAttr) {
          if (translateAttr === 'translate') {
            // default translate into innerHTML
            if (!successful && typeof scope.defaultText !== 'undefined') {
              value = scope.defaultText;
            }
            iElement.html(scope.preText + value + scope.postText);
            var globallyEnabled = $translate.isPostCompilingEnabled();
            var locallyDefined = typeof tAttr.translateCompile !== 'undefined';
            var locallyEnabled = locallyDefined && tAttr.translateCompile !== 'false';
            if ((globallyEnabled && !locallyDefined) || locallyEnabled) {
              $compile(iElement.contents())(scope);
            }
          } else {
            // translate attribute
            if (!successful && typeof scope.defaultText !== 'undefined') {
              value = scope.defaultText;
            }
            var attributeName = iAttr.$attr[translateAttr];
            if (attributeName.substr(0, 5) === 'data-') {
              // ensure html5 data prefix is stripped
              attributeName = attributeName.substr(5);
            }
            attributeName = attributeName.substr(15);
            iElement.attr(attributeName, value);
          }
        };

        if (translateValuesExist || translateValueExist || iAttr.translateDefault) {
          scope.$watch('interpolateParams', updateTranslations, true);
        }

        // Ensures the text will be refreshed after the current language was changed
        // w/ $translate.use(...)
        var unbind = $rootScope.$on('$translateChangeSuccess', updateTranslations);

        // ensure translation will be looked up at least one
        if (iElement.text().length) {
          if (iAttr.translate) {
            observeElementTranslation(iAttr.translate);
          } else {
            observeElementTranslation('');
          }
        } else if (iAttr.translate) {
          // ensure attribute will be not skipped
          observeElementTranslation(iAttr.translate);
        }
        updateTranslations();
        scope.$on('$destroy', unbind);
      };
    }
  };
}
translateDirective.$inject = ['$translate', '$q', '$interpolate', '$compile', '$parse', '$rootScope'];

translateDirective.displayName = 'translateDirective';

angular.module('pascalprecht.translate')
/**
 * @ngdoc directive
 * @name pascalprecht.translate.directive:translateCloak
 * @requires $rootScope
 * @requires $translate
 * @restrict A
 *
 * $description
 * Adds a `translate-cloak` class name to the given element where this directive
 * is applied initially and removes it, once a loader has finished loading.
 *
 * This directive can be used to prevent initial flickering when loading translation
 * data asynchronously.
 *
 * The class name is defined in
 * {@link pascalprecht.translate.$translateProvider#cloakClassName $translate.cloakClassName()}.
 *
 * @param {string=} translate-cloak If a translationId is provided, it will be used for showing
 *                                  or hiding the cloak. Basically it relies on the translation
 *                                  resolve.
 */
.directive('translateCloak', translateCloakDirective);

function translateCloakDirective($rootScope, $translate) {

  'use strict';

  return {
    compile: function (tElement) {
      var applyCloak = function () {
        tElement.addClass($translate.cloakClassName());
      },
      removeCloak = function () {
        tElement.removeClass($translate.cloakClassName());
      },
      removeListener = $rootScope.$on('$translateChangeEnd', function () {
        removeCloak();
        removeListener();
        removeListener = null;
      });
      applyCloak();

      return function linkFn(scope, iElement, iAttr) {
        // Register a watcher for the defined translation allowing a fine tuned cloak
        if (iAttr.translateCloak && iAttr.translateCloak.length) {
          iAttr.$observe('translateCloak', function (translationId) {
            $translate(translationId).then(removeCloak, applyCloak);
          });
        }
      };
    }
  };
}
translateCloakDirective.$inject = ['$rootScope', '$translate'];

translateCloakDirective.displayName = 'translateCloakDirective';

angular.module('pascalprecht.translate')
/**
 * @ngdoc filter
 * @name pascalprecht.translate.filter:translate
 * @requires $parse
 * @requires pascalprecht.translate.$translate
 * @function
 *
 * @description
 * Uses `$translate` service to translate contents. Accepts interpolate parameters
 * to pass dynamized values though translation.
 *
 * @param {string} translationId A translation id to be translated.
 * @param {*=} interpolateParams Optional object literal (as hash or string) to pass values into translation.
 *
 * @returns {string} Translated text.
 *
 * @example
   <example module="ngView">
    <file name="index.html">
      <div ng-controller="TranslateCtrl">

        <pre>{{ 'TRANSLATION_ID' | translate }}</pre>
        <pre>{{ translationId | translate }}</pre>
        <pre>{{ 'WITH_VALUES' | translate:'{value: 5}' }}</pre>
        <pre>{{ 'WITH_VALUES' | translate:values }}</pre>

      </div>
    </file>
    <file name="script.js">
      angular.module('ngView', ['pascalprecht.translate'])

      .config(function ($translateProvider) {

        $translateProvider.translations('en', {
          'TRANSLATION_ID': 'Hello there!',
          'WITH_VALUES': 'The following value is dynamic: {{value}}'
        });
        $translateProvider.preferredLanguage('en');

      });

      angular.module('ngView').controller('TranslateCtrl', function ($scope) {
        $scope.translationId = 'TRANSLATION_ID';

        $scope.values = {
          value: 78
        };
      });
    </file>
   </example>
 */
.filter('translate', translateFilterFactory);

function translateFilterFactory($parse, $translate) {

  'use strict';

  var translateFilter = function (translationId, interpolateParams, interpolation) {

    if (!angular.isObject(interpolateParams)) {
      interpolateParams = $parse(interpolateParams)(this);
    }

    return $translate.instant(translationId, interpolateParams, interpolation);
  };

  if ($translate.statefulFilter()) {
    translateFilter.$stateful = true;
  }

  return translateFilter;
}
translateFilterFactory.$inject = ['$parse', '$translate'];

translateFilterFactory.displayName = 'translateFilterFactory';

angular.module('pascalprecht.translate')

/**
 * @ngdoc object
 * @name pascalprecht.translate.$translationCache
 * @requires $cacheFactory
 *
 * @description
 * The first time a translation table is used, it is loaded in the translation cache for quick retrieval. You
 * can load translation tables directly into the cache by consuming the
 * `$translationCache` service directly.
 *
 * @return {object} $cacheFactory object.
 */
  .factory('$translationCache', $translationCache);

function $translationCache($cacheFactory) {

  'use strict';

  return $cacheFactory('translations');
}
$translationCache.$inject = ['$cacheFactory'];

$translationCache.displayName = '$translationCache';
return 'pascalprecht.translate';

}));

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJhbmd1bGFyLXRyYW5zbGF0ZS5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiFcbiAqIGFuZ3VsYXItdHJhbnNsYXRlIC0gdjIuNy4yIC0gMjAxNS0wNi0wMVxuICogaHR0cDovL2dpdGh1Yi5jb20vYW5ndWxhci10cmFuc2xhdGUvYW5ndWxhci10cmFuc2xhdGVcbiAqIENvcHlyaWdodCAoYykgMjAxNSA7IExpY2Vuc2VkIE1JVFxuICovXG4oZnVuY3Rpb24gKHJvb3QsIGZhY3RvcnkpIHtcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZSB1bmxlc3MgYW1kTW9kdWxlSWQgaXMgc2V0XG4gICAgZGVmaW5lKFtdLCBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gKGZhY3RvcnkoKSk7XG4gICAgfSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKSB7XG4gICAgLy8gTm9kZS4gRG9lcyBub3Qgd29yayB3aXRoIHN0cmljdCBDb21tb25KUywgYnV0XG4gICAgLy8gb25seSBDb21tb25KUy1saWtlIGVudmlyb25tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsXG4gICAgLy8gbGlrZSBOb2RlLlxuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpO1xuICB9IGVsc2Uge1xuICAgIGZhY3RvcnkoKTtcbiAgfVxufSh0aGlzLCBmdW5jdGlvbiAoKSB7XG5cbi8qKlxuICogQG5nZG9jIG92ZXJ2aWV3XG4gKiBAbmFtZSBwYXNjYWxwcmVjaHQudHJhbnNsYXRlXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBUaGUgbWFpbiBtb2R1bGUgd2hpY2ggaG9sZHMgZXZlcnl0aGluZyB0b2dldGhlci5cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3Bhc2NhbHByZWNodC50cmFuc2xhdGUnLCBbJ25nJ10pXG4gIC5ydW4ocnVuVHJhbnNsYXRlKTtcblxuZnVuY3Rpb24gcnVuVHJhbnNsYXRlKCR0cmFuc2xhdGUpIHtcblxuICAndXNlIHN0cmljdCc7XG5cbiAgdmFyIGtleSA9ICR0cmFuc2xhdGUuc3RvcmFnZUtleSgpLFxuICAgIHN0b3JhZ2UgPSAkdHJhbnNsYXRlLnN0b3JhZ2UoKTtcblxuICB2YXIgZmFsbGJhY2tGcm9tSW5jb3JyZWN0U3RvcmFnZVZhbHVlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBwcmVmZXJyZWQgPSAkdHJhbnNsYXRlLnByZWZlcnJlZExhbmd1YWdlKCk7XG4gICAgaWYgKGFuZ3VsYXIuaXNTdHJpbmcocHJlZmVycmVkKSkge1xuICAgICAgJHRyYW5zbGF0ZS51c2UocHJlZmVycmVkKTtcbiAgICAgIC8vICR0cmFuc2xhdGUudXNlKCkgd2lsbCBhbHNvIHJlbWVtYmVyIHRoZSBsYW5ndWFnZS5cbiAgICAgIC8vIFNvLCB3ZSBkb24ndCBuZWVkIHRvIGNhbGwgc3RvcmFnZS5wdXQoKSBoZXJlLlxuICAgIH0gZWxzZSB7XG4gICAgICBzdG9yYWdlLnB1dChrZXksICR0cmFuc2xhdGUudXNlKCkpO1xuICAgIH1cbiAgfTtcblxuICBmYWxsYmFja0Zyb21JbmNvcnJlY3RTdG9yYWdlVmFsdWUuZGlzcGxheU5hbWUgPSAnZmFsbGJhY2tGcm9tSW5jb3JyZWN0U3RvcmFnZVZhbHVlJztcblxuICBpZiAoc3RvcmFnZSkge1xuICAgIGlmICghc3RvcmFnZS5nZXQoa2V5KSkge1xuICAgICAgZmFsbGJhY2tGcm9tSW5jb3JyZWN0U3RvcmFnZVZhbHVlKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICR0cmFuc2xhdGUudXNlKHN0b3JhZ2UuZ2V0KGtleSkpWydjYXRjaCddKGZhbGxiYWNrRnJvbUluY29ycmVjdFN0b3JhZ2VWYWx1ZSk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGFuZ3VsYXIuaXNTdHJpbmcoJHRyYW5zbGF0ZS5wcmVmZXJyZWRMYW5ndWFnZSgpKSkge1xuICAgICR0cmFuc2xhdGUudXNlKCR0cmFuc2xhdGUucHJlZmVycmVkTGFuZ3VhZ2UoKSk7XG4gIH1cbn1cbnJ1blRyYW5zbGF0ZS4kaW5qZWN0ID0gWyckdHJhbnNsYXRlJ107XG5cbnJ1blRyYW5zbGF0ZS5kaXNwbGF5TmFtZSA9ICdydW5UcmFuc2xhdGUnO1xuXG4vKipcbiAqIEBuZ2RvYyBvYmplY3RcbiAqIEBuYW1lIHBhc2NhbHByZWNodC50cmFuc2xhdGUuJHRyYW5zbGF0ZVNhbml0aXphdGlvblByb3ZpZGVyXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogQ29uZmlndXJhdGlvbnMgZm9yICR0cmFuc2xhdGVTYW5pdGl6YXRpb25cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3Bhc2NhbHByZWNodC50cmFuc2xhdGUnKS5wcm92aWRlcignJHRyYW5zbGF0ZVNhbml0aXphdGlvbicsICR0cmFuc2xhdGVTYW5pdGl6YXRpb25Qcm92aWRlcik7XG5cbmZ1bmN0aW9uICR0cmFuc2xhdGVTYW5pdGl6YXRpb25Qcm92aWRlciAoKSB7XG5cbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIHZhciAkc2FuaXRpemUsXG4gICAgICBjdXJyZW50U3RyYXRlZ3kgPSBudWxsLCAvLyBUT0RPIGNoYW5nZSB0byBlaXRoZXIgJ3Nhbml0aXplJywgJ2VzY2FwZScgb3IgWydzYW5pdGl6ZScsICdlc2NhcGVQYXJhbWV0ZXJzJ10gaW4gMy4wLlxuICAgICAgaGFzQ29uZmlndXJlZFN0cmF0ZWd5ID0gZmFsc2UsXG4gICAgICBoYXNTaG93bk5vU3RyYXRlZ3lDb25maWd1cmVkV2FybmluZyA9IGZhbHNlLFxuICAgICAgc3RyYXRlZ2llcztcblxuICAvKipcbiAgICogRGVmaW5pdGlvbiBvZiBhIHNhbml0aXphdGlvbiBzdHJhdGVneSBmdW5jdGlvblxuICAgKiBAY2FsbGJhY2sgU3RyYXRlZ3lGdW5jdGlvblxuICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R9IHZhbHVlIC0gdmFsdWUgdG8gYmUgc2FuaXRpemVkIChlaXRoZXIgYSBzdHJpbmcgb3IgYW4gaW50ZXJwb2xhdGVkIHZhbHVlIG1hcClcbiAgICogQHBhcmFtIHtzdHJpbmd9IG1vZGUgLSBlaXRoZXIgJ3RleHQnIGZvciBhIHN0cmluZyAodHJhbnNsYXRpb24pIG9yICdwYXJhbXMnIGZvciB0aGUgaW50ZXJwb2xhdGVkIHBhcmFtc1xuICAgKiBAcmV0dXJuIHtzdHJpbmd8b2JqZWN0fVxuICAgKi9cblxuICAvKipcbiAgICogQG5nZG9jIHByb3BlcnR5XG4gICAqIEBuYW1lIHN0cmF0ZWdpZXNcbiAgICogQHByb3BlcnR5T2YgcGFzY2FscHJlY2h0LnRyYW5zbGF0ZS4kdHJhbnNsYXRlU2FuaXRpemF0aW9uUHJvdmlkZXJcbiAgICpcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqIEZvbGxvd2luZyBzdHJhdGVnaWVzIGFyZSBidWlsdC1pbjpcbiAgICogPGRsPlxuICAgKiAgIDxkdD5zYW5pdGl6ZTwvZHQ+XG4gICAqICAgPGRkPlNhbml0aXplcyBIVE1MIGluIHRoZSB0cmFuc2xhdGlvbiB0ZXh0IHVzaW5nICRzYW5pdGl6ZTwvZGQ+XG4gICAqICAgPGR0PmVzY2FwZTwvZHQ+XG4gICAqICAgPGRkPkVzY2FwZXMgSFRNTCBpbiB0aGUgdHJhbnNsYXRpb248L2RkPlxuICAgKiAgIDxkdD5zYW5pdGl6ZVBhcmFtZXRlcnM8L2R0PlxuICAgKiAgIDxkZD5TYW5pdGl6ZXMgSFRNTCBpbiB0aGUgdmFsdWVzIG9mIHRoZSBpbnRlcnBvbGF0aW9uIHBhcmFtZXRlcnMgdXNpbmcgJHNhbml0aXplPC9kZD5cbiAgICogICA8ZHQ+ZXNjYXBlUGFyYW1ldGVyczwvZHQ+XG4gICAqICAgPGRkPkVzY2FwZXMgSFRNTCBpbiB0aGUgdmFsdWVzIG9mIHRoZSBpbnRlcnBvbGF0aW9uIHBhcmFtZXRlcnM8L2RkPlxuICAgKiAgIDxkdD5lc2NhcGVkPC9kdD5cbiAgICogICA8ZGQ+U3VwcG9ydCBsZWdhY3kgc3RyYXRlZ3kgbmFtZSAnZXNjYXBlZCcgZm9yIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5ICh3aWxsIGJlIHJlbW92ZWQgaW4gMy4wKTwvZGQ+XG4gICAqIDwvZGw+XG4gICAqXG4gICAqL1xuXG4gIHN0cmF0ZWdpZXMgPSB7XG4gICAgc2FuaXRpemU6IGZ1bmN0aW9uICh2YWx1ZSwgbW9kZSkge1xuICAgICAgaWYgKG1vZGUgPT09ICd0ZXh0Jykge1xuICAgICAgICB2YWx1ZSA9IGh0bWxTYW5pdGl6ZVZhbHVlKHZhbHVlKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9LFxuICAgIGVzY2FwZTogZnVuY3Rpb24gKHZhbHVlLCBtb2RlKSB7XG4gICAgICBpZiAobW9kZSA9PT0gJ3RleHQnKSB7XG4gICAgICAgIHZhbHVlID0gaHRtbEVzY2FwZVZhbHVlKHZhbHVlKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9LFxuICAgIHNhbml0aXplUGFyYW1ldGVyczogZnVuY3Rpb24gKHZhbHVlLCBtb2RlKSB7XG4gICAgICBpZiAobW9kZSA9PT0gJ3BhcmFtcycpIHtcbiAgICAgICAgdmFsdWUgPSBtYXBJbnRlcnBvbGF0aW9uUGFyYW1ldGVycyh2YWx1ZSwgaHRtbFNhbml0aXplVmFsdWUpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH0sXG4gICAgZXNjYXBlUGFyYW1ldGVyczogZnVuY3Rpb24gKHZhbHVlLCBtb2RlKSB7XG4gICAgICBpZiAobW9kZSA9PT0gJ3BhcmFtcycpIHtcbiAgICAgICAgdmFsdWUgPSBtYXBJbnRlcnBvbGF0aW9uUGFyYW1ldGVycyh2YWx1ZSwgaHRtbEVzY2FwZVZhbHVlKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG4gIH07XG4gIC8vIFN1cHBvcnQgbGVnYWN5IHN0cmF0ZWd5IG5hbWUgJ2VzY2FwZWQnIGZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eS5cbiAgLy8gVE9ETyBzaG91bGQgYmUgcmVtb3ZlZCBpbiAzLjBcbiAgc3RyYXRlZ2llcy5lc2NhcGVkID0gc3RyYXRlZ2llcy5lc2NhcGVQYXJhbWV0ZXJzO1xuXG4gIC8qKlxuICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICogQG5hbWUgcGFzY2FscHJlY2h0LnRyYW5zbGF0ZS4kdHJhbnNsYXRlU2FuaXRpemF0aW9uUHJvdmlkZXIjYWRkU3RyYXRlZ3lcbiAgICogQG1ldGhvZE9mIHBhc2NhbHByZWNodC50cmFuc2xhdGUuJHRyYW5zbGF0ZVNhbml0aXphdGlvblByb3ZpZGVyXG4gICAqXG4gICAqIEBkZXNjcmlwdGlvblxuICAgKiBBZGRzIGEgc2FuaXRpemF0aW9uIHN0cmF0ZWd5IHRvIHRoZSBsaXN0IG9mIGtub3duIHN0cmF0ZWdpZXMuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBzdHJhdGVneU5hbWUgLSB1bmlxdWUga2V5IGZvciBhIHN0cmF0ZWd5XG4gICAqIEBwYXJhbSB7U3RyYXRlZ3lGdW5jdGlvbn0gc3RyYXRlZ3lGdW5jdGlvbiAtIHN0cmF0ZWd5IGZ1bmN0aW9uXG4gICAqIEByZXR1cm5zIHtvYmplY3R9IHRoaXNcbiAgICovXG4gIHRoaXMuYWRkU3RyYXRlZ3kgPSBmdW5jdGlvbiAoc3RyYXRlZ3lOYW1lLCBzdHJhdGVneUZ1bmN0aW9uKSB7XG4gICAgc3RyYXRlZ2llc1tzdHJhdGVneU5hbWVdID0gc3RyYXRlZ3lGdW5jdGlvbjtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICAvKipcbiAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAqIEBuYW1lIHBhc2NhbHByZWNodC50cmFuc2xhdGUuJHRyYW5zbGF0ZVNhbml0aXphdGlvblByb3ZpZGVyI3JlbW92ZVN0cmF0ZWd5XG4gICAqIEBtZXRob2RPZiBwYXNjYWxwcmVjaHQudHJhbnNsYXRlLiR0cmFuc2xhdGVTYW5pdGl6YXRpb25Qcm92aWRlclxuICAgKlxuICAgKiBAZGVzY3JpcHRpb25cbiAgICogUmVtb3ZlcyBhIHNhbml0aXphdGlvbiBzdHJhdGVneSBmcm9tIHRoZSBsaXN0IG9mIGtub3duIHN0cmF0ZWdpZXMuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBzdHJhdGVneU5hbWUgLSB1bmlxdWUga2V5IGZvciBhIHN0cmF0ZWd5XG4gICAqIEByZXR1cm5zIHtvYmplY3R9IHRoaXNcbiAgICovXG4gIHRoaXMucmVtb3ZlU3RyYXRlZ3kgPSBmdW5jdGlvbiAoc3RyYXRlZ3lOYW1lKSB7XG4gICAgZGVsZXRlIHN0cmF0ZWdpZXNbc3RyYXRlZ3lOYW1lXTtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICAvKipcbiAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAqIEBuYW1lIHBhc2NhbHByZWNodC50cmFuc2xhdGUuJHRyYW5zbGF0ZVNhbml0aXphdGlvblByb3ZpZGVyI3VzZVN0cmF0ZWd5XG4gICAqIEBtZXRob2RPZiBwYXNjYWxwcmVjaHQudHJhbnNsYXRlLiR0cmFuc2xhdGVTYW5pdGl6YXRpb25Qcm92aWRlclxuICAgKlxuICAgKiBAZGVzY3JpcHRpb25cbiAgICogU2VsZWN0cyBhIHNhbml0aXphdGlvbiBzdHJhdGVneS4gV2hlbiBhbiBhcnJheSBpcyBwcm92aWRlZCB0aGUgc3RyYXRlZ2llcyB3aWxsIGJlIGV4ZWN1dGVkIGluIG9yZGVyLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ3xTdHJhdGVneUZ1bmN0aW9ufGFycmF5fSBzdHJhdGVneSBUaGUgc2FuaXRpemF0aW9uIHN0cmF0ZWd5IC8gc3RyYXRlZ2llcyB3aGljaCBzaG91bGQgYmUgdXNlZC4gRWl0aGVyIGEgbmFtZSBvZiBhbiBleGlzdGluZyBzdHJhdGVneSwgYSBjdXN0b20gc3RyYXRlZ3kgZnVuY3Rpb24sIG9yIGFuIGFycmF5IGNvbnNpc3Rpbmcgb2YgbXVsdGlwbGUgbmFtZXMgYW5kIC8gb3IgY3VzdG9tIGZ1bmN0aW9ucy5cbiAgICogQHJldHVybnMge29iamVjdH0gdGhpc1xuICAgKi9cbiAgdGhpcy51c2VTdHJhdGVneSA9IGZ1bmN0aW9uIChzdHJhdGVneSkge1xuICAgIGhhc0NvbmZpZ3VyZWRTdHJhdGVneSA9IHRydWU7XG4gICAgY3VycmVudFN0cmF0ZWd5ID0gc3RyYXRlZ3k7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgLyoqXG4gICAqIEBuZ2RvYyBvYmplY3RcbiAgICogQG5hbWUgcGFzY2FscHJlY2h0LnRyYW5zbGF0ZS4kdHJhbnNsYXRlU2FuaXRpemF0aW9uXG4gICAqIEByZXF1aXJlcyAkaW5qZWN0b3JcbiAgICogQHJlcXVpcmVzICRsb2dcbiAgICpcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqIFNhbml0aXplcyBpbnRlcnBvbGF0aW9uIHBhcmFtZXRlcnMgYW5kIHRyYW5zbGF0ZWQgdGV4dHMuXG4gICAqXG4gICAqL1xuICB0aGlzLiRnZXQgPSBbJyRpbmplY3RvcicsICckbG9nJywgZnVuY3Rpb24gKCRpbmplY3RvciwgJGxvZykge1xuXG4gICAgdmFyIGFwcGx5U3RyYXRlZ2llcyA9IGZ1bmN0aW9uICh2YWx1ZSwgbW9kZSwgc2VsZWN0ZWRTdHJhdGVnaWVzKSB7XG4gICAgICBhbmd1bGFyLmZvckVhY2goc2VsZWN0ZWRTdHJhdGVnaWVzLCBmdW5jdGlvbiAoc2VsZWN0ZWRTdHJhdGVneSkge1xuICAgICAgICBpZiAoYW5ndWxhci5pc0Z1bmN0aW9uKHNlbGVjdGVkU3RyYXRlZ3kpKSB7XG4gICAgICAgICAgdmFsdWUgPSBzZWxlY3RlZFN0cmF0ZWd5KHZhbHVlLCBtb2RlKTtcbiAgICAgICAgfSBlbHNlIGlmIChhbmd1bGFyLmlzRnVuY3Rpb24oc3RyYXRlZ2llc1tzZWxlY3RlZFN0cmF0ZWd5XSkpIHtcbiAgICAgICAgICB2YWx1ZSA9IHN0cmF0ZWdpZXNbc2VsZWN0ZWRTdHJhdGVneV0odmFsdWUsIG1vZGUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcigncGFzY2FscHJlY2h0LnRyYW5zbGF0ZS4kdHJhbnNsYXRlU2FuaXRpemF0aW9uOiBVbmtub3duIHNhbml0aXphdGlvbiBzdHJhdGVneTogXFwnJyArIHNlbGVjdGVkU3RyYXRlZ3kgKyAnXFwnJyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH07XG5cbiAgICAvLyBUT0RPOiBzaG91bGQgYmUgcmVtb3ZlZCBpbiAzLjBcbiAgICB2YXIgc2hvd05vU3RyYXRlZ3lDb25maWd1cmVkV2FybmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmICghaGFzQ29uZmlndXJlZFN0cmF0ZWd5ICYmICFoYXNTaG93bk5vU3RyYXRlZ3lDb25maWd1cmVkV2FybmluZykge1xuICAgICAgICAkbG9nLndhcm4oJ3Bhc2NhbHByZWNodC50cmFuc2xhdGUuJHRyYW5zbGF0ZVNhbml0aXphdGlvbjogTm8gc2FuaXRpemF0aW9uIHN0cmF0ZWd5IGhhcyBiZWVuIGNvbmZpZ3VyZWQuIFRoaXMgY2FuIGhhdmUgc2VyaW91cyBzZWN1cml0eSBpbXBsaWNhdGlvbnMuIFNlZSBodHRwOi8vYW5ndWxhci10cmFuc2xhdGUuZ2l0aHViLmlvL2RvY3MvIy9ndWlkZS8xOV9zZWN1cml0eSBmb3IgZGV0YWlscy4nKTtcbiAgICAgICAgaGFzU2hvd25Ob1N0cmF0ZWd5Q29uZmlndXJlZFdhcm5pbmcgPSB0cnVlO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBpZiAoJGluamVjdG9yLmhhcygnJHNhbml0aXplJykpIHtcbiAgICAgICRzYW5pdGl6ZSA9ICRpbmplY3Rvci5nZXQoJyRzYW5pdGl6ZScpO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAvKipcbiAgICAgICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgICAgICogQG5hbWUgcGFzY2FscHJlY2h0LnRyYW5zbGF0ZS4kdHJhbnNsYXRlU2FuaXRpemF0aW9uI3VzZVN0cmF0ZWd5XG4gICAgICAgKiBAbWV0aG9kT2YgcGFzY2FscHJlY2h0LnRyYW5zbGF0ZS4kdHJhbnNsYXRlU2FuaXRpemF0aW9uXG4gICAgICAgKlxuICAgICAgICogQGRlc2NyaXB0aW9uXG4gICAgICAgKiBTZWxlY3RzIGEgc2FuaXRpemF0aW9uIHN0cmF0ZWd5LiBXaGVuIGFuIGFycmF5IGlzIHByb3ZpZGVkIHRoZSBzdHJhdGVnaWVzIHdpbGwgYmUgZXhlY3V0ZWQgaW4gb3JkZXIuXG4gICAgICAgKlxuICAgICAgICogQHBhcmFtIHtzdHJpbmd8U3RyYXRlZ3lGdW5jdGlvbnxhcnJheX0gc3RyYXRlZ3kgVGhlIHNhbml0aXphdGlvbiBzdHJhdGVneSAvIHN0cmF0ZWdpZXMgd2hpY2ggc2hvdWxkIGJlIHVzZWQuIEVpdGhlciBhIG5hbWUgb2YgYW4gZXhpc3Rpbmcgc3RyYXRlZ3ksIGEgY3VzdG9tIHN0cmF0ZWd5IGZ1bmN0aW9uLCBvciBhbiBhcnJheSBjb25zaXN0aW5nIG9mIG11bHRpcGxlIG5hbWVzIGFuZCAvIG9yIGN1c3RvbSBmdW5jdGlvbnMuXG4gICAgICAgKi9cbiAgICAgIHVzZVN0cmF0ZWd5OiAoZnVuY3Rpb24gKHNlbGYpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChzdHJhdGVneSkge1xuICAgICAgICAgIHNlbGYudXNlU3RyYXRlZ3koc3RyYXRlZ3kpO1xuICAgICAgICB9O1xuICAgICAgfSkodGhpcyksXG5cbiAgICAgIC8qKlxuICAgICAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAgICAgKiBAbmFtZSBwYXNjYWxwcmVjaHQudHJhbnNsYXRlLiR0cmFuc2xhdGVTYW5pdGl6YXRpb24jc2FuaXRpemVcbiAgICAgICAqIEBtZXRob2RPZiBwYXNjYWxwcmVjaHQudHJhbnNsYXRlLiR0cmFuc2xhdGVTYW5pdGl6YXRpb25cbiAgICAgICAqXG4gICAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgICAqIFNhbml0aXplcyBhIHZhbHVlLlxuICAgICAgICpcbiAgICAgICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdH0gdmFsdWUgVGhlIHZhbHVlIHdoaWNoIHNob3VsZCBiZSBzYW5pdGl6ZWQuXG4gICAgICAgKiBAcGFyYW0ge3N0cmluZ30gbW9kZSBUaGUgY3VycmVudCBzYW5pdGl6YXRpb24gbW9kZSwgZWl0aGVyICdwYXJhbXMnIG9yICd0ZXh0Jy5cbiAgICAgICAqIEBwYXJhbSB7c3RyaW5nfFN0cmF0ZWd5RnVuY3Rpb258YXJyYXl9IFtzdHJhdGVneV0gT3B0aW9uYWwgY3VzdG9tIHN0cmF0ZWd5IHdoaWNoIHNob3VsZCBiZSB1c2VkIGluc3RlYWQgb2YgdGhlIGN1cnJlbnRseSBzZWxlY3RlZCBzdHJhdGVneS5cbiAgICAgICAqIEByZXR1cm5zIHtzdHJpbmd8b2JqZWN0fSBzYW5pdGl6ZWQgdmFsdWVcbiAgICAgICAqL1xuICAgICAgc2FuaXRpemU6IGZ1bmN0aW9uICh2YWx1ZSwgbW9kZSwgc3RyYXRlZ3kpIHtcbiAgICAgICAgaWYgKCFjdXJyZW50U3RyYXRlZ3kpIHtcbiAgICAgICAgICBzaG93Tm9TdHJhdGVneUNvbmZpZ3VyZWRXYXJuaW5nKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDMpIHtcbiAgICAgICAgICBzdHJhdGVneSA9IGN1cnJlbnRTdHJhdGVneTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghc3RyYXRlZ3kpIHtcbiAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgc2VsZWN0ZWRTdHJhdGVnaWVzID0gYW5ndWxhci5pc0FycmF5KHN0cmF0ZWd5KSA/IHN0cmF0ZWd5IDogW3N0cmF0ZWd5XTtcbiAgICAgICAgcmV0dXJuIGFwcGx5U3RyYXRlZ2llcyh2YWx1ZSwgbW9kZSwgc2VsZWN0ZWRTdHJhdGVnaWVzKTtcbiAgICAgIH1cbiAgICB9O1xuICB9XTtcblxuICB2YXIgaHRtbEVzY2FwZVZhbHVlID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgdmFyIGVsZW1lbnQgPSBhbmd1bGFyLmVsZW1lbnQoJzxkaXY+PC9kaXY+Jyk7XG4gICAgZWxlbWVudC50ZXh0KHZhbHVlKTsgLy8gbm90IGNoYWluYWJsZSwgc2VlICMxMDQ0XG4gICAgcmV0dXJuIGVsZW1lbnQuaHRtbCgpO1xuICB9O1xuXG4gIHZhciBodG1sU2FuaXRpemVWYWx1ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIGlmICghJHNhbml0aXplKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3Bhc2NhbHByZWNodC50cmFuc2xhdGUuJHRyYW5zbGF0ZVNhbml0aXphdGlvbjogRXJyb3IgY2Fubm90IGZpbmQgJHNhbml0aXplIHNlcnZpY2UuIEVpdGhlciBpbmNsdWRlIHRoZSBuZ1Nhbml0aXplIG1vZHVsZSAoaHR0cHM6Ly9kb2NzLmFuZ3VsYXJqcy5vcmcvYXBpL25nU2FuaXRpemUpIG9yIHVzZSBhIHNhbml0aXphdGlvbiBzdHJhdGVneSB3aGljaCBkb2VzIG5vdCBkZXBlbmQgb24gJHNhbml0aXplLCBzdWNoIGFzIFxcJ2VzY2FwZVxcJy4nKTtcbiAgICB9XG4gICAgcmV0dXJuICRzYW5pdGl6ZSh2YWx1ZSk7XG4gIH07XG5cbiAgdmFyIG1hcEludGVycG9sYXRpb25QYXJhbWV0ZXJzID0gZnVuY3Rpb24gKHZhbHVlLCBpdGVyYXRlZSkge1xuICAgIGlmIChhbmd1bGFyLmlzT2JqZWN0KHZhbHVlKSkge1xuICAgICAgdmFyIHJlc3VsdCA9IGFuZ3VsYXIuaXNBcnJheSh2YWx1ZSkgPyBbXSA6IHt9O1xuXG4gICAgICBhbmd1bGFyLmZvckVhY2godmFsdWUsIGZ1bmN0aW9uIChwcm9wZXJ0eVZhbHVlLCBwcm9wZXJ0eUtleSkge1xuICAgICAgICByZXN1bHRbcHJvcGVydHlLZXldID0gbWFwSW50ZXJwb2xhdGlvblBhcmFtZXRlcnMocHJvcGVydHlWYWx1ZSwgaXRlcmF0ZWUpO1xuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSBlbHNlIGlmIChhbmd1bGFyLmlzTnVtYmVyKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gaXRlcmF0ZWUodmFsdWUpO1xuICAgIH1cbiAgfTtcbn1cblxuLyoqXG4gKiBAbmdkb2Mgb2JqZWN0XG4gKiBAbmFtZSBwYXNjYWxwcmVjaHQudHJhbnNsYXRlLiR0cmFuc2xhdGVQcm92aWRlclxuICogQGRlc2NyaXB0aW9uXG4gKlxuICogJHRyYW5zbGF0ZVByb3ZpZGVyIGFsbG93cyBkZXZlbG9wZXJzIHRvIHJlZ2lzdGVyIHRyYW5zbGF0aW9uLXRhYmxlcywgYXN5bmNocm9ub3VzIGxvYWRlcnNcbiAqIGFuZCBzaW1pbGFyIHRvIGNvbmZpZ3VyZSB0cmFuc2xhdGlvbiBiZWhhdmlvciBkaXJlY3RseSBpbnNpZGUgb2YgYSBtb2R1bGUuXG4gKlxuICovXG5hbmd1bGFyLm1vZHVsZSgncGFzY2FscHJlY2h0LnRyYW5zbGF0ZScpXG4uY29uc3RhbnQoJ3Bhc2NhbHByZWNodFRyYW5zbGF0ZU92ZXJyaWRlcicsIHt9KVxuLnByb3ZpZGVyKCckdHJhbnNsYXRlJywgJHRyYW5zbGF0ZSk7XG5cbmZ1bmN0aW9uICR0cmFuc2xhdGUoJFNUT1JBR0VfS0VZLCAkd2luZG93UHJvdmlkZXIsICR0cmFuc2xhdGVTYW5pdGl6YXRpb25Qcm92aWRlciwgcGFzY2FscHJlY2h0VHJhbnNsYXRlT3ZlcnJpZGVyKSB7XG5cbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIHZhciAkdHJhbnNsYXRpb25UYWJsZSA9IHt9LFxuICAgICAgJHByZWZlcnJlZExhbmd1YWdlLFxuICAgICAgJGF2YWlsYWJsZUxhbmd1YWdlS2V5cyA9IFtdLFxuICAgICAgJGxhbmd1YWdlS2V5QWxpYXNlcyxcbiAgICAgICRmYWxsYmFja0xhbmd1YWdlLFxuICAgICAgJGZhbGxiYWNrV2FzU3RyaW5nLFxuICAgICAgJHVzZXMsXG4gICAgICAkbmV4dExhbmcsXG4gICAgICAkc3RvcmFnZUZhY3RvcnksXG4gICAgICAkc3RvcmFnZUtleSA9ICRTVE9SQUdFX0tFWSxcbiAgICAgICRzdG9yYWdlUHJlZml4LFxuICAgICAgJG1pc3NpbmdUcmFuc2xhdGlvbkhhbmRsZXJGYWN0b3J5LFxuICAgICAgJGludGVycG9sYXRpb25GYWN0b3J5LFxuICAgICAgJGludGVycG9sYXRvckZhY3RvcmllcyA9IFtdLFxuICAgICAgJGxvYWRlckZhY3RvcnksXG4gICAgICAkY2xvYWtDbGFzc05hbWUgPSAndHJhbnNsYXRlLWNsb2FrJyxcbiAgICAgICRsb2FkZXJPcHRpb25zLFxuICAgICAgJG5vdEZvdW5kSW5kaWNhdG9yTGVmdCxcbiAgICAgICRub3RGb3VuZEluZGljYXRvclJpZ2h0LFxuICAgICAgJHBvc3RDb21waWxpbmdFbmFibGVkID0gZmFsc2UsXG4gICAgICAkZm9yY2VBc3luY1JlbG9hZEVuYWJsZWQgPSBmYWxzZSxcbiAgICAgIE5FU1RFRF9PQkpFQ1RfREVMSU1JVEVSID0gJy4nLFxuICAgICAgbG9hZGVyQ2FjaGUsXG4gICAgICBkaXJlY3RpdmVQcmlvcml0eSA9IDAsXG4gICAgICBzdGF0ZWZ1bEZpbHRlciA9IHRydWUsXG4gICAgICB1bmlmb3JtTGFuZ3VhZ2VUYWdSZXNvbHZlciA9ICdkZWZhdWx0JyxcbiAgICAgIGxhbmd1YWdlVGFnUmVzb2x2ZXIgPSB7XG4gICAgICAgICdkZWZhdWx0JzogZnVuY3Rpb24gKHRhZykge1xuICAgICAgICAgIHJldHVybiAodGFnIHx8ICcnKS5zcGxpdCgnLScpLmpvaW4oJ18nKTtcbiAgICAgICAgfSxcbiAgICAgICAgamF2YTogZnVuY3Rpb24gKHRhZykge1xuICAgICAgICAgIHZhciB0ZW1wID0gKHRhZyB8fCAnJykuc3BsaXQoJy0nKS5qb2luKCdfJyk7XG4gICAgICAgICAgdmFyIHBhcnRzID0gdGVtcC5zcGxpdCgnXycpO1xuICAgICAgICAgIHJldHVybiBwYXJ0cy5sZW5ndGggPiAxID8gKHBhcnRzWzBdLnRvTG93ZXJDYXNlKCkgKyAnXycgKyBwYXJ0c1sxXS50b1VwcGVyQ2FzZSgpKSA6IHRlbXA7XG4gICAgICAgIH0sXG4gICAgICAgIGJjcDQ3OiBmdW5jdGlvbiAodGFnKSB7XG4gICAgICAgICAgdmFyIHRlbXAgPSAodGFnIHx8ICcnKS5zcGxpdCgnXycpLmpvaW4oJy0nKTtcbiAgICAgICAgICB2YXIgcGFydHMgPSB0ZW1wLnNwbGl0KCctJyk7XG4gICAgICAgICAgcmV0dXJuIHBhcnRzLmxlbmd0aCA+IDEgPyAocGFydHNbMF0udG9Mb3dlckNhc2UoKSArICctJyArIHBhcnRzWzFdLnRvVXBwZXJDYXNlKCkpIDogdGVtcDtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICB2YXIgdmVyc2lvbiA9ICcyLjcuMic7XG5cbiAgLy8gdHJpZXMgdG8gZGV0ZXJtaW5lIHRoZSBicm93c2VycyBsYW5ndWFnZVxuICB2YXIgZ2V0Rmlyc3RCcm93c2VyTGFuZ3VhZ2UgPSBmdW5jdGlvbiAoKSB7XG5cbiAgICAvLyBpbnRlcm5hbCBwdXJwb3NlIG9ubHlcbiAgICBpZiAoYW5ndWxhci5pc0Z1bmN0aW9uKHBhc2NhbHByZWNodFRyYW5zbGF0ZU92ZXJyaWRlci5nZXRMb2NhbGUpKSB7XG4gICAgICByZXR1cm4gcGFzY2FscHJlY2h0VHJhbnNsYXRlT3ZlcnJpZGVyLmdldExvY2FsZSgpO1xuICAgIH1cblxuICAgIHZhciBuYXYgPSAkd2luZG93UHJvdmlkZXIuJGdldCgpLm5hdmlnYXRvcixcbiAgICAgICAgYnJvd3Nlckxhbmd1YWdlUHJvcGVydHlLZXlzID0gWydsYW5ndWFnZScsICdicm93c2VyTGFuZ3VhZ2UnLCAnc3lzdGVtTGFuZ3VhZ2UnLCAndXNlckxhbmd1YWdlJ10sXG4gICAgICAgIGksXG4gICAgICAgIGxhbmd1YWdlO1xuXG4gICAgLy8gc3VwcG9ydCBmb3IgSFRNTCA1LjEgXCJuYXZpZ2F0b3IubGFuZ3VhZ2VzXCJcbiAgICBpZiAoYW5ndWxhci5pc0FycmF5KG5hdi5sYW5ndWFnZXMpKSB7XG4gICAgICBmb3IgKGkgPSAwOyBpIDwgbmF2Lmxhbmd1YWdlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBsYW5ndWFnZSA9IG5hdi5sYW5ndWFnZXNbaV07XG4gICAgICAgIGlmIChsYW5ndWFnZSAmJiBsYW5ndWFnZS5sZW5ndGgpIHtcbiAgICAgICAgICByZXR1cm4gbGFuZ3VhZ2U7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBzdXBwb3J0IGZvciBvdGhlciB3ZWxsIGtub3duIHByb3BlcnRpZXMgaW4gYnJvd3NlcnNcbiAgICBmb3IgKGkgPSAwOyBpIDwgYnJvd3Nlckxhbmd1YWdlUHJvcGVydHlLZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBsYW5ndWFnZSA9IG5hdlticm93c2VyTGFuZ3VhZ2VQcm9wZXJ0eUtleXNbaV1dO1xuICAgICAgaWYgKGxhbmd1YWdlICYmIGxhbmd1YWdlLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gbGFuZ3VhZ2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG51bGw7XG4gIH07XG4gIGdldEZpcnN0QnJvd3Nlckxhbmd1YWdlLmRpc3BsYXlOYW1lID0gJ2FuZ3VsYXItdHJhbnNsYXRlL3NlcnZpY2U6IGdldEZpcnN0QnJvd3Nlckxhbmd1YWdlJztcblxuICAvLyB0cmllcyB0byBkZXRlcm1pbmUgdGhlIGJyb3dzZXJzIGxvY2FsZVxuICB2YXIgZ2V0TG9jYWxlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBsb2NhbGUgPSBnZXRGaXJzdEJyb3dzZXJMYW5ndWFnZSgpIHx8ICcnO1xuICAgIGlmIChsYW5ndWFnZVRhZ1Jlc29sdmVyW3VuaWZvcm1MYW5ndWFnZVRhZ1Jlc29sdmVyXSkge1xuICAgICAgbG9jYWxlID0gbGFuZ3VhZ2VUYWdSZXNvbHZlclt1bmlmb3JtTGFuZ3VhZ2VUYWdSZXNvbHZlcl0obG9jYWxlKTtcbiAgICB9XG4gICAgcmV0dXJuIGxvY2FsZTtcbiAgfTtcbiAgZ2V0TG9jYWxlLmRpc3BsYXlOYW1lID0gJ2FuZ3VsYXItdHJhbnNsYXRlL3NlcnZpY2U6IGdldExvY2FsZSc7XG5cbiAgLyoqXG4gICAqIEBuYW1lIGluZGV4T2ZcbiAgICogQHByaXZhdGVcbiAgICpcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqIGluZGV4T2YgcG9seWZpbGwuIEtpbmRhIHNvcnRhLlxuICAgKlxuICAgKiBAcGFyYW0ge2FycmF5fSBhcnJheSBBcnJheSB0byBzZWFyY2ggaW4uXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBzZWFyY2hFbGVtZW50IEVsZW1lbnQgdG8gc2VhcmNoIGZvci5cbiAgICpcbiAgICogQHJldHVybnMge2ludH0gSW5kZXggb2Ygc2VhcmNoIGVsZW1lbnQuXG4gICAqL1xuICB2YXIgaW5kZXhPZiA9IGZ1bmN0aW9uKGFycmF5LCBzZWFyY2hFbGVtZW50KSB7XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGFycmF5Lmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBpZiAoYXJyYXlbaV0gPT09IHNlYXJjaEVsZW1lbnQpIHtcbiAgICAgICAgcmV0dXJuIGk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiAtMTtcbiAgfTtcblxuICAvKipcbiAgICogQG5hbWUgdHJpbVxuICAgKiBAcHJpdmF0ZVxuICAgKlxuICAgKiBAZGVzY3JpcHRpb25cbiAgICogdHJpbSBwb2x5ZmlsbFxuICAgKlxuICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgc3RyaW5nIHN0cmlwcGVkIG9mIHdoaXRlc3BhY2UgZnJvbSBib3RoIGVuZHNcbiAgICovXG4gIHZhciB0cmltID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMudG9TdHJpbmcoKS5yZXBsYWNlKC9eXFxzK3xcXHMrJC9nLCAnJyk7XG4gIH07XG5cbiAgdmFyIG5lZ290aWF0ZUxvY2FsZSA9IGZ1bmN0aW9uIChwcmVmZXJyZWQpIHtcblxuICAgIHZhciBhdmFpbCA9IFtdLFxuICAgICAgICBsb2NhbGUgPSBhbmd1bGFyLmxvd2VyY2FzZShwcmVmZXJyZWQpLFxuICAgICAgICBpID0gMCxcbiAgICAgICAgbiA9ICRhdmFpbGFibGVMYW5ndWFnZUtleXMubGVuZ3RoO1xuXG4gICAgZm9yICg7IGkgPCBuOyBpKyspIHtcbiAgICAgIGF2YWlsLnB1c2goYW5ndWxhci5sb3dlcmNhc2UoJGF2YWlsYWJsZUxhbmd1YWdlS2V5c1tpXSkpO1xuICAgIH1cblxuICAgIGlmIChpbmRleE9mKGF2YWlsLCBsb2NhbGUpID4gLTEpIHtcbiAgICAgIHJldHVybiBwcmVmZXJyZWQ7XG4gICAgfVxuXG4gICAgaWYgKCRsYW5ndWFnZUtleUFsaWFzZXMpIHtcbiAgICAgIHZhciBhbGlhcztcbiAgICAgIGZvciAodmFyIGxhbmdLZXlBbGlhcyBpbiAkbGFuZ3VhZ2VLZXlBbGlhc2VzKSB7XG4gICAgICAgIHZhciBoYXNXaWxkY2FyZEtleSA9IGZhbHNlO1xuICAgICAgICB2YXIgaGFzRXhhY3RLZXkgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoJGxhbmd1YWdlS2V5QWxpYXNlcywgbGFuZ0tleUFsaWFzKSAmJlxuICAgICAgICAgIGFuZ3VsYXIubG93ZXJjYXNlKGxhbmdLZXlBbGlhcykgPT09IGFuZ3VsYXIubG93ZXJjYXNlKHByZWZlcnJlZCk7XG5cbiAgICAgICAgaWYgKGxhbmdLZXlBbGlhcy5zbGljZSgtMSkgPT09ICcqJykge1xuICAgICAgICAgIGhhc1dpbGRjYXJkS2V5ID0gbGFuZ0tleUFsaWFzLnNsaWNlKDAsIC0xKSA9PT0gcHJlZmVycmVkLnNsaWNlKDAsIGxhbmdLZXlBbGlhcy5sZW5ndGgtMSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGhhc0V4YWN0S2V5IHx8IGhhc1dpbGRjYXJkS2V5KSB7XG4gICAgICAgICAgYWxpYXMgPSAkbGFuZ3VhZ2VLZXlBbGlhc2VzW2xhbmdLZXlBbGlhc107XG4gICAgICAgICAgaWYgKGluZGV4T2YoYXZhaWwsIGFuZ3VsYXIubG93ZXJjYXNlKGFsaWFzKSkgPiAtMSkge1xuICAgICAgICAgICAgcmV0dXJuIGFsaWFzO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwcmVmZXJyZWQpIHtcbiAgICAgIHZhciBwYXJ0cyA9IHByZWZlcnJlZC5zcGxpdCgnXycpO1xuXG4gICAgICBpZiAocGFydHMubGVuZ3RoID4gMSAmJiBpbmRleE9mKGF2YWlsLCBhbmd1bGFyLmxvd2VyY2FzZShwYXJ0c1swXSkpID4gLTEpIHtcbiAgICAgICAgcmV0dXJuIHBhcnRzWzBdO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIElmIGV2ZXJ5dGhpbmcgZmFpbHMsIGp1c3QgcmV0dXJuIHRoZSBwcmVmZXJyZWQsIHVuY2hhbmdlZC5cbiAgICByZXR1cm4gcHJlZmVycmVkO1xuICB9O1xuXG4gIC8qKlxuICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICogQG5hbWUgcGFzY2FscHJlY2h0LnRyYW5zbGF0ZS4kdHJhbnNsYXRlUHJvdmlkZXIjdHJhbnNsYXRpb25zXG4gICAqIEBtZXRob2RPZiBwYXNjYWxwcmVjaHQudHJhbnNsYXRlLiR0cmFuc2xhdGVQcm92aWRlclxuICAgKlxuICAgKiBAZGVzY3JpcHRpb25cbiAgICogUmVnaXN0ZXJzIGEgbmV3IHRyYW5zbGF0aW9uIHRhYmxlIGZvciBzcGVjaWZpYyBsYW5ndWFnZSBrZXkuXG4gICAqXG4gICAqIFRvIHJlZ2lzdGVyIGEgdHJhbnNsYXRpb24gdGFibGUgZm9yIHNwZWNpZmljIGxhbmd1YWdlLCBwYXNzIGEgZGVmaW5lZCBsYW5ndWFnZVxuICAgKiBrZXkgYXMgZmlyc3QgcGFyYW1ldGVyLlxuICAgKlxuICAgKiA8cHJlPlxuICAgKiAgLy8gcmVnaXN0ZXIgdHJhbnNsYXRpb24gdGFibGUgZm9yIGxhbmd1YWdlOiAnZGVfREUnXG4gICAqICAkdHJhbnNsYXRlUHJvdmlkZXIudHJhbnNsYXRpb25zKCdkZV9ERScsIHtcbiAgICogICAgJ0dSRUVUSU5HJzogJ0hhbGxvIFdlbHQhJ1xuICAgKiAgfSk7XG4gICAqXG4gICAqICAvLyByZWdpc3RlciBhbm90aGVyIG9uZVxuICAgKiAgJHRyYW5zbGF0ZVByb3ZpZGVyLnRyYW5zbGF0aW9ucygnZW5fVVMnLCB7XG4gICAqICAgICdHUkVFVElORyc6ICdIZWxsbyB3b3JsZCEnXG4gICAqICB9KTtcbiAgICogPC9wcmU+XG4gICAqXG4gICAqIFdoZW4gcmVnaXN0ZXJpbmcgbXVsdGlwbGUgdHJhbnNsYXRpb24gdGFibGVzIGZvciBmb3IgdGhlIHNhbWUgbGFuZ3VhZ2Uga2V5LFxuICAgKiB0aGUgYWN0dWFsIHRyYW5zbGF0aW9uIHRhYmxlIGdldHMgZXh0ZW5kZWQuIFRoaXMgYWxsb3dzIHlvdSB0byBkZWZpbmUgbW9kdWxlXG4gICAqIHNwZWNpZmljIHRyYW5zbGF0aW9uIHdoaWNoIG9ubHkgZ2V0IGFkZGVkLCBvbmNlIGEgc3BlY2lmaWMgbW9kdWxlIGlzIGxvYWRlZCBpblxuICAgKiB5b3VyIGFwcC5cbiAgICpcbiAgICogSW52b2tpbmcgdGhpcyBtZXRob2Qgd2l0aCBubyBhcmd1bWVudHMgcmV0dXJucyB0aGUgdHJhbnNsYXRpb24gdGFibGUgd2hpY2ggd2FzXG4gICAqIHJlZ2lzdGVyZWQgd2l0aCBubyBsYW5ndWFnZSBrZXkuIEludm9raW5nIGl0IHdpdGggYSBsYW5ndWFnZSBrZXkgcmV0dXJucyB0aGVcbiAgICogcmVsYXRlZCB0cmFuc2xhdGlvbiB0YWJsZS5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IGtleSBBIGxhbmd1YWdlIGtleS5cbiAgICogQHBhcmFtIHtvYmplY3R9IHRyYW5zbGF0aW9uVGFibGUgQSBwbGFpbiBvbGQgSmF2YVNjcmlwdCBvYmplY3QgdGhhdCByZXByZXNlbnRzIGEgdHJhbnNsYXRpb24gdGFibGUuXG4gICAqXG4gICAqL1xuICB2YXIgdHJhbnNsYXRpb25zID0gZnVuY3Rpb24gKGxhbmdLZXksIHRyYW5zbGF0aW9uVGFibGUpIHtcblxuICAgIGlmICghbGFuZ0tleSAmJiAhdHJhbnNsYXRpb25UYWJsZSkge1xuICAgICAgcmV0dXJuICR0cmFuc2xhdGlvblRhYmxlO1xuICAgIH1cblxuICAgIGlmIChsYW5nS2V5ICYmICF0cmFuc2xhdGlvblRhYmxlKSB7XG4gICAgICBpZiAoYW5ndWxhci5pc1N0cmluZyhsYW5nS2V5KSkge1xuICAgICAgICByZXR1cm4gJHRyYW5zbGF0aW9uVGFibGVbbGFuZ0tleV07XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICghYW5ndWxhci5pc09iamVjdCgkdHJhbnNsYXRpb25UYWJsZVtsYW5nS2V5XSkpIHtcbiAgICAgICAgJHRyYW5zbGF0aW9uVGFibGVbbGFuZ0tleV0gPSB7fTtcbiAgICAgIH1cbiAgICAgIGFuZ3VsYXIuZXh0ZW5kKCR0cmFuc2xhdGlvblRhYmxlW2xhbmdLZXldLCBmbGF0T2JqZWN0KHRyYW5zbGF0aW9uVGFibGUpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgdGhpcy50cmFuc2xhdGlvbnMgPSB0cmFuc2xhdGlvbnM7XG5cbiAgLyoqXG4gICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgKiBAbmFtZSBwYXNjYWxwcmVjaHQudHJhbnNsYXRlLiR0cmFuc2xhdGVQcm92aWRlciNjbG9ha0NsYXNzTmFtZVxuICAgKiBAbWV0aG9kT2YgcGFzY2FscHJlY2h0LnRyYW5zbGF0ZS4kdHJhbnNsYXRlUHJvdmlkZXJcbiAgICpcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqXG4gICAqIExldCdzIHlvdSBjaGFuZ2UgdGhlIGNsYXNzIG5hbWUgZm9yIGB0cmFuc2xhdGUtY2xvYWtgIGRpcmVjdGl2ZS5cbiAgICogRGVmYXVsdCBjbGFzcyBuYW1lIGlzIGB0cmFuc2xhdGUtY2xvYWtgLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSB0cmFuc2xhdGUtY2xvYWsgY2xhc3MgbmFtZVxuICAgKi9cbiAgdGhpcy5jbG9ha0NsYXNzTmFtZSA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgaWYgKCFuYW1lKSB7XG4gICAgICByZXR1cm4gJGNsb2FrQ2xhc3NOYW1lO1xuICAgIH1cbiAgICAkY2xvYWtDbGFzc05hbWUgPSBuYW1lO1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIC8qKlxuICAgKiBAbmFtZSBmbGF0T2JqZWN0XG4gICAqIEBwcml2YXRlXG4gICAqXG4gICAqIEBkZXNjcmlwdGlvblxuICAgKiBGbGF0cyBhbiBvYmplY3QuIFRoaXMgZnVuY3Rpb24gaXMgdXNlZCB0byBmbGF0dGVuIGdpdmVuIHRyYW5zbGF0aW9uIGRhdGEgd2l0aFxuICAgKiBuYW1lc3BhY2VzLCBzbyB0aGV5IGFyZSBsYXRlciBhY2Nlc3NpYmxlIHZpYSBkb3Qgbm90YXRpb24uXG4gICAqL1xuICB2YXIgZmxhdE9iamVjdCA9IGZ1bmN0aW9uIChkYXRhLCBwYXRoLCByZXN1bHQsIHByZXZLZXkpIHtcbiAgICB2YXIga2V5LCBrZXlXaXRoUGF0aCwga2V5V2l0aFNob3J0UGF0aCwgdmFsO1xuXG4gICAgaWYgKCFwYXRoKSB7XG4gICAgICBwYXRoID0gW107XG4gICAgfVxuICAgIGlmICghcmVzdWx0KSB7XG4gICAgICByZXN1bHQgPSB7fTtcbiAgICB9XG4gICAgZm9yIChrZXkgaW4gZGF0YSkge1xuICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoZGF0YSwga2V5KSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHZhbCA9IGRhdGFba2V5XTtcbiAgICAgIGlmIChhbmd1bGFyLmlzT2JqZWN0KHZhbCkpIHtcbiAgICAgICAgZmxhdE9iamVjdCh2YWwsIHBhdGguY29uY2F0KGtleSksIHJlc3VsdCwga2V5KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGtleVdpdGhQYXRoID0gcGF0aC5sZW5ndGggPyAoJycgKyBwYXRoLmpvaW4oTkVTVEVEX09CSkVDVF9ERUxJTUlURVIpICsgTkVTVEVEX09CSkVDVF9ERUxJTUlURVIgKyBrZXkpIDoga2V5O1xuICAgICAgICBpZihwYXRoLmxlbmd0aCAmJiBrZXkgPT09IHByZXZLZXkpe1xuICAgICAgICAgIC8vIENyZWF0ZSBzaG9ydGN1dCBwYXRoIChmb28uYmFyID09IGZvby5iYXIuYmFyKVxuICAgICAgICAgIGtleVdpdGhTaG9ydFBhdGggPSAnJyArIHBhdGguam9pbihORVNURURfT0JKRUNUX0RFTElNSVRFUik7XG4gICAgICAgICAgLy8gTGluayBpdCB0byBvcmlnaW5hbCBwYXRoXG4gICAgICAgICAgcmVzdWx0W2tleVdpdGhTaG9ydFBhdGhdID0gJ0A6JyArIGtleVdpdGhQYXRoO1xuICAgICAgICB9XG4gICAgICAgIHJlc3VsdFtrZXlXaXRoUGF0aF0gPSB2YWw7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG4gIGZsYXRPYmplY3QuZGlzcGxheU5hbWUgPSAnZmxhdE9iamVjdCc7XG5cbiAgLyoqXG4gICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgKiBAbmFtZSBwYXNjYWxwcmVjaHQudHJhbnNsYXRlLiR0cmFuc2xhdGVQcm92aWRlciNhZGRJbnRlcnBvbGF0aW9uXG4gICAqIEBtZXRob2RPZiBwYXNjYWxwcmVjaHQudHJhbnNsYXRlLiR0cmFuc2xhdGVQcm92aWRlclxuICAgKlxuICAgKiBAZGVzY3JpcHRpb25cbiAgICogQWRkcyBpbnRlcnBvbGF0aW9uIHNlcnZpY2VzIHRvIGFuZ3VsYXItdHJhbnNsYXRlLCBzbyBpdCBjYW4gbWFuYWdlIHRoZW0uXG4gICAqXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBmYWN0b3J5IEludGVycG9sYXRpb24gc2VydmljZSBmYWN0b3J5XG4gICAqL1xuICB0aGlzLmFkZEludGVycG9sYXRpb24gPSBmdW5jdGlvbiAoZmFjdG9yeSkge1xuICAgICRpbnRlcnBvbGF0b3JGYWN0b3JpZXMucHVzaChmYWN0b3J5KTtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICAvKipcbiAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAqIEBuYW1lIHBhc2NhbHByZWNodC50cmFuc2xhdGUuJHRyYW5zbGF0ZVByb3ZpZGVyI3VzZU1lc3NhZ2VGb3JtYXRJbnRlcnBvbGF0aW9uXG4gICAqIEBtZXRob2RPZiBwYXNjYWxwcmVjaHQudHJhbnNsYXRlLiR0cmFuc2xhdGVQcm92aWRlclxuICAgKlxuICAgKiBAZGVzY3JpcHRpb25cbiAgICogVGVsbHMgYW5ndWxhci10cmFuc2xhdGUgdG8gdXNlIGludGVycG9sYXRpb24gZnVuY3Rpb25hbGl0eSBvZiBtZXNzYWdlZm9ybWF0LmpzLlxuICAgKiBUaGlzIGlzIHVzZWZ1bCB3aGVuIGhhdmluZyBoaWdoIGxldmVsIHBsdXJhbGl6YXRpb24gYW5kIGdlbmRlciBzZWxlY3Rpb24uXG4gICAqL1xuICB0aGlzLnVzZU1lc3NhZ2VGb3JtYXRJbnRlcnBvbGF0aW9uID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLnVzZUludGVycG9sYXRpb24oJyR0cmFuc2xhdGVNZXNzYWdlRm9ybWF0SW50ZXJwb2xhdGlvbicpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICogQG5hbWUgcGFzY2FscHJlY2h0LnRyYW5zbGF0ZS4kdHJhbnNsYXRlUHJvdmlkZXIjdXNlSW50ZXJwb2xhdGlvblxuICAgKiBAbWV0aG9kT2YgcGFzY2FscHJlY2h0LnRyYW5zbGF0ZS4kdHJhbnNsYXRlUHJvdmlkZXJcbiAgICpcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqIFRlbGxzIGFuZ3VsYXItdHJhbnNsYXRlIHdoaWNoIGludGVycG9sYXRpb24gc3R5bGUgdG8gdXNlIGFzIGRlZmF1bHQsIGFwcGxpY2F0aW9uLXdpZGUuXG4gICAqIFNpbXBseSBwYXNzIGEgZmFjdG9yeS9zZXJ2aWNlIG5hbWUuIFRoZSBpbnRlcnBvbGF0aW9uIHNlcnZpY2UgaGFzIHRvIGltcGxlbWVudFxuICAgKiB0aGUgY29ycmVjdCBpbnRlcmZhY2UuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBmYWN0b3J5IEludGVycG9sYXRpb24gc2VydmljZSBuYW1lLlxuICAgKi9cbiAgdGhpcy51c2VJbnRlcnBvbGF0aW9uID0gZnVuY3Rpb24gKGZhY3RvcnkpIHtcbiAgICAkaW50ZXJwb2xhdGlvbkZhY3RvcnkgPSBmYWN0b3J5O1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIC8qKlxuICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICogQG5hbWUgcGFzY2FscHJlY2h0LnRyYW5zbGF0ZS4kdHJhbnNsYXRlUHJvdmlkZXIjdXNlU2FuaXRpemVTdHJhdGVneVxuICAgKiBAbWV0aG9kT2YgcGFzY2FscHJlY2h0LnRyYW5zbGF0ZS4kdHJhbnNsYXRlUHJvdmlkZXJcbiAgICpcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqIFNpbXBseSBzZXRzIGEgc2FuaXRhdGlvbiBzdHJhdGVneSB0eXBlLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgU3RyYXRlZ3kgdHlwZS5cbiAgICovXG4gIHRoaXMudXNlU2FuaXRpemVWYWx1ZVN0cmF0ZWd5ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgJHRyYW5zbGF0ZVNhbml0aXphdGlvblByb3ZpZGVyLnVzZVN0cmF0ZWd5KHZhbHVlKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuIC8qKlxuICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICogQG5hbWUgcGFzY2FscHJlY2h0LnRyYW5zbGF0ZS4kdHJhbnNsYXRlUHJvdmlkZXIjcHJlZmVycmVkTGFuZ3VhZ2VcbiAgICogQG1ldGhvZE9mIHBhc2NhbHByZWNodC50cmFuc2xhdGUuJHRyYW5zbGF0ZVByb3ZpZGVyXG4gICAqXG4gICAqIEBkZXNjcmlwdGlvblxuICAgKiBUZWxscyB0aGUgbW9kdWxlIHdoaWNoIG9mIHRoZSByZWdpc3RlcmVkIHRyYW5zbGF0aW9uIHRhYmxlcyB0byB1c2UgZm9yIHRyYW5zbGF0aW9uXG4gICAqIGF0IGluaXRpYWwgc3RhcnR1cCBieSBwYXNzaW5nIGEgbGFuZ3VhZ2Uga2V5LiBTaW1pbGFyIHRvIGAkdHJhbnNsYXRlUHJvdmlkZXIjdXNlYFxuICAgKiBvbmx5IHRoYXQgaXQgc2F5cyB3aGljaCBsYW5ndWFnZSB0byAqKnByZWZlcioqLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gbGFuZ0tleSBBIGxhbmd1YWdlIGtleS5cbiAgICpcbiAgICovXG4gIHRoaXMucHJlZmVycmVkTGFuZ3VhZ2UgPSBmdW5jdGlvbihsYW5nS2V5KSB7XG4gICAgc2V0dXBQcmVmZXJyZWRMYW5ndWFnZShsYW5nS2V5KTtcbiAgICByZXR1cm4gdGhpcztcblxuICB9O1xuICB2YXIgc2V0dXBQcmVmZXJyZWRMYW5ndWFnZSA9IGZ1bmN0aW9uIChsYW5nS2V5KSB7XG4gICAgaWYgKGxhbmdLZXkpIHtcbiAgICAgICRwcmVmZXJyZWRMYW5ndWFnZSA9IGxhbmdLZXk7XG4gICAgfVxuICAgIHJldHVybiAkcHJlZmVycmVkTGFuZ3VhZ2U7XG4gIH07XG4gIC8qKlxuICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICogQG5hbWUgcGFzY2FscHJlY2h0LnRyYW5zbGF0ZS4kdHJhbnNsYXRlUHJvdmlkZXIjdHJhbnNsYXRpb25Ob3RGb3VuZEluZGljYXRvclxuICAgKiBAbWV0aG9kT2YgcGFzY2FscHJlY2h0LnRyYW5zbGF0ZS4kdHJhbnNsYXRlUHJvdmlkZXJcbiAgICpcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqIFNldHMgYW4gaW5kaWNhdG9yIHdoaWNoIGlzIHVzZWQgd2hlbiBhIHRyYW5zbGF0aW9uIGlzbid0IGZvdW5kLiBFLmcuIHdoZW5cbiAgICogc2V0dGluZyB0aGUgaW5kaWNhdG9yIGFzICdYJyBhbmQgb25lIHRyaWVzIHRvIHRyYW5zbGF0ZSBhIHRyYW5zbGF0aW9uIGlkXG4gICAqIGNhbGxlZCBgTk9UX0ZPVU5EYCwgdGhpcyB3aWxsIHJlc3VsdCBpbiBgWCBOT1RfRk9VTkQgWGAuXG4gICAqXG4gICAqIEludGVybmFsbHkgdGhpcyBtZXRob2RzIHNldHMgYSBsZWZ0IGluZGljYXRvciBhbmQgYSByaWdodCBpbmRpY2F0b3IgdXNpbmdcbiAgICogYCR0cmFuc2xhdGVQcm92aWRlci50cmFuc2xhdGlvbk5vdEZvdW5kSW5kaWNhdG9yTGVmdCgpYCBhbmRcbiAgICogYCR0cmFuc2xhdGVQcm92aWRlci50cmFuc2xhdGlvbk5vdEZvdW5kSW5kaWNhdG9yUmlnaHQoKWAuXG4gICAqXG4gICAqICoqTm90ZSoqOiBUaGVzZSBtZXRob2RzIGF1dG9tYXRpY2FsbHkgYWRkIGEgd2hpdGVzcGFjZSBiZXR3ZWVuIHRoZSBpbmRpY2F0b3JzXG4gICAqIGFuZCB0aGUgdHJhbnNsYXRpb24gaWQuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBpbmRpY2F0b3IgQW4gaW5kaWNhdG9yLCBjb3VsZCBiZSBhbnkgc3RyaW5nLlxuICAgKi9cbiAgdGhpcy50cmFuc2xhdGlvbk5vdEZvdW5kSW5kaWNhdG9yID0gZnVuY3Rpb24gKGluZGljYXRvcikge1xuICAgIHRoaXMudHJhbnNsYXRpb25Ob3RGb3VuZEluZGljYXRvckxlZnQoaW5kaWNhdG9yKTtcbiAgICB0aGlzLnRyYW5zbGF0aW9uTm90Rm91bmRJbmRpY2F0b3JSaWdodChpbmRpY2F0b3IpO1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIC8qKlxuICAgKiBuZ2RvYyBmdW5jdGlvblxuICAgKiBAbmFtZSBwYXNjYWxwcmVjaHQudHJhbnNsYXRlLiR0cmFuc2xhdGVQcm92aWRlciN0cmFuc2xhdGlvbk5vdEZvdW5kSW5kaWNhdG9yTGVmdFxuICAgKiBAbWV0aG9kT2YgcGFzY2FscHJlY2h0LnRyYW5zbGF0ZS4kdHJhbnNsYXRlUHJvdmlkZXJcbiAgICpcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqIFNldHMgYW4gaW5kaWNhdG9yIHdoaWNoIGlzIHVzZWQgd2hlbiBhIHRyYW5zbGF0aW9uIGlzbid0IGZvdW5kIGxlZnQgdG8gdGhlXG4gICAqIHRyYW5zbGF0aW9uIGlkLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gaW5kaWNhdG9yIEFuIGluZGljYXRvci5cbiAgICovXG4gIHRoaXMudHJhbnNsYXRpb25Ob3RGb3VuZEluZGljYXRvckxlZnQgPSBmdW5jdGlvbiAoaW5kaWNhdG9yKSB7XG4gICAgaWYgKCFpbmRpY2F0b3IpIHtcbiAgICAgIHJldHVybiAkbm90Rm91bmRJbmRpY2F0b3JMZWZ0O1xuICAgIH1cbiAgICAkbm90Rm91bmRJbmRpY2F0b3JMZWZ0ID0gaW5kaWNhdG9yO1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIC8qKlxuICAgKiBuZ2RvYyBmdW5jdGlvblxuICAgKiBAbmFtZSBwYXNjYWxwcmVjaHQudHJhbnNsYXRlLiR0cmFuc2xhdGVQcm92aWRlciN0cmFuc2xhdGlvbk5vdEZvdW5kSW5kaWNhdG9yTGVmdFxuICAgKiBAbWV0aG9kT2YgcGFzY2FscHJlY2h0LnRyYW5zbGF0ZS4kdHJhbnNsYXRlUHJvdmlkZXJcbiAgICpcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqIFNldHMgYW4gaW5kaWNhdG9yIHdoaWNoIGlzIHVzZWQgd2hlbiBhIHRyYW5zbGF0aW9uIGlzbid0IGZvdW5kIHJpZ2h0IHRvIHRoZVxuICAgKiB0cmFuc2xhdGlvbiBpZC5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IGluZGljYXRvciBBbiBpbmRpY2F0b3IuXG4gICAqL1xuICB0aGlzLnRyYW5zbGF0aW9uTm90Rm91bmRJbmRpY2F0b3JSaWdodCA9IGZ1bmN0aW9uIChpbmRpY2F0b3IpIHtcbiAgICBpZiAoIWluZGljYXRvcikge1xuICAgICAgcmV0dXJuICRub3RGb3VuZEluZGljYXRvclJpZ2h0O1xuICAgIH1cbiAgICAkbm90Rm91bmRJbmRpY2F0b3JSaWdodCA9IGluZGljYXRvcjtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICAvKipcbiAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAqIEBuYW1lIHBhc2NhbHByZWNodC50cmFuc2xhdGUuJHRyYW5zbGF0ZVByb3ZpZGVyI2ZhbGxiYWNrTGFuZ3VhZ2VcbiAgICogQG1ldGhvZE9mIHBhc2NhbHByZWNodC50cmFuc2xhdGUuJHRyYW5zbGF0ZVByb3ZpZGVyXG4gICAqXG4gICAqIEBkZXNjcmlwdGlvblxuICAgKiBUZWxscyB0aGUgbW9kdWxlIHdoaWNoIG9mIHRoZSByZWdpc3RlcmVkIHRyYW5zbGF0aW9uIHRhYmxlcyB0byB1c2Ugd2hlbiBtaXNzaW5nIHRyYW5zbGF0aW9uc1xuICAgKiBhdCBpbml0aWFsIHN0YXJ0dXAgYnkgcGFzc2luZyBhIGxhbmd1YWdlIGtleS4gU2ltaWxhciB0byBgJHRyYW5zbGF0ZVByb3ZpZGVyI3VzZWBcbiAgICogb25seSB0aGF0IGl0IHNheXMgd2hpY2ggbGFuZ3VhZ2UgdG8gKipmYWxsYmFjayoqLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ3x8YXJyYXl9IGxhbmdLZXkgQSBsYW5ndWFnZSBrZXkuXG4gICAqXG4gICAqL1xuICB0aGlzLmZhbGxiYWNrTGFuZ3VhZ2UgPSBmdW5jdGlvbiAobGFuZ0tleSkge1xuICAgIGZhbGxiYWNrU3RhY2sobGFuZ0tleSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgdmFyIGZhbGxiYWNrU3RhY2sgPSBmdW5jdGlvbiAobGFuZ0tleSkge1xuICAgIGlmIChsYW5nS2V5KSB7XG4gICAgICBpZiAoYW5ndWxhci5pc1N0cmluZyhsYW5nS2V5KSkge1xuICAgICAgICAkZmFsbGJhY2tXYXNTdHJpbmcgPSB0cnVlO1xuICAgICAgICAkZmFsbGJhY2tMYW5ndWFnZSA9IFsgbGFuZ0tleSBdO1xuICAgICAgfSBlbHNlIGlmIChhbmd1bGFyLmlzQXJyYXkobGFuZ0tleSkpIHtcbiAgICAgICAgJGZhbGxiYWNrV2FzU3RyaW5nID0gZmFsc2U7XG4gICAgICAgICRmYWxsYmFja0xhbmd1YWdlID0gbGFuZ0tleTtcbiAgICAgIH1cbiAgICAgIGlmIChhbmd1bGFyLmlzU3RyaW5nKCRwcmVmZXJyZWRMYW5ndWFnZSkgICYmIGluZGV4T2YoJGZhbGxiYWNrTGFuZ3VhZ2UsICRwcmVmZXJyZWRMYW5ndWFnZSkgPCAwKSB7XG4gICAgICAgICRmYWxsYmFja0xhbmd1YWdlLnB1c2goJHByZWZlcnJlZExhbmd1YWdlKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICgkZmFsbGJhY2tXYXNTdHJpbmcpIHtcbiAgICAgICAgcmV0dXJuICRmYWxsYmFja0xhbmd1YWdlWzBdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuICRmYWxsYmFja0xhbmd1YWdlO1xuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAqIEBuYW1lIHBhc2NhbHByZWNodC50cmFuc2xhdGUuJHRyYW5zbGF0ZVByb3ZpZGVyI3VzZVxuICAgKiBAbWV0aG9kT2YgcGFzY2FscHJlY2h0LnRyYW5zbGF0ZS4kdHJhbnNsYXRlUHJvdmlkZXJcbiAgICpcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqIFNldCB3aGljaCB0cmFuc2xhdGlvbiB0YWJsZSB0byB1c2UgZm9yIHRyYW5zbGF0aW9uIGJ5IGdpdmVuIGxhbmd1YWdlIGtleS4gV2hlblxuICAgKiB0cnlpbmcgdG8gJ3VzZScgYSBsYW5ndWFnZSB3aGljaCBpc24ndCBwcm92aWRlZCwgaXQnbGwgdGhyb3cgYW4gZXJyb3IuXG4gICAqXG4gICAqIFlvdSBhY3R1YWxseSBkb24ndCBoYXZlIHRvIHVzZSB0aGlzIG1ldGhvZCBzaW5jZSBgJHRyYW5zbGF0ZVByb3ZpZGVyI3ByZWZlcnJlZExhbmd1YWdlYFxuICAgKiBkb2VzIHRoZSBqb2IgdG9vLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gbGFuZ0tleSBBIGxhbmd1YWdlIGtleS5cbiAgICovXG4gIHRoaXMudXNlID0gZnVuY3Rpb24gKGxhbmdLZXkpIHtcbiAgICBpZiAobGFuZ0tleSkge1xuICAgICAgaWYgKCEkdHJhbnNsYXRpb25UYWJsZVtsYW5nS2V5XSAmJiAoISRsb2FkZXJGYWN0b3J5KSkge1xuICAgICAgICAvLyBvbmx5IHRocm93IGFuIGVycm9yLCB3aGVuIG5vdCBsb2FkaW5nIHRyYW5zbGF0aW9uIGRhdGEgYXN5bmNocm9ub3VzbHlcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCckdHJhbnNsYXRlUHJvdmlkZXIgY291bGRuXFwndCBmaW5kIHRyYW5zbGF0aW9uVGFibGUgZm9yIGxhbmdLZXk6IFxcJycgKyBsYW5nS2V5ICsgJ1xcJycpO1xuICAgICAgfVxuICAgICAgJHVzZXMgPSBsYW5nS2V5O1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHJldHVybiAkdXNlcztcbiAgfTtcblxuIC8qKlxuICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICogQG5hbWUgcGFzY2FscHJlY2h0LnRyYW5zbGF0ZS4kdHJhbnNsYXRlUHJvdmlkZXIjc3RvcmFnZUtleVxuICAgKiBAbWV0aG9kT2YgcGFzY2FscHJlY2h0LnRyYW5zbGF0ZS4kdHJhbnNsYXRlUHJvdmlkZXJcbiAgICpcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqIFRlbGxzIHRoZSBtb2R1bGUgd2hpY2gga2V5IG11c3QgcmVwcmVzZW50IHRoZSBjaG9vc2VkIGxhbmd1YWdlIGJ5IGEgdXNlciBpbiB0aGUgc3RvcmFnZS5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IGtleSBBIGtleSBmb3IgdGhlIHN0b3JhZ2UuXG4gICAqL1xuICB2YXIgc3RvcmFnZUtleSA9IGZ1bmN0aW9uKGtleSkge1xuICAgIGlmICgha2V5KSB7XG4gICAgICBpZiAoJHN0b3JhZ2VQcmVmaXgpIHtcbiAgICAgICAgcmV0dXJuICRzdG9yYWdlUHJlZml4ICsgJHN0b3JhZ2VLZXk7XG4gICAgICB9XG4gICAgICByZXR1cm4gJHN0b3JhZ2VLZXk7XG4gICAgfVxuICAgICRzdG9yYWdlS2V5ID0ga2V5O1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIHRoaXMuc3RvcmFnZUtleSA9IHN0b3JhZ2VLZXk7XG5cbiAgLyoqXG4gICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgKiBAbmFtZSBwYXNjYWxwcmVjaHQudHJhbnNsYXRlLiR0cmFuc2xhdGVQcm92aWRlciN1c2VVcmxMb2FkZXJcbiAgICogQG1ldGhvZE9mIHBhc2NhbHByZWNodC50cmFuc2xhdGUuJHRyYW5zbGF0ZVByb3ZpZGVyXG4gICAqXG4gICAqIEBkZXNjcmlwdGlvblxuICAgKiBUZWxscyBhbmd1bGFyLXRyYW5zbGF0ZSB0byB1c2UgYCR0cmFuc2xhdGVVcmxMb2FkZXJgIGV4dGVuc2lvbiBzZXJ2aWNlIGFzIGxvYWRlci5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHVybCBVcmxcbiAgICogQHBhcmFtIHtPYmplY3Q9fSBvcHRpb25zIE9wdGlvbmFsIGNvbmZpZ3VyYXRpb24gb2JqZWN0XG4gICAqL1xuICB0aGlzLnVzZVVybExvYWRlciA9IGZ1bmN0aW9uICh1cmwsIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gdGhpcy51c2VMb2FkZXIoJyR0cmFuc2xhdGVVcmxMb2FkZXInLCBhbmd1bGFyLmV4dGVuZCh7IHVybDogdXJsIH0sIG9wdGlvbnMpKTtcbiAgfTtcblxuICAvKipcbiAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAqIEBuYW1lIHBhc2NhbHByZWNodC50cmFuc2xhdGUuJHRyYW5zbGF0ZVByb3ZpZGVyI3VzZVN0YXRpY0ZpbGVzTG9hZGVyXG4gICAqIEBtZXRob2RPZiBwYXNjYWxwcmVjaHQudHJhbnNsYXRlLiR0cmFuc2xhdGVQcm92aWRlclxuICAgKlxuICAgKiBAZGVzY3JpcHRpb25cbiAgICogVGVsbHMgYW5ndWxhci10cmFuc2xhdGUgdG8gdXNlIGAkdHJhbnNsYXRlU3RhdGljRmlsZXNMb2FkZXJgIGV4dGVuc2lvbiBzZXJ2aWNlIGFzIGxvYWRlci5cbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3Q9fSBvcHRpb25zIE9wdGlvbmFsIGNvbmZpZ3VyYXRpb24gb2JqZWN0XG4gICAqL1xuICB0aGlzLnVzZVN0YXRpY0ZpbGVzTG9hZGVyID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICByZXR1cm4gdGhpcy51c2VMb2FkZXIoJyR0cmFuc2xhdGVTdGF0aWNGaWxlc0xvYWRlcicsIG9wdGlvbnMpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICogQG5hbWUgcGFzY2FscHJlY2h0LnRyYW5zbGF0ZS4kdHJhbnNsYXRlUHJvdmlkZXIjdXNlTG9hZGVyXG4gICAqIEBtZXRob2RPZiBwYXNjYWxwcmVjaHQudHJhbnNsYXRlLiR0cmFuc2xhdGVQcm92aWRlclxuICAgKlxuICAgKiBAZGVzY3JpcHRpb25cbiAgICogVGVsbHMgYW5ndWxhci10cmFuc2xhdGUgdG8gdXNlIGFueSBvdGhlciBzZXJ2aWNlIGFzIGxvYWRlci5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IGxvYWRlckZhY3RvcnkgRmFjdG9yeSBuYW1lIHRvIHVzZVxuICAgKiBAcGFyYW0ge09iamVjdD19IG9wdGlvbnMgT3B0aW9uYWwgY29uZmlndXJhdGlvbiBvYmplY3RcbiAgICovXG4gIHRoaXMudXNlTG9hZGVyID0gZnVuY3Rpb24gKGxvYWRlckZhY3RvcnksIG9wdGlvbnMpIHtcbiAgICAkbG9hZGVyRmFjdG9yeSA9IGxvYWRlckZhY3Rvcnk7XG4gICAgJGxvYWRlck9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIC8qKlxuICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICogQG5hbWUgcGFzY2FscHJlY2h0LnRyYW5zbGF0ZS4kdHJhbnNsYXRlUHJvdmlkZXIjdXNlTG9jYWxTdG9yYWdlXG4gICAqIEBtZXRob2RPZiBwYXNjYWxwcmVjaHQudHJhbnNsYXRlLiR0cmFuc2xhdGVQcm92aWRlclxuICAgKlxuICAgKiBAZGVzY3JpcHRpb25cbiAgICogVGVsbHMgYW5ndWxhci10cmFuc2xhdGUgdG8gdXNlIGAkdHJhbnNsYXRlTG9jYWxTdG9yYWdlYCBzZXJ2aWNlIGFzIHN0b3JhZ2UgbGF5ZXIuXG4gICAqXG4gICAqL1xuICB0aGlzLnVzZUxvY2FsU3RvcmFnZSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy51c2VTdG9yYWdlKCckdHJhbnNsYXRlTG9jYWxTdG9yYWdlJyk7XG4gIH07XG5cbiAgLyoqXG4gICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgKiBAbmFtZSBwYXNjYWxwcmVjaHQudHJhbnNsYXRlLiR0cmFuc2xhdGVQcm92aWRlciN1c2VDb29raWVTdG9yYWdlXG4gICAqIEBtZXRob2RPZiBwYXNjYWxwcmVjaHQudHJhbnNsYXRlLiR0cmFuc2xhdGVQcm92aWRlclxuICAgKlxuICAgKiBAZGVzY3JpcHRpb25cbiAgICogVGVsbHMgYW5ndWxhci10cmFuc2xhdGUgdG8gdXNlIGAkdHJhbnNsYXRlQ29va2llU3RvcmFnZWAgc2VydmljZSBhcyBzdG9yYWdlIGxheWVyLlxuICAgKi9cbiAgdGhpcy51c2VDb29raWVTdG9yYWdlID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLnVzZVN0b3JhZ2UoJyR0cmFuc2xhdGVDb29raWVTdG9yYWdlJyk7XG4gIH07XG5cbiAgLyoqXG4gICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgKiBAbmFtZSBwYXNjYWxwcmVjaHQudHJhbnNsYXRlLiR0cmFuc2xhdGVQcm92aWRlciN1c2VTdG9yYWdlXG4gICAqIEBtZXRob2RPZiBwYXNjYWxwcmVjaHQudHJhbnNsYXRlLiR0cmFuc2xhdGVQcm92aWRlclxuICAgKlxuICAgKiBAZGVzY3JpcHRpb25cbiAgICogVGVsbHMgYW5ndWxhci10cmFuc2xhdGUgdG8gdXNlIGN1c3RvbSBzZXJ2aWNlIGFzIHN0b3JhZ2UgbGF5ZXIuXG4gICAqL1xuICB0aGlzLnVzZVN0b3JhZ2UgPSBmdW5jdGlvbiAoc3RvcmFnZUZhY3RvcnkpIHtcbiAgICAkc3RvcmFnZUZhY3RvcnkgPSBzdG9yYWdlRmFjdG9yeTtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICAvKipcbiAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAqIEBuYW1lIHBhc2NhbHByZWNodC50cmFuc2xhdGUuJHRyYW5zbGF0ZVByb3ZpZGVyI3N0b3JhZ2VQcmVmaXhcbiAgICogQG1ldGhvZE9mIHBhc2NhbHByZWNodC50cmFuc2xhdGUuJHRyYW5zbGF0ZVByb3ZpZGVyXG4gICAqXG4gICAqIEBkZXNjcmlwdGlvblxuICAgKiBTZXRzIHByZWZpeCBmb3Igc3RvcmFnZSBrZXkuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBwcmVmaXggU3RvcmFnZSBrZXkgcHJlZml4XG4gICAqL1xuICB0aGlzLnN0b3JhZ2VQcmVmaXggPSBmdW5jdGlvbiAocHJlZml4KSB7XG4gICAgaWYgKCFwcmVmaXgpIHtcbiAgICAgIHJldHVybiBwcmVmaXg7XG4gICAgfVxuICAgICRzdG9yYWdlUHJlZml4ID0gcHJlZml4O1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIC8qKlxuICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICogQG5hbWUgcGFzY2FscHJlY2h0LnRyYW5zbGF0ZS4kdHJhbnNsYXRlUHJvdmlkZXIjdXNlTWlzc2luZ1RyYW5zbGF0aW9uSGFuZGxlckxvZ1xuICAgKiBAbWV0aG9kT2YgcGFzY2FscHJlY2h0LnRyYW5zbGF0ZS4kdHJhbnNsYXRlUHJvdmlkZXJcbiAgICpcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqIFRlbGxzIGFuZ3VsYXItdHJhbnNsYXRlIHRvIHVzZSBidWlsdC1pbiBsb2cgaGFuZGxlciB3aGVuIHRyeWluZyB0byB0cmFuc2xhdGVcbiAgICogYSB0cmFuc2xhdGlvbiBJZCB3aGljaCBkb2Vzbid0IGV4aXN0LlxuICAgKlxuICAgKiBUaGlzIGlzIGFjdHVhbGx5IGEgc2hvcnRjdXQgbWV0aG9kIGZvciBgdXNlTWlzc2luZ1RyYW5zbGF0aW9uSGFuZGxlcigpYC5cbiAgICpcbiAgICovXG4gIHRoaXMudXNlTWlzc2luZ1RyYW5zbGF0aW9uSGFuZGxlckxvZyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy51c2VNaXNzaW5nVHJhbnNsYXRpb25IYW5kbGVyKCckdHJhbnNsYXRlTWlzc2luZ1RyYW5zbGF0aW9uSGFuZGxlckxvZycpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICogQG5hbWUgcGFzY2FscHJlY2h0LnRyYW5zbGF0ZS4kdHJhbnNsYXRlUHJvdmlkZXIjdXNlTWlzc2luZ1RyYW5zbGF0aW9uSGFuZGxlclxuICAgKiBAbWV0aG9kT2YgcGFzY2FscHJlY2h0LnRyYW5zbGF0ZS4kdHJhbnNsYXRlUHJvdmlkZXJcbiAgICpcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqIEV4cGVjdHMgYSBmYWN0b3J5IG5hbWUgd2hpY2ggbGF0ZXIgZ2V0cyBpbnN0YW50aWF0ZWQgd2l0aCBgJGluamVjdG9yYC5cbiAgICogVGhpcyBtZXRob2QgY2FuIGJlIHVzZWQgdG8gdGVsbCBhbmd1bGFyLXRyYW5zbGF0ZSB0byB1c2UgYSBjdXN0b21cbiAgICogbWlzc2luZ1RyYW5zbGF0aW9uSGFuZGxlci4gSnVzdCBidWlsZCBhIGZhY3Rvcnkgd2hpY2ggcmV0dXJucyBhIGZ1bmN0aW9uXG4gICAqIGFuZCBleHBlY3RzIGEgdHJhbnNsYXRpb24gaWQgYXMgYXJndW1lbnQuXG4gICAqXG4gICAqIEV4YW1wbGU6XG4gICAqIDxwcmU+XG4gICAqICBhcHAuY29uZmlnKGZ1bmN0aW9uICgkdHJhbnNsYXRlUHJvdmlkZXIpIHtcbiAgICogICAgJHRyYW5zbGF0ZVByb3ZpZGVyLnVzZU1pc3NpbmdUcmFuc2xhdGlvbkhhbmRsZXIoJ2N1c3RvbUhhbmRsZXInKTtcbiAgICogIH0pO1xuICAgKlxuICAgKiAgYXBwLmZhY3RvcnkoJ2N1c3RvbUhhbmRsZXInLCBmdW5jdGlvbiAoZGVwMSwgZGVwMikge1xuICAgKiAgICByZXR1cm4gZnVuY3Rpb24gKHRyYW5zbGF0aW9uSWQpIHtcbiAgICogICAgICAvLyBzb21ldGhpbmcgd2l0aCB0cmFuc2xhdGlvbklkIGFuZCBkZXAxIGFuZCBkZXAyXG4gICAqICAgIH07XG4gICAqICB9KTtcbiAgICogPC9wcmU+XG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBmYWN0b3J5IEZhY3RvcnkgbmFtZVxuICAgKi9cbiAgdGhpcy51c2VNaXNzaW5nVHJhbnNsYXRpb25IYW5kbGVyID0gZnVuY3Rpb24gKGZhY3RvcnkpIHtcbiAgICAkbWlzc2luZ1RyYW5zbGF0aW9uSGFuZGxlckZhY3RvcnkgPSBmYWN0b3J5O1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIC8qKlxuICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICogQG5hbWUgcGFzY2FscHJlY2h0LnRyYW5zbGF0ZS4kdHJhbnNsYXRlUHJvdmlkZXIjdXNlUG9zdENvbXBpbGluZ1xuICAgKiBAbWV0aG9kT2YgcGFzY2FscHJlY2h0LnRyYW5zbGF0ZS4kdHJhbnNsYXRlUHJvdmlkZXJcbiAgICpcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqIElmIHBvc3QgY29tcGlsaW5nIGlzIGVuYWJsZWQsIGFsbCB0cmFuc2xhdGVkIHZhbHVlcyB3aWxsIGJlIHByb2Nlc3NlZFxuICAgKiBhZ2FpbiB3aXRoIEFuZ3VsYXJKUycgJGNvbXBpbGUuXG4gICAqXG4gICAqIEV4YW1wbGU6XG4gICAqIDxwcmU+XG4gICAqICBhcHAuY29uZmlnKGZ1bmN0aW9uICgkdHJhbnNsYXRlUHJvdmlkZXIpIHtcbiAgICogICAgJHRyYW5zbGF0ZVByb3ZpZGVyLnVzZVBvc3RDb21waWxpbmcodHJ1ZSk7XG4gICAqICB9KTtcbiAgICogPC9wcmU+XG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBmYWN0b3J5IEZhY3RvcnkgbmFtZVxuICAgKi9cbiAgdGhpcy51c2VQb3N0Q29tcGlsaW5nID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgJHBvc3RDb21waWxpbmdFbmFibGVkID0gISghdmFsdWUpO1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIC8qKlxuICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICogQG5hbWUgcGFzY2FscHJlY2h0LnRyYW5zbGF0ZS4kdHJhbnNsYXRlUHJvdmlkZXIjZm9yY2VBc3luY1JlbG9hZFxuICAgKiBAbWV0aG9kT2YgcGFzY2FscHJlY2h0LnRyYW5zbGF0ZS4kdHJhbnNsYXRlUHJvdmlkZXJcbiAgICpcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqIElmIGZvcmNlIGFzeW5jIHJlbG9hZCBpcyBlbmFibGVkLCBhc3luYyBsb2FkZXIgd2lsbCBhbHdheXMgYmUgY2FsbGVkXG4gICAqIGV2ZW4gaWYgJHRyYW5zbGF0aW9uVGFibGUgYWxyZWFkeSBjb250YWlucyB0aGUgbGFuZ3VhZ2Uga2V5LCBhZGRpbmdcbiAgICogcG9zc2libGUgbmV3IGVudHJpZXMgdG8gdGhlICR0cmFuc2xhdGlvblRhYmxlLlxuICAgKlxuICAgKiBFeGFtcGxlOlxuICAgKiA8cHJlPlxuICAgKiAgYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHRyYW5zbGF0ZVByb3ZpZGVyKSB7XG4gICAqICAgICR0cmFuc2xhdGVQcm92aWRlci5mb3JjZUFzeW5jUmVsb2FkKHRydWUpO1xuICAgKiAgfSk7XG4gICAqIDwvcHJlPlxuICAgKlxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IHZhbHVlIC0gdmFsaWQgdmFsdWVzIGFyZSB0cnVlIG9yIGZhbHNlXG4gICAqL1xuICB0aGlzLmZvcmNlQXN5bmNSZWxvYWQgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAkZm9yY2VBc3luY1JlbG9hZEVuYWJsZWQgPSAhKCF2YWx1ZSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgLyoqXG4gICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgKiBAbmFtZSBwYXNjYWxwcmVjaHQudHJhbnNsYXRlLiR0cmFuc2xhdGVQcm92aWRlciN1bmlmb3JtTGFuZ3VhZ2VUYWdcbiAgICogQG1ldGhvZE9mIHBhc2NhbHByZWNodC50cmFuc2xhdGUuJHRyYW5zbGF0ZVByb3ZpZGVyXG4gICAqXG4gICAqIEBkZXNjcmlwdGlvblxuICAgKiBUZWxscyBhbmd1bGFyLXRyYW5zbGF0ZSB3aGljaCBsYW5ndWFnZSB0YWcgc2hvdWxkIGJlIHVzZWQgYXMgYSByZXN1bHQgd2hlbiBkZXRlcm1pbmluZ1xuICAgKiB0aGUgY3VycmVudCBicm93c2VyIGxhbmd1YWdlLlxuICAgKlxuICAgKiBUaGlzIHNldHRpbmcgbXVzdCBiZSBzZXQgYmVmb3JlIGludm9raW5nIHtAbGluayBwYXNjYWxwcmVjaHQudHJhbnNsYXRlLiR0cmFuc2xhdGVQcm92aWRlciNtZXRob2RzX2RldGVybWluZVByZWZlcnJlZExhbmd1YWdlIGRldGVybWluZVByZWZlcnJlZExhbmd1YWdlKCl9LlxuICAgKlxuICAgKiA8cHJlPlxuICAgKiAkdHJhbnNsYXRlUHJvdmlkZXJcbiAgICogICAudW5pZm9ybUxhbmd1YWdlVGFnKCdiY3A0NycpXG4gICAqICAgLmRldGVybWluZVByZWZlcnJlZExhbmd1YWdlKClcbiAgICogPC9wcmU+XG4gICAqXG4gICAqIFRoZSByZXNvbHZlciBjdXJyZW50bHkgc3VwcG9ydHM6XG4gICAqICogZGVmYXVsdFxuICAgKiAgICAgKHRyYWRpdGlvbmFsbHk6IGh5cGhlbnMgd2lsbCBiZSBjb252ZXJ0ZWQgaW50byB1bmRlcnNjb3JlcywgaS5lLiBlbi1VUyA9PiBlbl9VUylcbiAgICogICAgIGVuLVVTID0+IGVuX1VTXG4gICAqICAgICBlbl9VUyA9PiBlbl9VU1xuICAgKiAgICAgZW4tdXMgPT4gZW5fdXNcbiAgICogKiBqYXZhXG4gICAqICAgICBsaWtlIGRlZmF1bHQsIGJ1dCB0aGUgc2Vjb25kIHBhcnQgd2lsbCBiZSBhbHdheXMgaW4gdXBwZXJjYXNlXG4gICAqICAgICBlbi1VUyA9PiBlbl9VU1xuICAgKiAgICAgZW5fVVMgPT4gZW5fVVNcbiAgICogICAgIGVuLXVzID0+IGVuX1VTXG4gICAqICogQkNQIDQ3IChSRkMgNDY0NiAmIDQ2NDcpXG4gICAqICAgICBlbi1VUyA9PiBlbi1VU1xuICAgKiAgICAgZW5fVVMgPT4gZW4tVVNcbiAgICogICAgIGVuLXVzID0+IGVuLVVTXG4gICAqXG4gICAqIFNlZSBhbHNvOlxuICAgKiAqIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvSUVURl9sYW5ndWFnZV90YWdcbiAgICogKiBodHRwOi8vd3d3LnczLm9yZy9JbnRlcm5hdGlvbmFsL2NvcmUvbGFuZ3RhZ3MvXG4gICAqICogaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvYmNwNDdcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fSBvcHRpb25zIC0gb3B0aW9ucyAob3Igc3RhbmRhcmQpXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBvcHRpb25zLnN0YW5kYXJkIC0gdmFsaWQgdmFsdWVzIGFyZSAnZGVmYXVsdCcsICdiY3A0NycsICdqYXZhJ1xuICAgKi9cbiAgdGhpcy51bmlmb3JtTGFuZ3VhZ2VUYWcgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuXG4gICAgaWYgKCFvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0ge307XG4gICAgfSBlbHNlIGlmIChhbmd1bGFyLmlzU3RyaW5nKG9wdGlvbnMpKSB7XG4gICAgICBvcHRpb25zID0ge1xuICAgICAgICBzdGFuZGFyZDogb3B0aW9uc1xuICAgICAgfTtcbiAgICB9XG5cbiAgICB1bmlmb3JtTGFuZ3VhZ2VUYWdSZXNvbHZlciA9IG9wdGlvbnMuc3RhbmRhcmQ7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICAvKipcbiAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAqIEBuYW1lIHBhc2NhbHByZWNodC50cmFuc2xhdGUuJHRyYW5zbGF0ZVByb3ZpZGVyI2RldGVybWluZVByZWZlcnJlZExhbmd1YWdlXG4gICAqIEBtZXRob2RPZiBwYXNjYWxwcmVjaHQudHJhbnNsYXRlLiR0cmFuc2xhdGVQcm92aWRlclxuICAgKlxuICAgKiBAZGVzY3JpcHRpb25cbiAgICogVGVsbHMgYW5ndWxhci10cmFuc2xhdGUgdG8gdHJ5IHRvIGRldGVybWluZSBvbiBpdHMgb3duIHdoaWNoIGxhbmd1YWdlIGtleVxuICAgKiB0byBzZXQgYXMgcHJlZmVycmVkIGxhbmd1YWdlLiBXaGVuIGBmbmAgaXMgZ2l2ZW4sIGFuZ3VsYXItdHJhbnNsYXRlIHVzZXMgaXRcbiAgICogdG8gZGV0ZXJtaW5lIGEgbGFuZ3VhZ2Uga2V5LCBvdGhlcndpc2UgaXQgdXNlcyB0aGUgYnVpbHQtaW4gYGdldExvY2FsZSgpYFxuICAgKiBtZXRob2QuXG4gICAqXG4gICAqIFRoZSBgZ2V0TG9jYWxlKClgIHJldHVybnMgYSBsYW5ndWFnZSBrZXkgaW4gdGhlIGZvcm1hdCBgW2xhbmddX1tjb3VudHJ5XWAgb3JcbiAgICogYFtsYW5nXWAgZGVwZW5kaW5nIG9uIHdoYXQgdGhlIGJyb3dzZXIgcHJvdmlkZXMuXG4gICAqXG4gICAqIFVzZSB0aGlzIG1ldGhvZCBhdCB5b3VyIG93biByaXNrLCBzaW5jZSBub3QgYWxsIGJyb3dzZXJzIHJldHVybiBhIHZhbGlkXG4gICAqIGxvY2FsZSAoc2VlIHtAbGluayBwYXNjYWxwcmVjaHQudHJhbnNsYXRlLiR0cmFuc2xhdGVQcm92aWRlciNtZXRob2RzX3VuaWZvcm1MYW5ndWFnZVRhZyB1bmlmb3JtTGFuZ3VhZ2VUYWcoKX0pLlxuICAgKlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9uPX0gZm4gRnVuY3Rpb24gdG8gZGV0ZXJtaW5lIGEgYnJvd3NlcidzIGxvY2FsZVxuICAgKi9cbiAgdGhpcy5kZXRlcm1pbmVQcmVmZXJyZWRMYW5ndWFnZSA9IGZ1bmN0aW9uIChmbikge1xuXG4gICAgdmFyIGxvY2FsZSA9IChmbiAmJiBhbmd1bGFyLmlzRnVuY3Rpb24oZm4pKSA/IGZuKCkgOiBnZXRMb2NhbGUoKTtcblxuICAgIGlmICghJGF2YWlsYWJsZUxhbmd1YWdlS2V5cy5sZW5ndGgpIHtcbiAgICAgICRwcmVmZXJyZWRMYW5ndWFnZSA9IGxvY2FsZTtcbiAgICB9IGVsc2Uge1xuICAgICAgJHByZWZlcnJlZExhbmd1YWdlID0gbmVnb3RpYXRlTG9jYWxlKGxvY2FsZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgLyoqXG4gICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgKiBAbmFtZSBwYXNjYWxwcmVjaHQudHJhbnNsYXRlLiR0cmFuc2xhdGVQcm92aWRlciNyZWdpc3RlckF2YWlsYWJsZUxhbmd1YWdlS2V5c1xuICAgKiBAbWV0aG9kT2YgcGFzY2FscHJlY2h0LnRyYW5zbGF0ZS4kdHJhbnNsYXRlUHJvdmlkZXJcbiAgICpcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqIFJlZ2lzdGVycyBhIHNldCBvZiBsYW5ndWFnZSBrZXlzIHRoZSBhcHAgd2lsbCB3b3JrIHdpdGguIFVzZSB0aGlzIG1ldGhvZCBpblxuICAgKiBjb21iaW5hdGlvbiB3aXRoXG4gICAqIHtAbGluayBwYXNjYWxwcmVjaHQudHJhbnNsYXRlLiR0cmFuc2xhdGVQcm92aWRlciNkZXRlcm1pbmVQcmVmZXJyZWRMYW5ndWFnZSBkZXRlcm1pbmVQcmVmZXJyZWRMYW5ndWFnZX0uXG4gICAqIFdoZW4gYXZhaWxhYmxlIGxhbmd1YWdlcyBrZXlzIGFyZSByZWdpc3RlcmVkLCBhbmd1bGFyLXRyYW5zbGF0ZVxuICAgKiB0cmllcyB0byBmaW5kIHRoZSBiZXN0IGZpdHRpbmcgbGFuZ3VhZ2Uga2V5IGRlcGVuZGluZyBvbiB0aGUgYnJvd3NlcnMgbG9jYWxlLFxuICAgKiBjb25zaWRlcmluZyB5b3VyIGxhbmd1YWdlIGtleSBjb252ZW50aW9uLlxuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdH0gbGFuZ3VhZ2VLZXlzIEFycmF5IG9mIGxhbmd1YWdlIGtleXMgdGhlIHlvdXIgYXBwIHdpbGwgdXNlXG4gICAqIEBwYXJhbSB7b2JqZWN0PX0gYWxpYXNlcyBBbGlhcyBtYXAuXG4gICAqL1xuICB0aGlzLnJlZ2lzdGVyQXZhaWxhYmxlTGFuZ3VhZ2VLZXlzID0gZnVuY3Rpb24gKGxhbmd1YWdlS2V5cywgYWxpYXNlcykge1xuICAgIGlmIChsYW5ndWFnZUtleXMpIHtcbiAgICAgICRhdmFpbGFibGVMYW5ndWFnZUtleXMgPSBsYW5ndWFnZUtleXM7XG4gICAgICBpZiAoYWxpYXNlcykge1xuICAgICAgICAkbGFuZ3VhZ2VLZXlBbGlhc2VzID0gYWxpYXNlcztcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICByZXR1cm4gJGF2YWlsYWJsZUxhbmd1YWdlS2V5cztcbiAgfTtcblxuICAvKipcbiAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAqIEBuYW1lIHBhc2NhbHByZWNodC50cmFuc2xhdGUuJHRyYW5zbGF0ZVByb3ZpZGVyI3VzZUxvYWRlckNhY2hlXG4gICAqIEBtZXRob2RPZiBwYXNjYWxwcmVjaHQudHJhbnNsYXRlLiR0cmFuc2xhdGVQcm92aWRlclxuICAgKlxuICAgKiBAZGVzY3JpcHRpb25cbiAgICogUmVnaXN0ZXJzIGEgY2FjaGUgZm9yIGludGVybmFsICRodHRwIGJhc2VkIGxvYWRlcnMuXG4gICAqIHtAbGluayBwYXNjYWxwcmVjaHQudHJhbnNsYXRlLiR0cmFuc2xhdGVQcm92aWRlciNkZXRlcm1pbmVQcmVmZXJyZWRMYW5ndWFnZSBkZXRlcm1pbmVQcmVmZXJyZWRMYW5ndWFnZX0uXG4gICAqIFdoZW4gZmFsc2UgdGhlIGNhY2hlIHdpbGwgYmUgZGlzYWJsZWQgKGRlZmF1bHQpLiBXaGVuIHRydWUgb3IgdW5kZWZpbmVkXG4gICAqIHRoZSBjYWNoZSB3aWxsIGJlIGEgZGVmYXVsdCAoc2VlICRjYWNoZUZhY3RvcnkpLiBXaGVuIGFuIG9iamVjdCBpdCB3aWxsXG4gICAqIGJlIHRyZWF0IGFzIGEgY2FjaGUgb2JqZWN0IGl0c2VsZjogdGhlIHVzYWdlIGlzICRodHRwKHtjYWNoZTogY2FjaGV9KVxuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdH0gY2FjaGUgYm9vbGVhbiwgc3RyaW5nIG9yIGNhY2hlLW9iamVjdFxuICAgKi9cbiAgdGhpcy51c2VMb2FkZXJDYWNoZSA9IGZ1bmN0aW9uIChjYWNoZSkge1xuICAgIGlmIChjYWNoZSA9PT0gZmFsc2UpIHtcbiAgICAgIC8vIGRpc2FibGUgY2FjaGVcbiAgICAgIGxvYWRlckNhY2hlID0gdW5kZWZpbmVkO1xuICAgIH0gZWxzZSBpZiAoY2FjaGUgPT09IHRydWUpIHtcbiAgICAgIC8vIGVuYWJsZSBjYWNoZSB1c2luZyBBSlMgZGVmYXVsdHNcbiAgICAgIGxvYWRlckNhY2hlID0gdHJ1ZTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZihjYWNoZSkgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAvLyBlbmFibGUgY2FjaGUgdXNpbmcgZGVmYXVsdFxuICAgICAgbG9hZGVyQ2FjaGUgPSAnJHRyYW5zbGF0aW9uQ2FjaGUnO1xuICAgIH0gZWxzZSBpZiAoY2FjaGUpIHtcbiAgICAgIC8vIGVuYWJsZSBjYWNoZSB1c2luZyBnaXZlbiBvbmUgKHNlZSAkY2FjaGVGYWN0b3J5KVxuICAgICAgbG9hZGVyQ2FjaGUgPSBjYWNoZTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgLyoqXG4gICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgKiBAbmFtZSBwYXNjYWxwcmVjaHQudHJhbnNsYXRlLiR0cmFuc2xhdGVQcm92aWRlciNkaXJlY3RpdmVQcmlvcml0eVxuICAgKiBAbWV0aG9kT2YgcGFzY2FscHJlY2h0LnRyYW5zbGF0ZS4kdHJhbnNsYXRlUHJvdmlkZXJcbiAgICpcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqIFNldHMgdGhlIGRlZmF1bHQgcHJpb3JpdHkgb2YgdGhlIHRyYW5zbGF0ZSBkaXJlY3RpdmUuIFRoZSBzdGFuZGFyZCB2YWx1ZSBpcyBgMGAuXG4gICAqIENhbGxpbmcgdGhpcyBmdW5jdGlvbiB3aXRob3V0IGFuIGFyZ3VtZW50IHdpbGwgcmV0dXJuIHRoZSBjdXJyZW50IHZhbHVlLlxuICAgKlxuICAgKiBAcGFyYW0ge251bWJlcn0gcHJpb3JpdHkgZm9yIHRoZSB0cmFuc2xhdGUtZGlyZWN0aXZlXG4gICAqL1xuICB0aGlzLmRpcmVjdGl2ZVByaW9yaXR5ID0gZnVuY3Rpb24gKHByaW9yaXR5KSB7XG4gICAgaWYgKHByaW9yaXR5ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIGdldHRlclxuICAgICAgcmV0dXJuIGRpcmVjdGl2ZVByaW9yaXR5O1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBzZXR0ZXIgd2l0aCBjaGFpbmluZ1xuICAgICAgZGlyZWN0aXZlUHJpb3JpdHkgPSBwcmlvcml0eTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAqIEBuYW1lIHBhc2NhbHByZWNodC50cmFuc2xhdGUuJHRyYW5zbGF0ZVByb3ZpZGVyI3N0YXRlZnVsRmlsdGVyXG4gICAqIEBtZXRob2RPZiBwYXNjYWxwcmVjaHQudHJhbnNsYXRlLiR0cmFuc2xhdGVQcm92aWRlclxuICAgKlxuICAgKiBAZGVzY3JpcHRpb25cbiAgICogU2luY2UgQW5ndWxhckpTIDEuMywgZmlsdGVycyB3aGljaCBhcmUgbm90IHN0YXRlbGVzcyAoZGVwZW5kaW5nIGF0IHRoZSBzY29wZSlcbiAgICogaGF2ZSB0byBleHBsaWNpdCBkZWZpbmUgdGhpcyBiZWhhdmlvci5cbiAgICogU2V0cyB3aGV0aGVyIHRoZSB0cmFuc2xhdGUgZmlsdGVyIHNob3VsZCBiZSBzdGF0ZWZ1bCBvciBzdGF0ZWxlc3MuIFRoZSBzdGFuZGFyZCB2YWx1ZSBpcyBgdHJ1ZWBcbiAgICogbWVhbmluZyBiZWluZyBzdGF0ZWZ1bC5cbiAgICogQ2FsbGluZyB0aGlzIGZ1bmN0aW9uIHdpdGhvdXQgYW4gYXJndW1lbnQgd2lsbCByZXR1cm4gdGhlIGN1cnJlbnQgdmFsdWUuXG4gICAqXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gc3RhdGUgLSBkZWZpbmVzIHRoZSBzdGF0ZSBvZiB0aGUgZmlsdGVyXG4gICAqL1xuICB0aGlzLnN0YXRlZnVsRmlsdGVyID0gZnVuY3Rpb24gKHN0YXRlKSB7XG4gICAgaWYgKHN0YXRlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIGdldHRlclxuICAgICAgcmV0dXJuIHN0YXRlZnVsRmlsdGVyO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBzZXR0ZXIgd2l0aCBjaGFpbmluZ1xuICAgICAgc3RhdGVmdWxGaWx0ZXIgPSBzdGF0ZTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogQG5nZG9jIG9iamVjdFxuICAgKiBAbmFtZSBwYXNjYWxwcmVjaHQudHJhbnNsYXRlLiR0cmFuc2xhdGVcbiAgICogQHJlcXVpcmVzICRpbnRlcnBvbGF0ZVxuICAgKiBAcmVxdWlyZXMgJGxvZ1xuICAgKiBAcmVxdWlyZXMgJHJvb3RTY29wZVxuICAgKiBAcmVxdWlyZXMgJHFcbiAgICpcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqIFRoZSBgJHRyYW5zbGF0ZWAgc2VydmljZSBpcyB0aGUgYWN0dWFsIGNvcmUgb2YgYW5ndWxhci10cmFuc2xhdGUuIEl0IGV4cGVjdHMgYSB0cmFuc2xhdGlvbiBpZFxuICAgKiBhbmQgb3B0aW9uYWwgaW50ZXJwb2xhdGUgcGFyYW1ldGVycyB0byB0cmFuc2xhdGUgY29udGVudHMuXG4gICAqXG4gICAqIDxwcmU+XG4gICAqICAkdHJhbnNsYXRlKCdIRUFETElORV9URVhUJykudGhlbihmdW5jdGlvbiAodHJhbnNsYXRpb24pIHtcbiAgICogICAgJHNjb3BlLnRyYW5zbGF0ZWRUZXh0ID0gdHJhbnNsYXRpb247XG4gICAqICB9KTtcbiAgICogPC9wcmU+XG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfGFycmF5fSB0cmFuc2xhdGlvbklkIEEgdG9rZW4gd2hpY2ggcmVwcmVzZW50cyBhIHRyYW5zbGF0aW9uIGlkXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFRoaXMgY2FuIGJlIG9wdGlvbmFsbHkgYW4gYXJyYXkgb2YgdHJhbnNsYXRpb24gaWRzIHdoaWNoXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdHMgdGhhdCB0aGUgZnVuY3Rpb24gcmV0dXJucyBhbiBvYmplY3Qgd2hlcmUgZWFjaCBrZXlcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXMgdGhlIHRyYW5zbGF0aW9uIGlkIGFuZCB0aGUgdmFsdWUgdGhlIHRyYW5zbGF0aW9uLlxuICAgKiBAcGFyYW0ge29iamVjdD19IGludGVycG9sYXRlUGFyYW1zIEFuIG9iamVjdCBoYXNoIGZvciBkeW5hbWljIHZhbHVlc1xuICAgKiBAcGFyYW0ge3N0cmluZ30gaW50ZXJwb2xhdGlvbklkIFRoZSBpZCBvZiB0aGUgaW50ZXJwb2xhdGlvbiB0byB1c2VcbiAgICogQHJldHVybnMge29iamVjdH0gcHJvbWlzZVxuICAgKi9cbiAgdGhpcy4kZ2V0ID0gW1xuICAgICckbG9nJyxcbiAgICAnJGluamVjdG9yJyxcbiAgICAnJHJvb3RTY29wZScsXG4gICAgJyRxJyxcbiAgICBmdW5jdGlvbiAoJGxvZywgJGluamVjdG9yLCAkcm9vdFNjb3BlLCAkcSkge1xuXG4gICAgICB2YXIgU3RvcmFnZSxcbiAgICAgICAgICBkZWZhdWx0SW50ZXJwb2xhdG9yID0gJGluamVjdG9yLmdldCgkaW50ZXJwb2xhdGlvbkZhY3RvcnkgfHwgJyR0cmFuc2xhdGVEZWZhdWx0SW50ZXJwb2xhdGlvbicpLFxuICAgICAgICAgIHBlbmRpbmdMb2FkZXIgPSBmYWxzZSxcbiAgICAgICAgICBpbnRlcnBvbGF0b3JIYXNoTWFwID0ge30sXG4gICAgICAgICAgbGFuZ1Byb21pc2VzID0ge30sXG4gICAgICAgICAgZmFsbGJhY2tJbmRleCxcbiAgICAgICAgICBzdGFydEZhbGxiYWNrSXRlcmF0aW9uO1xuXG4gICAgICB2YXIgJHRyYW5zbGF0ZSA9IGZ1bmN0aW9uICh0cmFuc2xhdGlvbklkLCBpbnRlcnBvbGF0ZVBhcmFtcywgaW50ZXJwb2xhdGlvbklkLCBkZWZhdWx0VHJhbnNsYXRpb25UZXh0KSB7XG5cbiAgICAgICAgLy8gRHVjayBkZXRlY3Rpb246IElmIHRoZSBmaXJzdCBhcmd1bWVudCBpcyBhbiBhcnJheSwgYSBidW5jaCBvZiB0cmFuc2xhdGlvbnMgd2FzIHJlcXVlc3RlZC5cbiAgICAgICAgLy8gVGhlIHJlc3VsdCBpcyBhbiBvYmplY3QuXG4gICAgICAgIGlmIChhbmd1bGFyLmlzQXJyYXkodHJhbnNsYXRpb25JZCkpIHtcbiAgICAgICAgICAvLyBJbnNwaXJlZCBieSBRLmFsbFNldHRsZWQgYnkgS3JpcyBLb3dhbFxuICAgICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9rcmlza293YWwvcS9ibG9iL2IwZmE3Mjk4MDcxN2RjMjAyZmZjM2NiZjAzYjkzNmUxMGViYmI5ZDcvcS5qcyNMMTU1My0xNTYzXG4gICAgICAgICAgLy8gVGhpcyB0cmFuc2Zvcm1zIGFsbCBwcm9taXNlcyByZWdhcmRsZXNzIHJlc29sdmVkIG9yIHJlamVjdGVkXG4gICAgICAgICAgdmFyIHRyYW5zbGF0ZUFsbCA9IGZ1bmN0aW9uICh0cmFuc2xhdGlvbklkcykge1xuICAgICAgICAgICAgdmFyIHJlc3VsdHMgPSB7fTsgLy8gc3RvcmluZyB0aGUgYWN0dWFsIHJlc3VsdHNcbiAgICAgICAgICAgIHZhciBwcm9taXNlcyA9IFtdOyAvLyBwcm9taXNlcyB0byB3YWl0IGZvclxuICAgICAgICAgICAgLy8gV3JhcHMgdGhlIHByb21pc2UgYSkgYmVpbmcgYWx3YXlzIHJlc29sdmVkIGFuZCBiKSBzdG9yaW5nIHRoZSBsaW5rIGlkLT52YWx1ZVxuICAgICAgICAgICAgdmFyIHRyYW5zbGF0ZSA9IGZ1bmN0aW9uICh0cmFuc2xhdGlvbklkKSB7XG4gICAgICAgICAgICAgIHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XG4gICAgICAgICAgICAgIHZhciByZWdhcmRsZXNzID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0c1t0cmFuc2xhdGlvbklkXSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoW3RyYW5zbGF0aW9uSWQsIHZhbHVlXSk7XG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIC8vIHdlIGRvbid0IGNhcmUgd2hldGhlciB0aGUgcHJvbWlzZSB3YXMgcmVzb2x2ZWQgb3IgcmVqZWN0ZWQ7IGp1c3Qgc3RvcmUgdGhlIHZhbHVlc1xuICAgICAgICAgICAgICAkdHJhbnNsYXRlKHRyYW5zbGF0aW9uSWQsIGludGVycG9sYXRlUGFyYW1zLCBpbnRlcnBvbGF0aW9uSWQsIGRlZmF1bHRUcmFuc2xhdGlvblRleHQpLnRoZW4ocmVnYXJkbGVzcywgcmVnYXJkbGVzcyk7XG4gICAgICAgICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBjID0gdHJhbnNsYXRpb25JZHMubGVuZ3RoOyBpIDwgYzsgaSsrKSB7XG4gICAgICAgICAgICAgIHByb21pc2VzLnB1c2godHJhbnNsYXRlKHRyYW5zbGF0aW9uSWRzW2ldKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyB3YWl0IGZvciBhbGwgKGluY2x1ZGluZyBzdG9yaW5nIHRvIHJlc3VsdHMpXG4gICAgICAgICAgICByZXR1cm4gJHEuYWxsKHByb21pc2VzKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgLy8gcmV0dXJuIHRoZSByZXN1bHRzXG4gICAgICAgICAgICAgIHJldHVybiByZXN1bHRzO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfTtcbiAgICAgICAgICByZXR1cm4gdHJhbnNsYXRlQWxsKHRyYW5zbGF0aW9uSWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcblxuICAgICAgICAvLyB0cmltIG9mZiBhbnkgd2hpdGVzcGFjZVxuICAgICAgICBpZiAodHJhbnNsYXRpb25JZCkge1xuICAgICAgICAgIHRyYW5zbGF0aW9uSWQgPSB0cmltLmFwcGx5KHRyYW5zbGF0aW9uSWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHByb21pc2VUb1dhaXRGb3IgPSAoZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHZhciBwcm9taXNlID0gJHByZWZlcnJlZExhbmd1YWdlID9cbiAgICAgICAgICAgIGxhbmdQcm9taXNlc1skcHJlZmVycmVkTGFuZ3VhZ2VdIDpcbiAgICAgICAgICAgIGxhbmdQcm9taXNlc1skdXNlc107XG5cbiAgICAgICAgICBmYWxsYmFja0luZGV4ID0gMDtcblxuICAgICAgICAgIGlmICgkc3RvcmFnZUZhY3RvcnkgJiYgIXByb21pc2UpIHtcbiAgICAgICAgICAgIC8vIGxvb2tzIGxpa2UgdGhlcmUncyBubyBwZW5kaW5nIHByb21pc2UgZm9yICRwcmVmZXJyZWRMYW5ndWFnZSBvclxuICAgICAgICAgICAgLy8gJHVzZXMuIE1heWJlIHRoZXJlJ3Mgb25lIHBlbmRpbmcgZm9yIGEgbGFuZ3VhZ2UgdGhhdCBjb21lcyBmcm9tXG4gICAgICAgICAgICAvLyBzdG9yYWdlLlxuICAgICAgICAgICAgdmFyIGxhbmdLZXkgPSBTdG9yYWdlLmdldCgkc3RvcmFnZUtleSk7XG4gICAgICAgICAgICBwcm9taXNlID0gbGFuZ1Byb21pc2VzW2xhbmdLZXldO1xuXG4gICAgICAgICAgICBpZiAoJGZhbGxiYWNrTGFuZ3VhZ2UgJiYgJGZhbGxiYWNrTGFuZ3VhZ2UubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGluZGV4ID0gaW5kZXhPZigkZmFsbGJhY2tMYW5ndWFnZSwgbGFuZ0tleSk7XG4gICAgICAgICAgICAgICAgLy8gbWF5YmUgdGhlIGxhbmd1YWdlIGZyb20gc3RvcmFnZSBpcyBhbHNvIGRlZmluZWQgYXMgZmFsbGJhY2sgbGFuZ3VhZ2VcbiAgICAgICAgICAgICAgICAvLyB3ZSBpbmNyZWFzZSB0aGUgZmFsbGJhY2sgbGFuZ3VhZ2UgaW5kZXggdG8gbm90IHNlYXJjaCBpbiB0aGF0IGxhbmd1YWdlXG4gICAgICAgICAgICAgICAgLy8gYXMgZmFsbGJhY2ssIHNpbmNlIGl0J3MgcHJvYmFibHkgdGhlIGZpcnN0IHVzZWQgbGFuZ3VhZ2VcbiAgICAgICAgICAgICAgICAvLyBpbiB0aGF0IGNhc2UgdGhlIGluZGV4IHN0YXJ0cyBhZnRlciB0aGUgZmlyc3QgZWxlbWVudFxuICAgICAgICAgICAgICAgIGZhbGxiYWNrSW5kZXggPSAoaW5kZXggPT09IDApID8gMSA6IDA7XG5cbiAgICAgICAgICAgICAgICAvLyBidXQgd2UgY2FuIG1ha2Ugc3VyZSB0byBBTFdBWVMgZmFsbGJhY2sgdG8gcHJlZmVycmVkIGxhbmd1YWdlIGF0IGxlYXN0XG4gICAgICAgICAgICAgICAgaWYgKGluZGV4T2YoJGZhbGxiYWNrTGFuZ3VhZ2UsICRwcmVmZXJyZWRMYW5ndWFnZSkgPCAwKSB7XG4gICAgICAgICAgICAgICAgICAkZmFsbGJhY2tMYW5ndWFnZS5wdXNoKCRwcmVmZXJyZWRMYW5ndWFnZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICAgICAgfSgpKTtcblxuICAgICAgICBpZiAoIXByb21pc2VUb1dhaXRGb3IpIHtcbiAgICAgICAgICAvLyBubyBwcm9taXNlIHRvIHdhaXQgZm9yPyBva2F5LiBUaGVuIHRoZXJlJ3Mgbm8gbG9hZGVyIHJlZ2lzdGVyZWRcbiAgICAgICAgICAvLyBub3IgaXMgYSBvbmUgcGVuZGluZyBmb3IgbGFuZ3VhZ2UgdGhhdCBjb21lcyBmcm9tIHN0b3JhZ2UuXG4gICAgICAgICAgLy8gV2UgY2FuIGp1c3QgdHJhbnNsYXRlLlxuICAgICAgICAgIGRldGVybWluZVRyYW5zbGF0aW9uKHRyYW5zbGF0aW9uSWQsIGludGVycG9sYXRlUGFyYW1zLCBpbnRlcnBvbGF0aW9uSWQsIGRlZmF1bHRUcmFuc2xhdGlvblRleHQpLnRoZW4oZGVmZXJyZWQucmVzb2x2ZSwgZGVmZXJyZWQucmVqZWN0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YXIgcHJvbWlzZVJlc29sdmVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgZGV0ZXJtaW5lVHJhbnNsYXRpb24odHJhbnNsYXRpb25JZCwgaW50ZXJwb2xhdGVQYXJhbXMsIGludGVycG9sYXRpb25JZCwgZGVmYXVsdFRyYW5zbGF0aW9uVGV4dCkudGhlbihkZWZlcnJlZC5yZXNvbHZlLCBkZWZlcnJlZC5yZWplY3QpO1xuICAgICAgICAgIH07XG4gICAgICAgICAgcHJvbWlzZVJlc29sdmVkLmRpc3BsYXlOYW1lID0gJ3Byb21pc2VSZXNvbHZlZCc7XG5cbiAgICAgICAgICBwcm9taXNlVG9XYWl0Rm9yWydmaW5hbGx5J10ocHJvbWlzZVJlc29sdmVkLCBkZWZlcnJlZC5yZWplY3QpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgICAgfTtcblxuICAgICAgLyoqXG4gICAgICAgKiBAbmFtZSBhcHBseU5vdEZvdW5kSW5kaWNhdG9yc1xuICAgICAgICogQHByaXZhdGVcbiAgICAgICAqXG4gICAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgICAqIEFwcGxpZXMgbm90IGZvdW50IGluZGljYXRvcnMgdG8gZ2l2ZW4gdHJhbnNsYXRpb24gaWQsIGlmIG5lZWRlZC5cbiAgICAgICAqIFRoaXMgZnVuY3Rpb24gZ2V0cyBvbmx5IGV4ZWN1dGVkLCBpZiBhIHRyYW5zbGF0aW9uIGlkIGRvZXNuJ3QgZXhpc3QsXG4gICAgICAgKiB3aGljaCBpcyB3aHkgYSB0cmFuc2xhdGlvbiBpZCBpcyBleHBlY3RlZCBhcyBhcmd1bWVudC5cbiAgICAgICAqXG4gICAgICAgKiBAcGFyYW0ge3N0cmluZ30gdHJhbnNsYXRpb25JZCBUcmFuc2xhdGlvbiBpZC5cbiAgICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFNhbWUgYXMgZ2l2ZW4gdHJhbnNsYXRpb24gaWQgYnV0IGFwcGxpZWQgd2l0aCBub3QgZm91bmRcbiAgICAgICAqIGluZGljYXRvcnMuXG4gICAgICAgKi9cbiAgICAgIHZhciBhcHBseU5vdEZvdW5kSW5kaWNhdG9ycyA9IGZ1bmN0aW9uICh0cmFuc2xhdGlvbklkKSB7XG4gICAgICAgIC8vIGFwcGx5aW5nIG5vdEZvdW5kSW5kaWNhdG9yc1xuICAgICAgICBpZiAoJG5vdEZvdW5kSW5kaWNhdG9yTGVmdCkge1xuICAgICAgICAgIHRyYW5zbGF0aW9uSWQgPSBbJG5vdEZvdW5kSW5kaWNhdG9yTGVmdCwgdHJhbnNsYXRpb25JZF0uam9pbignICcpO1xuICAgICAgICB9XG4gICAgICAgIGlmICgkbm90Rm91bmRJbmRpY2F0b3JSaWdodCkge1xuICAgICAgICAgIHRyYW5zbGF0aW9uSWQgPSBbdHJhbnNsYXRpb25JZCwgJG5vdEZvdW5kSW5kaWNhdG9yUmlnaHRdLmpvaW4oJyAnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJhbnNsYXRpb25JZDtcbiAgICAgIH07XG5cbiAgICAgIC8qKlxuICAgICAgICogQG5hbWUgdXNlTGFuZ3VhZ2VcbiAgICAgICAqIEBwcml2YXRlXG4gICAgICAgKlxuICAgICAgICogQGRlc2NyaXB0aW9uXG4gICAgICAgKiBNYWtlcyBhY3R1YWwgdXNlIG9mIGEgbGFuZ3VhZ2UgYnkgc2V0dGluZyBhIGdpdmVuIGxhbmd1YWdlIGtleSBhcyB1c2VkXG4gICAgICAgKiBsYW5ndWFnZSBhbmQgaW5mb3JtcyByZWdpc3RlcmVkIGludGVycG9sYXRvcnMgdG8gYWxzbyB1c2UgdGhlIGdpdmVuXG4gICAgICAgKiBrZXkgYXMgbG9jYWxlLlxuICAgICAgICpcbiAgICAgICAqIEBwYXJhbSB7a2V5fSBMb2NhbGUga2V5LlxuICAgICAgICovXG4gICAgICB2YXIgdXNlTGFuZ3VhZ2UgPSBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICR1c2VzID0ga2V5O1xuICAgICAgICAkcm9vdFNjb3BlLiRlbWl0KCckdHJhbnNsYXRlQ2hhbmdlU3VjY2VzcycsIHtsYW5ndWFnZToga2V5fSk7XG5cbiAgICAgICAgaWYgKCRzdG9yYWdlRmFjdG9yeSkge1xuICAgICAgICAgIFN0b3JhZ2UucHV0KCR0cmFuc2xhdGUuc3RvcmFnZUtleSgpLCAkdXNlcyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gaW5mb3JtIGRlZmF1bHQgaW50ZXJwb2xhdG9yXG4gICAgICAgIGRlZmF1bHRJbnRlcnBvbGF0b3Iuc2V0TG9jYWxlKCR1c2VzKTtcblxuICAgICAgICB2YXIgZWFjaEludGVycG9sYXRvciA9IGZ1bmN0aW9uIChpbnRlcnBvbGF0b3IsIGlkKSB7XG4gICAgICAgICAgaW50ZXJwb2xhdG9ySGFzaE1hcFtpZF0uc2V0TG9jYWxlKCR1c2VzKTtcbiAgICAgICAgfTtcbiAgICAgICAgZWFjaEludGVycG9sYXRvci5kaXNwbGF5TmFtZSA9ICdlYWNoSW50ZXJwb2xhdG9yTG9jYWxlU2V0dGVyJztcblxuICAgICAgICAvLyBpbmZvcm0gYWxsIG90aGVycyB0b28hXG4gICAgICAgIGFuZ3VsYXIuZm9yRWFjaChpbnRlcnBvbGF0b3JIYXNoTWFwLCBlYWNoSW50ZXJwb2xhdG9yKTtcbiAgICAgICAgJHJvb3RTY29wZS4kZW1pdCgnJHRyYW5zbGF0ZUNoYW5nZUVuZCcsIHtsYW5ndWFnZToga2V5fSk7XG4gICAgICB9O1xuXG4gICAgICAvKipcbiAgICAgICAqIEBuYW1lIGxvYWRBc3luY1xuICAgICAgICogQHByaXZhdGVcbiAgICAgICAqXG4gICAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgICAqIEtpY2tzIG9mIHJlZ2lzdGVyZWQgYXN5bmMgbG9hZGVyIHVzaW5nIGAkaW5qZWN0b3JgIGFuZCBhcHBsaWVzIGV4aXN0aW5nXG4gICAgICAgKiBsb2FkZXIgb3B0aW9ucy4gV2hlbiByZXNvbHZlZCwgaXQgdXBkYXRlcyB0cmFuc2xhdGlvbiB0YWJsZXMgYWNjb3JkaW5nbHlcbiAgICAgICAqIG9yIHJlamVjdHMgd2l0aCBnaXZlbiBsYW5ndWFnZSBrZXkuXG4gICAgICAgKlxuICAgICAgICogQHBhcmFtIHtzdHJpbmd9IGtleSBMYW5ndWFnZSBrZXkuXG4gICAgICAgKiBAcmV0dXJuIHtQcm9taXNlfSBBIHByb21pc2UuXG4gICAgICAgKi9cbiAgICAgIHZhciBsb2FkQXN5bmMgPSBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIGlmICgha2V5KSB7XG4gICAgICAgICAgdGhyb3cgJ05vIGxhbmd1YWdlIGtleSBzcGVjaWZpZWQgZm9yIGxvYWRpbmcuJztcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XG5cbiAgICAgICAgJHJvb3RTY29wZS4kZW1pdCgnJHRyYW5zbGF0ZUxvYWRpbmdTdGFydCcsIHtsYW5ndWFnZToga2V5fSk7XG4gICAgICAgIHBlbmRpbmdMb2FkZXIgPSB0cnVlO1xuXG4gICAgICAgIHZhciBjYWNoZSA9IGxvYWRlckNhY2hlO1xuICAgICAgICBpZiAodHlwZW9mKGNhY2hlKSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAvLyBnZXR0aW5nIG9uLWRlbWFuZCBpbnN0YW5jZSBvZiBsb2FkZXJcbiAgICAgICAgICBjYWNoZSA9ICRpbmplY3Rvci5nZXQoY2FjaGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGxvYWRlck9wdGlvbnMgPSBhbmd1bGFyLmV4dGVuZCh7fSwgJGxvYWRlck9wdGlvbnMsIHtcbiAgICAgICAgICBrZXk6IGtleSxcbiAgICAgICAgICAkaHR0cDogYW5ndWxhci5leHRlbmQoe30sIHtcbiAgICAgICAgICAgIGNhY2hlOiBjYWNoZVxuICAgICAgICAgIH0sICRsb2FkZXJPcHRpb25zLiRodHRwKVxuICAgICAgICB9KTtcblxuICAgICAgICB2YXIgb25Mb2FkZXJTdWNjZXNzID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICB2YXIgdHJhbnNsYXRpb25UYWJsZSA9IHt9O1xuICAgICAgICAgICRyb290U2NvcGUuJGVtaXQoJyR0cmFuc2xhdGVMb2FkaW5nU3VjY2VzcycsIHtsYW5ndWFnZToga2V5fSk7XG5cbiAgICAgICAgICBpZiAoYW5ndWxhci5pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goZGF0YSwgZnVuY3Rpb24gKHRhYmxlKSB7XG4gICAgICAgICAgICAgIGFuZ3VsYXIuZXh0ZW5kKHRyYW5zbGF0aW9uVGFibGUsIGZsYXRPYmplY3QodGFibGUpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhbmd1bGFyLmV4dGVuZCh0cmFuc2xhdGlvblRhYmxlLCBmbGF0T2JqZWN0KGRhdGEpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcGVuZGluZ0xvYWRlciA9IGZhbHNlO1xuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoe1xuICAgICAgICAgICAga2V5OiBrZXksXG4gICAgICAgICAgICB0YWJsZTogdHJhbnNsYXRpb25UYWJsZVxuICAgICAgICAgIH0pO1xuICAgICAgICAgICRyb290U2NvcGUuJGVtaXQoJyR0cmFuc2xhdGVMb2FkaW5nRW5kJywge2xhbmd1YWdlOiBrZXl9KTtcbiAgICAgICAgfTtcbiAgICAgICAgb25Mb2FkZXJTdWNjZXNzLmRpc3BsYXlOYW1lID0gJ29uTG9hZGVyU3VjY2Vzcyc7XG5cbiAgICAgICAgdmFyIG9uTG9hZGVyRXJyb3IgPSBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgJHJvb3RTY29wZS4kZW1pdCgnJHRyYW5zbGF0ZUxvYWRpbmdFcnJvcicsIHtsYW5ndWFnZToga2V5fSk7XG4gICAgICAgICAgZGVmZXJyZWQucmVqZWN0KGtleSk7XG4gICAgICAgICAgJHJvb3RTY29wZS4kZW1pdCgnJHRyYW5zbGF0ZUxvYWRpbmdFbmQnLCB7bGFuZ3VhZ2U6IGtleX0pO1xuICAgICAgICB9O1xuICAgICAgICBvbkxvYWRlckVycm9yLmRpc3BsYXlOYW1lID0gJ29uTG9hZGVyRXJyb3InO1xuXG4gICAgICAgICRpbmplY3Rvci5nZXQoJGxvYWRlckZhY3RvcnkpKGxvYWRlck9wdGlvbnMpXG4gICAgICAgICAgLnRoZW4ob25Mb2FkZXJTdWNjZXNzLCBvbkxvYWRlckVycm9yKTtcblxuICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICAgIH07XG5cbiAgICAgIGlmICgkc3RvcmFnZUZhY3RvcnkpIHtcbiAgICAgICAgU3RvcmFnZSA9ICRpbmplY3Rvci5nZXQoJHN0b3JhZ2VGYWN0b3J5KTtcblxuICAgICAgICBpZiAoIVN0b3JhZ2UuZ2V0IHx8ICFTdG9yYWdlLnB1dCkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQ291bGRuXFwndCB1c2Ugc3RvcmFnZSBcXCcnICsgJHN0b3JhZ2VGYWN0b3J5ICsgJ1xcJywgbWlzc2luZyBnZXQoKSBvciBwdXQoKSBtZXRob2QhJyk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gaWYgd2UgaGF2ZSBhZGRpdGlvbmFsIGludGVycG9sYXRpb25zIHRoYXQgd2VyZSBhZGRlZCB2aWFcbiAgICAgIC8vICR0cmFuc2xhdGVQcm92aWRlci5hZGRJbnRlcnBvbGF0aW9uKCksIHdlIGhhdmUgdG8gbWFwJ2VtXG4gICAgICBpZiAoJGludGVycG9sYXRvckZhY3Rvcmllcy5sZW5ndGgpIHtcbiAgICAgICAgdmFyIGVhY2hJbnRlcnBvbGF0aW9uRmFjdG9yeSA9IGZ1bmN0aW9uIChpbnRlcnBvbGF0b3JGYWN0b3J5KSB7XG4gICAgICAgICAgdmFyIGludGVycG9sYXRvciA9ICRpbmplY3Rvci5nZXQoaW50ZXJwb2xhdG9yRmFjdG9yeSk7XG4gICAgICAgICAgLy8gc2V0dGluZyBpbml0aWFsIGxvY2FsZSBmb3IgZWFjaCBpbnRlcnBvbGF0aW9uIHNlcnZpY2VcbiAgICAgICAgICBpbnRlcnBvbGF0b3Iuc2V0TG9jYWxlKCRwcmVmZXJyZWRMYW5ndWFnZSB8fCAkdXNlcyk7XG4gICAgICAgICAgLy8gbWFrZSdlbSByZWNvZ25pemFibGUgdGhyb3VnaCBpZFxuICAgICAgICAgIGludGVycG9sYXRvckhhc2hNYXBbaW50ZXJwb2xhdG9yLmdldEludGVycG9sYXRpb25JZGVudGlmaWVyKCldID0gaW50ZXJwb2xhdG9yO1xuICAgICAgICB9O1xuICAgICAgICBlYWNoSW50ZXJwb2xhdGlvbkZhY3RvcnkuZGlzcGxheU5hbWUgPSAnaW50ZXJwb2xhdGlvbkZhY3RvcnlBZGRlcic7XG5cbiAgICAgICAgYW5ndWxhci5mb3JFYWNoKCRpbnRlcnBvbGF0b3JGYWN0b3JpZXMsIGVhY2hJbnRlcnBvbGF0aW9uRmFjdG9yeSk7XG4gICAgICB9XG5cbiAgICAgIC8qKlxuICAgICAgICogQG5hbWUgZ2V0VHJhbnNsYXRpb25UYWJsZVxuICAgICAgICogQHByaXZhdGVcbiAgICAgICAqXG4gICAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgICAqIFJldHVybnMgYSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgdG8gdGhlIHRyYW5zbGF0aW9uIHRhYmxlXG4gICAgICAgKiBvciBpcyByZWplY3RlZCBpZiBhbiBlcnJvciBvY2N1cnJlZC5cbiAgICAgICAqXG4gICAgICAgKiBAcGFyYW0gbGFuZ0tleVxuICAgICAgICogQHJldHVybnMge1EucHJvbWlzZX1cbiAgICAgICAqL1xuICAgICAgdmFyIGdldFRyYW5zbGF0aW9uVGFibGUgPSBmdW5jdGlvbiAobGFuZ0tleSkge1xuICAgICAgICB2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xuICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKCR0cmFuc2xhdGlvblRhYmxlLCBsYW5nS2V5KSkge1xuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoJHRyYW5zbGF0aW9uVGFibGVbbGFuZ0tleV0pO1xuICAgICAgICB9IGVsc2UgaWYgKGxhbmdQcm9taXNlc1tsYW5nS2V5XSkge1xuICAgICAgICAgIHZhciBvblJlc29sdmUgPSBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgdHJhbnNsYXRpb25zKGRhdGEua2V5LCBkYXRhLnRhYmxlKTtcbiAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoZGF0YS50YWJsZSk7XG4gICAgICAgICAgfTtcbiAgICAgICAgICBvblJlc29sdmUuZGlzcGxheU5hbWUgPSAndHJhbnNsYXRpb25UYWJsZVJlc29sdmVyJztcbiAgICAgICAgICBsYW5nUHJvbWlzZXNbbGFuZ0tleV0udGhlbihvblJlc29sdmUsIGRlZmVycmVkLnJlamVjdCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZGVmZXJyZWQucmVqZWN0KCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG4gICAgICB9O1xuXG4gICAgICAvKipcbiAgICAgICAqIEBuYW1lIGdldEZhbGxiYWNrVHJhbnNsYXRpb25cbiAgICAgICAqIEBwcml2YXRlXG4gICAgICAgKlxuICAgICAgICogQGRlc2NyaXB0aW9uXG4gICAgICAgKiBSZXR1cm5zIGEgcHJvbWlzZSB0aGF0IHdpbGwgcmVzb2x2ZSB0byB0aGUgdHJhbnNsYXRpb25cbiAgICAgICAqIG9yIGJlIHJlamVjdGVkIGlmIG5vIHRyYW5zbGF0aW9uIHdhcyBmb3VuZCBmb3IgdGhlIGxhbmd1YWdlLlxuICAgICAgICogVGhpcyBmdW5jdGlvbiBpcyBjdXJyZW50bHkgb25seSB1c2VkIGZvciBmYWxsYmFjayBsYW5ndWFnZSB0cmFuc2xhdGlvbi5cbiAgICAgICAqXG4gICAgICAgKiBAcGFyYW0gbGFuZ0tleSBUaGUgbGFuZ3VhZ2UgdG8gdHJhbnNsYXRlIHRvLlxuICAgICAgICogQHBhcmFtIHRyYW5zbGF0aW9uSWRcbiAgICAgICAqIEBwYXJhbSBpbnRlcnBvbGF0ZVBhcmFtc1xuICAgICAgICogQHBhcmFtIEludGVycG9sYXRvclxuICAgICAgICogQHJldHVybnMge1EucHJvbWlzZX1cbiAgICAgICAqL1xuICAgICAgdmFyIGdldEZhbGxiYWNrVHJhbnNsYXRpb24gPSBmdW5jdGlvbiAobGFuZ0tleSwgdHJhbnNsYXRpb25JZCwgaW50ZXJwb2xhdGVQYXJhbXMsIEludGVycG9sYXRvcikge1xuICAgICAgICB2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xuXG4gICAgICAgIHZhciBvblJlc29sdmUgPSBmdW5jdGlvbiAodHJhbnNsYXRpb25UYWJsZSkge1xuICAgICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwodHJhbnNsYXRpb25UYWJsZSwgdHJhbnNsYXRpb25JZCkpIHtcbiAgICAgICAgICAgIEludGVycG9sYXRvci5zZXRMb2NhbGUobGFuZ0tleSk7XG4gICAgICAgICAgICB2YXIgdHJhbnNsYXRpb24gPSB0cmFuc2xhdGlvblRhYmxlW3RyYW5zbGF0aW9uSWRdO1xuICAgICAgICAgICAgaWYgKHRyYW5zbGF0aW9uLnN1YnN0cigwLCAyKSA9PT0gJ0A6Jykge1xuICAgICAgICAgICAgICBnZXRGYWxsYmFja1RyYW5zbGF0aW9uKGxhbmdLZXksIHRyYW5zbGF0aW9uLnN1YnN0cigyKSwgaW50ZXJwb2xhdGVQYXJhbXMsIEludGVycG9sYXRvcilcbiAgICAgICAgICAgICAgICAudGhlbihkZWZlcnJlZC5yZXNvbHZlLCBkZWZlcnJlZC5yZWplY3QpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShJbnRlcnBvbGF0b3IuaW50ZXJwb2xhdGUodHJhbnNsYXRpb25UYWJsZVt0cmFuc2xhdGlvbklkXSwgaW50ZXJwb2xhdGVQYXJhbXMpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIEludGVycG9sYXRvci5zZXRMb2NhbGUoJHVzZXMpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIG9uUmVzb2x2ZS5kaXNwbGF5TmFtZSA9ICdmYWxsYmFja1RyYW5zbGF0aW9uUmVzb2x2ZXInO1xuXG4gICAgICAgIGdldFRyYW5zbGF0aW9uVGFibGUobGFuZ0tleSkudGhlbihvblJlc29sdmUsIGRlZmVycmVkLnJlamVjdCk7XG5cbiAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG4gICAgICB9O1xuXG4gICAgICAvKipcbiAgICAgICAqIEBuYW1lIGdldEZhbGxiYWNrVHJhbnNsYXRpb25JbnN0YW50XG4gICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICpcbiAgICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAgICogUmV0dXJucyBhIHRyYW5zbGF0aW9uXG4gICAgICAgKiBUaGlzIGZ1bmN0aW9uIGlzIGN1cnJlbnRseSBvbmx5IHVzZWQgZm9yIGZhbGxiYWNrIGxhbmd1YWdlIHRyYW5zbGF0aW9uLlxuICAgICAgICpcbiAgICAgICAqIEBwYXJhbSBsYW5nS2V5IFRoZSBsYW5ndWFnZSB0byB0cmFuc2xhdGUgdG8uXG4gICAgICAgKiBAcGFyYW0gdHJhbnNsYXRpb25JZFxuICAgICAgICogQHBhcmFtIGludGVycG9sYXRlUGFyYW1zXG4gICAgICAgKiBAcGFyYW0gSW50ZXJwb2xhdG9yXG4gICAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSB0cmFuc2xhdGlvblxuICAgICAgICovXG4gICAgICB2YXIgZ2V0RmFsbGJhY2tUcmFuc2xhdGlvbkluc3RhbnQgPSBmdW5jdGlvbiAobGFuZ0tleSwgdHJhbnNsYXRpb25JZCwgaW50ZXJwb2xhdGVQYXJhbXMsIEludGVycG9sYXRvcikge1xuICAgICAgICB2YXIgcmVzdWx0LCB0cmFuc2xhdGlvblRhYmxlID0gJHRyYW5zbGF0aW9uVGFibGVbbGFuZ0tleV07XG5cbiAgICAgICAgaWYgKHRyYW5zbGF0aW9uVGFibGUgJiYgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHRyYW5zbGF0aW9uVGFibGUsIHRyYW5zbGF0aW9uSWQpKSB7XG4gICAgICAgICAgSW50ZXJwb2xhdG9yLnNldExvY2FsZShsYW5nS2V5KTtcbiAgICAgICAgICByZXN1bHQgPSBJbnRlcnBvbGF0b3IuaW50ZXJwb2xhdGUodHJhbnNsYXRpb25UYWJsZVt0cmFuc2xhdGlvbklkXSwgaW50ZXJwb2xhdGVQYXJhbXMpO1xuICAgICAgICAgIGlmIChyZXN1bHQuc3Vic3RyKDAsIDIpID09PSAnQDonKSB7XG4gICAgICAgICAgICByZXR1cm4gZ2V0RmFsbGJhY2tUcmFuc2xhdGlvbkluc3RhbnQobGFuZ0tleSwgcmVzdWx0LnN1YnN0cigyKSwgaW50ZXJwb2xhdGVQYXJhbXMsIEludGVycG9sYXRvcik7XG4gICAgICAgICAgfVxuICAgICAgICAgIEludGVycG9sYXRvci5zZXRMb2NhbGUoJHVzZXMpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH07XG5cblxuICAgICAgLyoqXG4gICAgICAgKiBAbmFtZSB0cmFuc2xhdGVCeUhhbmRsZXJcbiAgICAgICAqIEBwcml2YXRlXG4gICAgICAgKlxuICAgICAgICogVHJhbnNsYXRlIGJ5IG1pc3NpbmcgdHJhbnNsYXRpb24gaGFuZGxlci5cbiAgICAgICAqXG4gICAgICAgKiBAcGFyYW0gdHJhbnNsYXRpb25JZFxuICAgICAgICogQHJldHVybnMgdHJhbnNsYXRpb24gY3JlYXRlZCBieSAkbWlzc2luZ1RyYW5zbGF0aW9uSGFuZGxlciBvciB0cmFuc2xhdGlvbklkIGlzICRtaXNzaW5nVHJhbnNsYXRpb25IYW5kbGVyIGlzXG4gICAgICAgKiBhYnNlbnRcbiAgICAgICAqL1xuICAgICAgdmFyIHRyYW5zbGF0ZUJ5SGFuZGxlciA9IGZ1bmN0aW9uICh0cmFuc2xhdGlvbklkLCBpbnRlcnBvbGF0ZVBhcmFtcykge1xuICAgICAgICAvLyBJZiB3ZSBoYXZlIGEgaGFuZGxlciBmYWN0b3J5IC0gd2UgbWlnaHQgYWxzbyBjYWxsIGl0IGhlcmUgdG8gZGV0ZXJtaW5lIGlmIGl0IHByb3ZpZGVzXG4gICAgICAgIC8vIGEgZGVmYXVsdCB0ZXh0IGZvciBhIHRyYW5zbGF0aW9uaWQgdGhhdCBjYW4ndCBiZSBmb3VuZCBhbnl3aGVyZSBpbiBvdXIgdGFibGVzXG4gICAgICAgIGlmICgkbWlzc2luZ1RyYW5zbGF0aW9uSGFuZGxlckZhY3RvcnkpIHtcbiAgICAgICAgICB2YXIgcmVzdWx0U3RyaW5nID0gJGluamVjdG9yLmdldCgkbWlzc2luZ1RyYW5zbGF0aW9uSGFuZGxlckZhY3RvcnkpKHRyYW5zbGF0aW9uSWQsICR1c2VzLCBpbnRlcnBvbGF0ZVBhcmFtcyk7XG4gICAgICAgICAgaWYgKHJlc3VsdFN0cmluZyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0U3RyaW5nO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdHJhbnNsYXRpb25JZDtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIHRyYW5zbGF0aW9uSWQ7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIC8qKlxuICAgICAgICogQG5hbWUgcmVzb2x2ZUZvckZhbGxiYWNrTGFuZ3VhZ2VcbiAgICAgICAqIEBwcml2YXRlXG4gICAgICAgKlxuICAgICAgICogUmVjdXJzaXZlIGhlbHBlciBmdW5jdGlvbiBmb3IgZmFsbGJhY2tUcmFuc2xhdGlvbiB0aGF0IHdpbGwgc2VxdWVudGlhbGx5IGxvb2tcbiAgICAgICAqIGZvciBhIHRyYW5zbGF0aW9uIGluIHRoZSBmYWxsYmFja0xhbmd1YWdlcyBzdGFydGluZyB3aXRoIGZhbGxiYWNrTGFuZ3VhZ2VJbmRleC5cbiAgICAgICAqXG4gICAgICAgKiBAcGFyYW0gZmFsbGJhY2tMYW5ndWFnZUluZGV4XG4gICAgICAgKiBAcGFyYW0gdHJhbnNsYXRpb25JZFxuICAgICAgICogQHBhcmFtIGludGVycG9sYXRlUGFyYW1zXG4gICAgICAgKiBAcGFyYW0gSW50ZXJwb2xhdG9yXG4gICAgICAgKiBAcmV0dXJucyB7US5wcm9taXNlfSBQcm9taXNlIHRoYXQgd2lsbCByZXNvbHZlIHRvIHRoZSB0cmFuc2xhdGlvbi5cbiAgICAgICAqL1xuICAgICAgdmFyIHJlc29sdmVGb3JGYWxsYmFja0xhbmd1YWdlID0gZnVuY3Rpb24gKGZhbGxiYWNrTGFuZ3VhZ2VJbmRleCwgdHJhbnNsYXRpb25JZCwgaW50ZXJwb2xhdGVQYXJhbXMsIEludGVycG9sYXRvciwgZGVmYXVsdFRyYW5zbGF0aW9uVGV4dCkge1xuICAgICAgICB2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xuXG4gICAgICAgIGlmIChmYWxsYmFja0xhbmd1YWdlSW5kZXggPCAkZmFsbGJhY2tMYW5ndWFnZS5sZW5ndGgpIHtcbiAgICAgICAgICB2YXIgbGFuZ0tleSA9ICRmYWxsYmFja0xhbmd1YWdlW2ZhbGxiYWNrTGFuZ3VhZ2VJbmRleF07XG4gICAgICAgICAgZ2V0RmFsbGJhY2tUcmFuc2xhdGlvbihsYW5nS2V5LCB0cmFuc2xhdGlvbklkLCBpbnRlcnBvbGF0ZVBhcmFtcywgSW50ZXJwb2xhdG9yKS50aGVuKFxuICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSxcbiAgICAgICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgLy8gTG9vayBpbiB0aGUgbmV4dCBmYWxsYmFjayBsYW5ndWFnZSBmb3IgYSB0cmFuc2xhdGlvbi5cbiAgICAgICAgICAgICAgLy8gSXQgZGVsYXlzIHRoZSByZXNvbHZpbmcgYnkgcGFzc2luZyBhbm90aGVyIHByb21pc2UgdG8gcmVzb2x2ZS5cbiAgICAgICAgICAgICAgcmVzb2x2ZUZvckZhbGxiYWNrTGFuZ3VhZ2UoZmFsbGJhY2tMYW5ndWFnZUluZGV4ICsgMSwgdHJhbnNsYXRpb25JZCwgaW50ZXJwb2xhdGVQYXJhbXMsIEludGVycG9sYXRvciwgZGVmYXVsdFRyYW5zbGF0aW9uVGV4dCkudGhlbihkZWZlcnJlZC5yZXNvbHZlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIE5vIHRyYW5zbGF0aW9uIGZvdW5kIGluIGFueSBmYWxsYmFjayBsYW5ndWFnZVxuICAgICAgICAgIC8vIGlmIGEgZGVmYXVsdCB0cmFuc2xhdGlvbiB0ZXh0IGlzIHNldCBpbiB0aGUgZGlyZWN0aXZlLCB0aGVuIHJldHVybiB0aGlzIGFzIGEgcmVzdWx0XG4gICAgICAgICAgaWYgKGRlZmF1bHRUcmFuc2xhdGlvblRleHQpIHtcbiAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoZGVmYXVsdFRyYW5zbGF0aW9uVGV4dCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIGlmIG5vIGRlZmF1bHQgdHJhbnNsYXRpb24gaXMgc2V0IGFuZCBhbiBlcnJvciBoYW5kbGVyIGlzIGRlZmluZWQsIHNlbmQgaXQgdG8gdGhlIGhhbmRsZXJcbiAgICAgICAgICAgIC8vIGFuZCB0aGVuIHJldHVybiB0aGUgcmVzdWx0XG4gICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHRyYW5zbGF0ZUJ5SGFuZGxlcih0cmFuc2xhdGlvbklkLCBpbnRlcnBvbGF0ZVBhcmFtcykpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICAgIH07XG5cbiAgICAgIC8qKlxuICAgICAgICogQG5hbWUgcmVzb2x2ZUZvckZhbGxiYWNrTGFuZ3VhZ2VJbnN0YW50XG4gICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICpcbiAgICAgICAqIFJlY3Vyc2l2ZSBoZWxwZXIgZnVuY3Rpb24gZm9yIGZhbGxiYWNrVHJhbnNsYXRpb24gdGhhdCB3aWxsIHNlcXVlbnRpYWxseSBsb29rXG4gICAgICAgKiBmb3IgYSB0cmFuc2xhdGlvbiBpbiB0aGUgZmFsbGJhY2tMYW5ndWFnZXMgc3RhcnRpbmcgd2l0aCBmYWxsYmFja0xhbmd1YWdlSW5kZXguXG4gICAgICAgKlxuICAgICAgICogQHBhcmFtIGZhbGxiYWNrTGFuZ3VhZ2VJbmRleFxuICAgICAgICogQHBhcmFtIHRyYW5zbGF0aW9uSWRcbiAgICAgICAqIEBwYXJhbSBpbnRlcnBvbGF0ZVBhcmFtc1xuICAgICAgICogQHBhcmFtIEludGVycG9sYXRvclxuICAgICAgICogQHJldHVybnMge3N0cmluZ30gdHJhbnNsYXRpb25cbiAgICAgICAqL1xuICAgICAgdmFyIHJlc29sdmVGb3JGYWxsYmFja0xhbmd1YWdlSW5zdGFudCA9IGZ1bmN0aW9uIChmYWxsYmFja0xhbmd1YWdlSW5kZXgsIHRyYW5zbGF0aW9uSWQsIGludGVycG9sYXRlUGFyYW1zLCBJbnRlcnBvbGF0b3IpIHtcbiAgICAgICAgdmFyIHJlc3VsdDtcblxuICAgICAgICBpZiAoZmFsbGJhY2tMYW5ndWFnZUluZGV4IDwgJGZhbGxiYWNrTGFuZ3VhZ2UubGVuZ3RoKSB7XG4gICAgICAgICAgdmFyIGxhbmdLZXkgPSAkZmFsbGJhY2tMYW5ndWFnZVtmYWxsYmFja0xhbmd1YWdlSW5kZXhdO1xuICAgICAgICAgIHJlc3VsdCA9IGdldEZhbGxiYWNrVHJhbnNsYXRpb25JbnN0YW50KGxhbmdLZXksIHRyYW5zbGF0aW9uSWQsIGludGVycG9sYXRlUGFyYW1zLCBJbnRlcnBvbGF0b3IpO1xuICAgICAgICAgIGlmICghcmVzdWx0KSB7XG4gICAgICAgICAgICByZXN1bHQgPSByZXNvbHZlRm9yRmFsbGJhY2tMYW5ndWFnZUluc3RhbnQoZmFsbGJhY2tMYW5ndWFnZUluZGV4ICsgMSwgdHJhbnNsYXRpb25JZCwgaW50ZXJwb2xhdGVQYXJhbXMsIEludGVycG9sYXRvcik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9O1xuXG4gICAgICAvKipcbiAgICAgICAqIFRyYW5zbGF0ZXMgd2l0aCB0aGUgdXNhZ2Ugb2YgdGhlIGZhbGxiYWNrIGxhbmd1YWdlcy5cbiAgICAgICAqXG4gICAgICAgKiBAcGFyYW0gdHJhbnNsYXRpb25JZFxuICAgICAgICogQHBhcmFtIGludGVycG9sYXRlUGFyYW1zXG4gICAgICAgKiBAcGFyYW0gSW50ZXJwb2xhdG9yXG4gICAgICAgKiBAcmV0dXJucyB7US5wcm9taXNlfSBQcm9taXNlLCB0aGF0IHJlc29sdmVzIHRvIHRoZSB0cmFuc2xhdGlvbi5cbiAgICAgICAqL1xuICAgICAgdmFyIGZhbGxiYWNrVHJhbnNsYXRpb24gPSBmdW5jdGlvbiAodHJhbnNsYXRpb25JZCwgaW50ZXJwb2xhdGVQYXJhbXMsIEludGVycG9sYXRvciwgZGVmYXVsdFRyYW5zbGF0aW9uVGV4dCkge1xuICAgICAgICAvLyBTdGFydCB3aXRoIHRoZSBmYWxsYmFja0xhbmd1YWdlIHdpdGggaW5kZXggMFxuICAgICAgICByZXR1cm4gcmVzb2x2ZUZvckZhbGxiYWNrTGFuZ3VhZ2UoKHN0YXJ0RmFsbGJhY2tJdGVyYXRpb24+MCA/IHN0YXJ0RmFsbGJhY2tJdGVyYXRpb24gOiBmYWxsYmFja0luZGV4KSwgdHJhbnNsYXRpb25JZCwgaW50ZXJwb2xhdGVQYXJhbXMsIEludGVycG9sYXRvciwgZGVmYXVsdFRyYW5zbGF0aW9uVGV4dCk7XG4gICAgICB9O1xuXG4gICAgICAvKipcbiAgICAgICAqIFRyYW5zbGF0ZXMgd2l0aCB0aGUgdXNhZ2Ugb2YgdGhlIGZhbGxiYWNrIGxhbmd1YWdlcy5cbiAgICAgICAqXG4gICAgICAgKiBAcGFyYW0gdHJhbnNsYXRpb25JZFxuICAgICAgICogQHBhcmFtIGludGVycG9sYXRlUGFyYW1zXG4gICAgICAgKiBAcGFyYW0gSW50ZXJwb2xhdG9yXG4gICAgICAgKiBAcmV0dXJucyB7U3RyaW5nfSB0cmFuc2xhdGlvblxuICAgICAgICovXG4gICAgICB2YXIgZmFsbGJhY2tUcmFuc2xhdGlvbkluc3RhbnQgPSBmdW5jdGlvbiAodHJhbnNsYXRpb25JZCwgaW50ZXJwb2xhdGVQYXJhbXMsIEludGVycG9sYXRvcikge1xuICAgICAgICAvLyBTdGFydCB3aXRoIHRoZSBmYWxsYmFja0xhbmd1YWdlIHdpdGggaW5kZXggMFxuICAgICAgICByZXR1cm4gcmVzb2x2ZUZvckZhbGxiYWNrTGFuZ3VhZ2VJbnN0YW50KChzdGFydEZhbGxiYWNrSXRlcmF0aW9uPjAgPyBzdGFydEZhbGxiYWNrSXRlcmF0aW9uIDogZmFsbGJhY2tJbmRleCksIHRyYW5zbGF0aW9uSWQsIGludGVycG9sYXRlUGFyYW1zLCBJbnRlcnBvbGF0b3IpO1xuICAgICAgfTtcblxuICAgICAgdmFyIGRldGVybWluZVRyYW5zbGF0aW9uID0gZnVuY3Rpb24gKHRyYW5zbGF0aW9uSWQsIGludGVycG9sYXRlUGFyYW1zLCBpbnRlcnBvbGF0aW9uSWQsIGRlZmF1bHRUcmFuc2xhdGlvblRleHQpIHtcblxuICAgICAgICB2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xuXG4gICAgICAgIHZhciB0YWJsZSA9ICR1c2VzID8gJHRyYW5zbGF0aW9uVGFibGVbJHVzZXNdIDogJHRyYW5zbGF0aW9uVGFibGUsXG4gICAgICAgICAgICBJbnRlcnBvbGF0b3IgPSAoaW50ZXJwb2xhdGlvbklkKSA/IGludGVycG9sYXRvckhhc2hNYXBbaW50ZXJwb2xhdGlvbklkXSA6IGRlZmF1bHRJbnRlcnBvbGF0b3I7XG5cbiAgICAgICAgLy8gaWYgdGhlIHRyYW5zbGF0aW9uIGlkIGV4aXN0cywgd2UgY2FuIGp1c3QgaW50ZXJwb2xhdGUgaXRcbiAgICAgICAgaWYgKHRhYmxlICYmIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCh0YWJsZSwgdHJhbnNsYXRpb25JZCkpIHtcbiAgICAgICAgICB2YXIgdHJhbnNsYXRpb24gPSB0YWJsZVt0cmFuc2xhdGlvbklkXTtcblxuICAgICAgICAgIC8vIElmIHVzaW5nIGxpbmssIHJlcnVuICR0cmFuc2xhdGUgd2l0aCBsaW5rZWQgdHJhbnNsYXRpb25JZCBhbmQgcmV0dXJuIGl0XG4gICAgICAgICAgaWYgKHRyYW5zbGF0aW9uLnN1YnN0cigwLCAyKSA9PT0gJ0A6Jykge1xuXG4gICAgICAgICAgICAkdHJhbnNsYXRlKHRyYW5zbGF0aW9uLnN1YnN0cigyKSwgaW50ZXJwb2xhdGVQYXJhbXMsIGludGVycG9sYXRpb25JZCwgZGVmYXVsdFRyYW5zbGF0aW9uVGV4dClcbiAgICAgICAgICAgICAgLnRoZW4oZGVmZXJyZWQucmVzb2x2ZSwgZGVmZXJyZWQucmVqZWN0KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShJbnRlcnBvbGF0b3IuaW50ZXJwb2xhdGUodHJhbnNsYXRpb24sIGludGVycG9sYXRlUGFyYW1zKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhciBtaXNzaW5nVHJhbnNsYXRpb25IYW5kbGVyVHJhbnNsYXRpb247XG4gICAgICAgICAgLy8gZm9yIGxvZ2dpbmcgcHVycG9zZXMgb25seSAoYXMgaW4gJHRyYW5zbGF0ZU1pc3NpbmdUcmFuc2xhdGlvbkhhbmRsZXJMb2cpLCB2YWx1ZSBpcyBub3QgcmV0dXJuZWQgdG8gcHJvbWlzZVxuICAgICAgICAgIGlmICgkbWlzc2luZ1RyYW5zbGF0aW9uSGFuZGxlckZhY3RvcnkgJiYgIXBlbmRpbmdMb2FkZXIpIHtcbiAgICAgICAgICAgIG1pc3NpbmdUcmFuc2xhdGlvbkhhbmRsZXJUcmFuc2xhdGlvbiA9IHRyYW5zbGF0ZUJ5SGFuZGxlcih0cmFuc2xhdGlvbklkLCBpbnRlcnBvbGF0ZVBhcmFtcyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gc2luY2Ugd2UgY291bGRuJ3QgdHJhbnNsYXRlIHRoZSBpbml0YWwgcmVxdWVzdGVkIHRyYW5zbGF0aW9uIGlkLFxuICAgICAgICAgIC8vIHdlIHRyeSBpdCBub3cgd2l0aCBvbmUgb3IgbW9yZSBmYWxsYmFjayBsYW5ndWFnZXMsIGlmIGZhbGxiYWNrIGxhbmd1YWdlKHMpIGlzXG4gICAgICAgICAgLy8gY29uZmlndXJlZC5cbiAgICAgICAgICBpZiAoJHVzZXMgJiYgJGZhbGxiYWNrTGFuZ3VhZ2UgJiYgJGZhbGxiYWNrTGFuZ3VhZ2UubGVuZ3RoKSB7XG4gICAgICAgICAgICBmYWxsYmFja1RyYW5zbGF0aW9uKHRyYW5zbGF0aW9uSWQsIGludGVycG9sYXRlUGFyYW1zLCBJbnRlcnBvbGF0b3IsIGRlZmF1bHRUcmFuc2xhdGlvblRleHQpXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHRyYW5zbGF0aW9uKSB7XG4gICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHRyYW5zbGF0aW9uKTtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoX3RyYW5zbGF0aW9uSWQpIHtcbiAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdChhcHBseU5vdEZvdW5kSW5kaWNhdG9ycyhfdHJhbnNsYXRpb25JZCkpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gZWxzZSBpZiAoJG1pc3NpbmdUcmFuc2xhdGlvbkhhbmRsZXJGYWN0b3J5ICYmICFwZW5kaW5nTG9hZGVyICYmIG1pc3NpbmdUcmFuc2xhdGlvbkhhbmRsZXJUcmFuc2xhdGlvbikge1xuICAgICAgICAgICAgLy8gbG9va3MgbGlrZSB0aGUgcmVxdWVzdGVkIHRyYW5zbGF0aW9uIGlkIGRvZXNuJ3QgZXhpc3RzLlxuICAgICAgICAgICAgLy8gTm93LCBpZiB0aGVyZSBpcyBhIHJlZ2lzdGVyZWQgaGFuZGxlciBmb3IgbWlzc2luZyB0cmFuc2xhdGlvbnMgYW5kIG5vXG4gICAgICAgICAgICAvLyBhc3luY0xvYWRlciBpcyBwZW5kaW5nLCB3ZSBleGVjdXRlIHRoZSBoYW5kbGVyXG4gICAgICAgICAgICBpZiAoZGVmYXVsdFRyYW5zbGF0aW9uVGV4dCkge1xuICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKGRlZmF1bHRUcmFuc2xhdGlvblRleHQpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUobWlzc2luZ1RyYW5zbGF0aW9uSGFuZGxlclRyYW5zbGF0aW9uKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoZGVmYXVsdFRyYW5zbGF0aW9uVGV4dCkge1xuICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKGRlZmF1bHRUcmFuc2xhdGlvblRleHQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KGFwcGx5Tm90Rm91bmRJbmRpY2F0b3JzKHRyYW5zbGF0aW9uSWQpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG4gICAgICB9O1xuXG4gICAgICB2YXIgZGV0ZXJtaW5lVHJhbnNsYXRpb25JbnN0YW50ID0gZnVuY3Rpb24gKHRyYW5zbGF0aW9uSWQsIGludGVycG9sYXRlUGFyYW1zLCBpbnRlcnBvbGF0aW9uSWQpIHtcblxuICAgICAgICB2YXIgcmVzdWx0LCB0YWJsZSA9ICR1c2VzID8gJHRyYW5zbGF0aW9uVGFibGVbJHVzZXNdIDogJHRyYW5zbGF0aW9uVGFibGUsXG4gICAgICAgICAgICBJbnRlcnBvbGF0b3IgPSBkZWZhdWx0SW50ZXJwb2xhdG9yO1xuXG4gICAgICAgIC8vIGlmIHRoZSBpbnRlcnBvbGF0aW9uIGlkIGV4aXN0cyB1c2UgY3VzdG9tIGludGVycG9sYXRvclxuICAgICAgICBpZiAoaW50ZXJwb2xhdG9ySGFzaE1hcCAmJiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoaW50ZXJwb2xhdG9ySGFzaE1hcCwgaW50ZXJwb2xhdGlvbklkKSkge1xuICAgICAgICAgIEludGVycG9sYXRvciA9IGludGVycG9sYXRvckhhc2hNYXBbaW50ZXJwb2xhdGlvbklkXTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGlmIHRoZSB0cmFuc2xhdGlvbiBpZCBleGlzdHMsIHdlIGNhbiBqdXN0IGludGVycG9sYXRlIGl0XG4gICAgICAgIGlmICh0YWJsZSAmJiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwodGFibGUsIHRyYW5zbGF0aW9uSWQpKSB7XG4gICAgICAgICAgdmFyIHRyYW5zbGF0aW9uID0gdGFibGVbdHJhbnNsYXRpb25JZF07XG5cbiAgICAgICAgICAvLyBJZiB1c2luZyBsaW5rLCByZXJ1biAkdHJhbnNsYXRlIHdpdGggbGlua2VkIHRyYW5zbGF0aW9uSWQgYW5kIHJldHVybiBpdFxuICAgICAgICAgIGlmICh0cmFuc2xhdGlvbi5zdWJzdHIoMCwgMikgPT09ICdAOicpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGRldGVybWluZVRyYW5zbGF0aW9uSW5zdGFudCh0cmFuc2xhdGlvbi5zdWJzdHIoMiksIGludGVycG9sYXRlUGFyYW1zLCBpbnRlcnBvbGF0aW9uSWQpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQgPSBJbnRlcnBvbGF0b3IuaW50ZXJwb2xhdGUodHJhbnNsYXRpb24sIGludGVycG9sYXRlUGFyYW1zKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFyIG1pc3NpbmdUcmFuc2xhdGlvbkhhbmRsZXJUcmFuc2xhdGlvbjtcbiAgICAgICAgICAvLyBmb3IgbG9nZ2luZyBwdXJwb3NlcyBvbmx5IChhcyBpbiAkdHJhbnNsYXRlTWlzc2luZ1RyYW5zbGF0aW9uSGFuZGxlckxvZyksIHZhbHVlIGlzIG5vdCByZXR1cm5lZCB0byBwcm9taXNlXG4gICAgICAgICAgaWYgKCRtaXNzaW5nVHJhbnNsYXRpb25IYW5kbGVyRmFjdG9yeSAmJiAhcGVuZGluZ0xvYWRlcikge1xuICAgICAgICAgICAgbWlzc2luZ1RyYW5zbGF0aW9uSGFuZGxlclRyYW5zbGF0aW9uID0gdHJhbnNsYXRlQnlIYW5kbGVyKHRyYW5zbGF0aW9uSWQsIGludGVycG9sYXRlUGFyYW1zKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBzaW5jZSB3ZSBjb3VsZG4ndCB0cmFuc2xhdGUgdGhlIGluaXRhbCByZXF1ZXN0ZWQgdHJhbnNsYXRpb24gaWQsXG4gICAgICAgICAgLy8gd2UgdHJ5IGl0IG5vdyB3aXRoIG9uZSBvciBtb3JlIGZhbGxiYWNrIGxhbmd1YWdlcywgaWYgZmFsbGJhY2sgbGFuZ3VhZ2UocykgaXNcbiAgICAgICAgICAvLyBjb25maWd1cmVkLlxuICAgICAgICAgIGlmICgkdXNlcyAmJiAkZmFsbGJhY2tMYW5ndWFnZSAmJiAkZmFsbGJhY2tMYW5ndWFnZS5sZW5ndGgpIHtcbiAgICAgICAgICAgIGZhbGxiYWNrSW5kZXggPSAwO1xuICAgICAgICAgICAgcmVzdWx0ID0gZmFsbGJhY2tUcmFuc2xhdGlvbkluc3RhbnQodHJhbnNsYXRpb25JZCwgaW50ZXJwb2xhdGVQYXJhbXMsIEludGVycG9sYXRvcik7XG4gICAgICAgICAgfSBlbHNlIGlmICgkbWlzc2luZ1RyYW5zbGF0aW9uSGFuZGxlckZhY3RvcnkgJiYgIXBlbmRpbmdMb2FkZXIgJiYgbWlzc2luZ1RyYW5zbGF0aW9uSGFuZGxlclRyYW5zbGF0aW9uKSB7XG4gICAgICAgICAgICAvLyBsb29rcyBsaWtlIHRoZSByZXF1ZXN0ZWQgdHJhbnNsYXRpb24gaWQgZG9lc24ndCBleGlzdHMuXG4gICAgICAgICAgICAvLyBOb3csIGlmIHRoZXJlIGlzIGEgcmVnaXN0ZXJlZCBoYW5kbGVyIGZvciBtaXNzaW5nIHRyYW5zbGF0aW9ucyBhbmQgbm9cbiAgICAgICAgICAgIC8vIGFzeW5jTG9hZGVyIGlzIHBlbmRpbmcsIHdlIGV4ZWN1dGUgdGhlIGhhbmRsZXJcbiAgICAgICAgICAgIHJlc3VsdCA9IG1pc3NpbmdUcmFuc2xhdGlvbkhhbmRsZXJUcmFuc2xhdGlvbjtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0ID0gYXBwbHlOb3RGb3VuZEluZGljYXRvcnModHJhbnNsYXRpb25JZCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH07XG5cbiAgICAgIHZhciBjbGVhck5leHRMYW5nQW5kUHJvbWlzZSA9IGZ1bmN0aW9uKGtleSkge1xuICAgICAgICBpZiAoJG5leHRMYW5nID09PSBrZXkpIHtcbiAgICAgICAgICAkbmV4dExhbmcgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgbGFuZ1Byb21pc2VzW2tleV0gPSB1bmRlZmluZWQ7XG4gICAgICB9O1xuXG4gICAgICAvKipcbiAgICAgICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgICAgICogQG5hbWUgcGFzY2FscHJlY2h0LnRyYW5zbGF0ZS4kdHJhbnNsYXRlI3ByZWZlcnJlZExhbmd1YWdlXG4gICAgICAgKiBAbWV0aG9kT2YgcGFzY2FscHJlY2h0LnRyYW5zbGF0ZS4kdHJhbnNsYXRlXG4gICAgICAgKlxuICAgICAgICogQGRlc2NyaXB0aW9uXG4gICAgICAgKiBSZXR1cm5zIHRoZSBsYW5ndWFnZSBrZXkgZm9yIHRoZSBwcmVmZXJyZWQgbGFuZ3VhZ2UuXG4gICAgICAgKlxuICAgICAgICogQHBhcmFtIHtzdHJpbmd9IGxhbmdLZXkgbGFuZ3VhZ2UgU3RyaW5nIG9yIEFycmF5IHRvIGJlIHVzZWQgYXMgcHJlZmVycmVkTGFuZ3VhZ2UgKGNoYW5naW5nIGF0IHJ1bnRpbWUpXG4gICAgICAgKlxuICAgICAgICogQHJldHVybiB7c3RyaW5nfSBwcmVmZXJyZWQgbGFuZ3VhZ2Uga2V5XG4gICAgICAgKi9cbiAgICAgICR0cmFuc2xhdGUucHJlZmVycmVkTGFuZ3VhZ2UgPSBmdW5jdGlvbiAobGFuZ0tleSkge1xuICAgICAgICBpZihsYW5nS2V5KSB7XG4gICAgICAgICAgc2V0dXBQcmVmZXJyZWRMYW5ndWFnZShsYW5nS2V5KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJHByZWZlcnJlZExhbmd1YWdlO1xuICAgICAgfTtcblxuICAgICAgLyoqXG4gICAgICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICAgICAqIEBuYW1lIHBhc2NhbHByZWNodC50cmFuc2xhdGUuJHRyYW5zbGF0ZSNjbG9ha0NsYXNzTmFtZVxuICAgICAgICogQG1ldGhvZE9mIHBhc2NhbHByZWNodC50cmFuc2xhdGUuJHRyYW5zbGF0ZVxuICAgICAgICpcbiAgICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAgICogUmV0dXJucyB0aGUgY29uZmlndXJlZCBjbGFzcyBuYW1lIGZvciBgdHJhbnNsYXRlLWNsb2FrYCBkaXJlY3RpdmUuXG4gICAgICAgKlxuICAgICAgICogQHJldHVybiB7c3RyaW5nfSBjbG9ha0NsYXNzTmFtZVxuICAgICAgICovXG4gICAgICAkdHJhbnNsYXRlLmNsb2FrQ2xhc3NOYW1lID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gJGNsb2FrQ2xhc3NOYW1lO1xuICAgICAgfTtcblxuICAgICAgLyoqXG4gICAgICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICAgICAqIEBuYW1lIHBhc2NhbHByZWNodC50cmFuc2xhdGUuJHRyYW5zbGF0ZSNmYWxsYmFja0xhbmd1YWdlXG4gICAgICAgKiBAbWV0aG9kT2YgcGFzY2FscHJlY2h0LnRyYW5zbGF0ZS4kdHJhbnNsYXRlXG4gICAgICAgKlxuICAgICAgICogQGRlc2NyaXB0aW9uXG4gICAgICAgKiBSZXR1cm5zIHRoZSBsYW5ndWFnZSBrZXkgZm9yIHRoZSBmYWxsYmFjayBsYW5ndWFnZXMgb3Igc2V0cyBhIG5ldyBmYWxsYmFjayBzdGFjay5cbiAgICAgICAqXG4gICAgICAgKiBAcGFyYW0ge3N0cmluZz19IGxhbmdLZXkgbGFuZ3VhZ2UgU3RyaW5nIG9yIEFycmF5IG9mIGZhbGxiYWNrIGxhbmd1YWdlcyB0byBiZSB1c2VkICh0byBjaGFuZ2Ugc3RhY2sgYXQgcnVudGltZSlcbiAgICAgICAqXG4gICAgICAgKiBAcmV0dXJuIHtzdHJpbmd8fGFycmF5fSBmYWxsYmFjayBsYW5ndWFnZSBrZXlcbiAgICAgICAqL1xuICAgICAgJHRyYW5zbGF0ZS5mYWxsYmFja0xhbmd1YWdlID0gZnVuY3Rpb24gKGxhbmdLZXkpIHtcbiAgICAgICAgaWYgKGxhbmdLZXkgIT09IHVuZGVmaW5lZCAmJiBsYW5nS2V5ICE9PSBudWxsKSB7XG4gICAgICAgICAgZmFsbGJhY2tTdGFjayhsYW5nS2V5KTtcblxuICAgICAgICAgIC8vIGFzIHdlIG1pZ2h0IGhhdmUgYW4gYXN5bmMgbG9hZGVyIGluaXRpYXRlZCBhbmQgYSBuZXcgdHJhbnNsYXRpb24gbGFuZ3VhZ2UgbWlnaHQgaGF2ZSBiZWVuIGRlZmluZWRcbiAgICAgICAgICAvLyB3ZSBuZWVkIHRvIGFkZCB0aGUgcHJvbWlzZSB0byB0aGUgc3RhY2sgYWxzby4gU28gLSBpdGVyYXRlLlxuICAgICAgICAgIGlmICgkbG9hZGVyRmFjdG9yeSkge1xuICAgICAgICAgICAgaWYgKCRmYWxsYmFja0xhbmd1YWdlICYmICRmYWxsYmFja0xhbmd1YWdlLmxlbmd0aCkge1xuICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gJGZhbGxiYWNrTGFuZ3VhZ2UubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoIWxhbmdQcm9taXNlc1skZmFsbGJhY2tMYW5ndWFnZVtpXV0pIHtcbiAgICAgICAgICAgICAgICAgIGxhbmdQcm9taXNlc1skZmFsbGJhY2tMYW5ndWFnZVtpXV0gPSBsb2FkQXN5bmMoJGZhbGxiYWNrTGFuZ3VhZ2VbaV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICAkdHJhbnNsYXRlLnVzZSgkdHJhbnNsYXRlLnVzZSgpKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoJGZhbGxiYWNrV2FzU3RyaW5nKSB7XG4gICAgICAgICAgcmV0dXJuICRmYWxsYmFja0xhbmd1YWdlWzBdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiAkZmFsbGJhY2tMYW5ndWFnZTtcbiAgICAgICAgfVxuXG4gICAgICB9O1xuXG4gICAgICAvKipcbiAgICAgICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgICAgICogQG5hbWUgcGFzY2FscHJlY2h0LnRyYW5zbGF0ZS4kdHJhbnNsYXRlI3VzZUZhbGxiYWNrTGFuZ3VhZ2VcbiAgICAgICAqIEBtZXRob2RPZiBwYXNjYWxwcmVjaHQudHJhbnNsYXRlLiR0cmFuc2xhdGVcbiAgICAgICAqXG4gICAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgICAqIFNldHMgdGhlIGZpcnN0IGtleSBvZiB0aGUgZmFsbGJhY2sgbGFuZ3VhZ2Ugc3RhY2sgdG8gYmUgdXNlZCBmb3IgdHJhbnNsYXRpb24uXG4gICAgICAgKiBUaGVyZWZvcmUgYWxsIGxhbmd1YWdlcyBpbiB0aGUgZmFsbGJhY2sgYXJyYXkgQkVGT1JFIHRoaXMga2V5IHdpbGwgYmUgc2tpcHBlZCFcbiAgICAgICAqXG4gICAgICAgKiBAcGFyYW0ge3N0cmluZz19IGxhbmdLZXkgQ29udGFpbnMgdGhlIGxhbmdLZXkgdGhlIGl0ZXJhdGlvbiBzaGFsbCBzdGFydCB3aXRoLiBTZXQgdG8gZmFsc2UgaWYgeW91IHdhbnQgdG9cbiAgICAgICAqIGdldCBiYWNrIHRvIHRoZSB3aG9sZSBzdGFja1xuICAgICAgICovXG4gICAgICAkdHJhbnNsYXRlLnVzZUZhbGxiYWNrTGFuZ3VhZ2UgPSBmdW5jdGlvbiAobGFuZ0tleSkge1xuICAgICAgICBpZiAobGFuZ0tleSAhPT0gdW5kZWZpbmVkICYmIGxhbmdLZXkgIT09IG51bGwpIHtcbiAgICAgICAgICBpZiAoIWxhbmdLZXkpIHtcbiAgICAgICAgICAgIHN0YXJ0RmFsbGJhY2tJdGVyYXRpb24gPSAwO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgbGFuZ0tleVBvc2l0aW9uID0gaW5kZXhPZigkZmFsbGJhY2tMYW5ndWFnZSwgbGFuZ0tleSk7XG4gICAgICAgICAgICBpZiAobGFuZ0tleVBvc2l0aW9uID4gLTEpIHtcbiAgICAgICAgICAgICAgc3RhcnRGYWxsYmFja0l0ZXJhdGlvbiA9IGxhbmdLZXlQb3NpdGlvbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgfVxuXG4gICAgICB9O1xuXG4gICAgICAvKipcbiAgICAgICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgICAgICogQG5hbWUgcGFzY2FscHJlY2h0LnRyYW5zbGF0ZS4kdHJhbnNsYXRlI3Byb3Bvc2VkTGFuZ3VhZ2VcbiAgICAgICAqIEBtZXRob2RPZiBwYXNjYWxwcmVjaHQudHJhbnNsYXRlLiR0cmFuc2xhdGVcbiAgICAgICAqXG4gICAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgICAqIFJldHVybnMgdGhlIGxhbmd1YWdlIGtleSBvZiBsYW5ndWFnZSB0aGF0IGlzIGN1cnJlbnRseSBsb2FkZWQgYXN5bmNocm9ub3VzbHkuXG4gICAgICAgKlxuICAgICAgICogQHJldHVybiB7c3RyaW5nfSBsYW5ndWFnZSBrZXlcbiAgICAgICAqL1xuICAgICAgJHRyYW5zbGF0ZS5wcm9wb3NlZExhbmd1YWdlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gJG5leHRMYW5nO1xuICAgICAgfTtcblxuICAgICAgLyoqXG4gICAgICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICAgICAqIEBuYW1lIHBhc2NhbHByZWNodC50cmFuc2xhdGUuJHRyYW5zbGF0ZSNzdG9yYWdlXG4gICAgICAgKiBAbWV0aG9kT2YgcGFzY2FscHJlY2h0LnRyYW5zbGF0ZS4kdHJhbnNsYXRlXG4gICAgICAgKlxuICAgICAgICogQGRlc2NyaXB0aW9uXG4gICAgICAgKiBSZXR1cm5zIHJlZ2lzdGVyZWQgc3RvcmFnZS5cbiAgICAgICAqXG4gICAgICAgKiBAcmV0dXJuIHtvYmplY3R9IFN0b3JhZ2VcbiAgICAgICAqL1xuICAgICAgJHRyYW5zbGF0ZS5zdG9yYWdlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gU3RvcmFnZTtcbiAgICAgIH07XG5cbiAgICAgIC8qKlxuICAgICAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAgICAgKiBAbmFtZSBwYXNjYWxwcmVjaHQudHJhbnNsYXRlLiR0cmFuc2xhdGUjdXNlXG4gICAgICAgKiBAbWV0aG9kT2YgcGFzY2FscHJlY2h0LnRyYW5zbGF0ZS4kdHJhbnNsYXRlXG4gICAgICAgKlxuICAgICAgICogQGRlc2NyaXB0aW9uXG4gICAgICAgKiBUZWxscyBhbmd1bGFyLXRyYW5zbGF0ZSB3aGljaCBsYW5ndWFnZSB0byB1c2UgYnkgZ2l2ZW4gbGFuZ3VhZ2Uga2V5LiBUaGlzIG1ldGhvZCBpc1xuICAgICAgICogdXNlZCB0byBjaGFuZ2UgbGFuZ3VhZ2UgYXQgcnVudGltZS4gSXQgYWxzbyB0YWtlcyBjYXJlIG9mIHN0b3JpbmcgdGhlIGxhbmd1YWdlXG4gICAgICAgKiBrZXkgaW4gYSBjb25maWd1cmVkIHN0b3JlIHRvIGxldCB5b3VyIGFwcCByZW1lbWJlciB0aGUgY2hvb3NlZCBsYW5ndWFnZS5cbiAgICAgICAqXG4gICAgICAgKiBXaGVuIHRyeWluZyB0byAndXNlJyBhIGxhbmd1YWdlIHdoaWNoIGlzbid0IGF2YWlsYWJsZSBpdCB0cmllcyB0byBsb2FkIGl0XG4gICAgICAgKiBhc3luY2hyb25vdXNseSB3aXRoIHJlZ2lzdGVyZWQgbG9hZGVycy5cbiAgICAgICAqXG4gICAgICAgKiBSZXR1cm5zIHByb21pc2Ugb2JqZWN0IHdpdGggbG9hZGVkIGxhbmd1YWdlIGZpbGUgZGF0YVxuICAgICAgICogQGV4YW1wbGVcbiAgICAgICAqICR0cmFuc2xhdGUudXNlKFwiZW5fVVNcIikudGhlbihmdW5jdGlvbihkYXRhKXtcbiAgICAgICAqICAgJHNjb3BlLnRleHQgPSAkdHJhbnNsYXRlKFwiSEVMTE9cIik7XG4gICAgICAgKiB9KTtcbiAgICAgICAqXG4gICAgICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5IExhbmd1YWdlIGtleVxuICAgICAgICogQHJldHVybiB7c3RyaW5nfSBMYW5ndWFnZSBrZXlcbiAgICAgICAqL1xuICAgICAgJHRyYW5zbGF0ZS51c2UgPSBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIGlmICgha2V5KSB7XG4gICAgICAgICAgcmV0dXJuICR1c2VzO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcblxuICAgICAgICAkcm9vdFNjb3BlLiRlbWl0KCckdHJhbnNsYXRlQ2hhbmdlU3RhcnQnLCB7bGFuZ3VhZ2U6IGtleX0pO1xuXG4gICAgICAgIC8vIFRyeSB0byBnZXQgdGhlIGFsaWFzZWQgbGFuZ3VhZ2Uga2V5XG4gICAgICAgIHZhciBhbGlhc2VkS2V5ID0gbmVnb3RpYXRlTG9jYWxlKGtleSk7XG4gICAgICAgIGlmIChhbGlhc2VkS2V5KSB7XG4gICAgICAgICAga2V5ID0gYWxpYXNlZEtleTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGlmIHRoZXJlIGlzbid0IGEgdHJhbnNsYXRpb24gdGFibGUgZm9yIHRoZSBsYW5ndWFnZSB3ZSd2ZSByZXF1ZXN0ZWQsXG4gICAgICAgIC8vIHdlIGxvYWQgaXQgYXN5bmNocm9ub3VzbHlcbiAgICAgICAgaWYgKCgkZm9yY2VBc3luY1JlbG9hZEVuYWJsZWQgfHwgISR0cmFuc2xhdGlvblRhYmxlW2tleV0pICYmICRsb2FkZXJGYWN0b3J5ICYmICFsYW5nUHJvbWlzZXNba2V5XSkge1xuICAgICAgICAgICRuZXh0TGFuZyA9IGtleTtcbiAgICAgICAgICBsYW5nUHJvbWlzZXNba2V5XSA9IGxvYWRBc3luYyhrZXkpLnRoZW4oZnVuY3Rpb24gKHRyYW5zbGF0aW9uKSB7XG4gICAgICAgICAgICB0cmFuc2xhdGlvbnModHJhbnNsYXRpb24ua2V5LCB0cmFuc2xhdGlvbi50YWJsZSk7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHRyYW5zbGF0aW9uLmtleSk7XG4gICAgICAgICAgICB1c2VMYW5ndWFnZSh0cmFuc2xhdGlvbi5rZXkpO1xuICAgICAgICAgICAgcmV0dXJuIHRyYW5zbGF0aW9uO1xuICAgICAgICAgIH0sIGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgICRyb290U2NvcGUuJGVtaXQoJyR0cmFuc2xhdGVDaGFuZ2VFcnJvcicsIHtsYW5ndWFnZToga2V5fSk7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZWplY3Qoa2V5KTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJGVtaXQoJyR0cmFuc2xhdGVDaGFuZ2VFbmQnLCB7bGFuZ3VhZ2U6IGtleX0pO1xuICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChrZXkpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIGxhbmdQcm9taXNlc1trZXldWydmaW5hbGx5J10oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY2xlYXJOZXh0TGFuZ0FuZFByb21pc2Uoa2V5KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIGlmICgkbmV4dExhbmcgPT09IGtleSAmJiBsYW5nUHJvbWlzZXNba2V5XSkge1xuICAgICAgICAgIC8vIHdlIGFyZSBhbHJlYWR5IGxvYWRpbmcgdGhpcyBhc3luY2hyb25vdXNseVxuICAgICAgICAgIC8vIHJlc29sdmUgb3VyIG5ldyBkZWZlcnJlZCB3aGVuIHRoZSBvbGQgbGFuZ1Byb21pc2UgaXMgcmVzb2x2ZWRcbiAgICAgICAgICBsYW5nUHJvbWlzZXNba2V5XS50aGVuKGZ1bmN0aW9uICh0cmFuc2xhdGlvbikge1xuICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSh0cmFuc2xhdGlvbi5rZXkpO1xuICAgICAgICAgICAgcmV0dXJuIHRyYW5zbGF0aW9uO1xuICAgICAgICAgIH0sIGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdChrZXkpO1xuICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChrZXkpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoa2V5KTtcbiAgICAgICAgICB1c2VMYW5ndWFnZShrZXkpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG4gICAgICB9O1xuXG4gICAgICAvKipcbiAgICAgICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgICAgICogQG5hbWUgcGFzY2FscHJlY2h0LnRyYW5zbGF0ZS4kdHJhbnNsYXRlI3N0b3JhZ2VLZXlcbiAgICAgICAqIEBtZXRob2RPZiBwYXNjYWxwcmVjaHQudHJhbnNsYXRlLiR0cmFuc2xhdGVcbiAgICAgICAqXG4gICAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgICAqIFJldHVybnMgdGhlIGtleSBmb3IgdGhlIHN0b3JhZ2UuXG4gICAgICAgKlxuICAgICAgICogQHJldHVybiB7c3RyaW5nfSBzdG9yYWdlIGtleVxuICAgICAgICovXG4gICAgICAkdHJhbnNsYXRlLnN0b3JhZ2VLZXkgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBzdG9yYWdlS2V5KCk7XG4gICAgICB9O1xuXG4gICAgICAvKipcbiAgICAgICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgICAgICogQG5hbWUgcGFzY2FscHJlY2h0LnRyYW5zbGF0ZS4kdHJhbnNsYXRlI2lzUG9zdENvbXBpbGluZ0VuYWJsZWRcbiAgICAgICAqIEBtZXRob2RPZiBwYXNjYWxwcmVjaHQudHJhbnNsYXRlLiR0cmFuc2xhdGVcbiAgICAgICAqXG4gICAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgICAqIFJldHVybnMgd2hldGhlciBwb3N0IGNvbXBpbGluZyBpcyBlbmFibGVkIG9yIG5vdFxuICAgICAgICpcbiAgICAgICAqIEByZXR1cm4ge2Jvb2x9IHN0b3JhZ2Uga2V5XG4gICAgICAgKi9cbiAgICAgICR0cmFuc2xhdGUuaXNQb3N0Q29tcGlsaW5nRW5hYmxlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICRwb3N0Q29tcGlsaW5nRW5hYmxlZDtcbiAgICAgIH07XG5cbiAgICAgIC8qKlxuICAgICAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAgICAgKiBAbmFtZSBwYXNjYWxwcmVjaHQudHJhbnNsYXRlLiR0cmFuc2xhdGUjaXNGb3JjZUFzeW5jUmVsb2FkRW5hYmxlZFxuICAgICAgICogQG1ldGhvZE9mIHBhc2NhbHByZWNodC50cmFuc2xhdGUuJHRyYW5zbGF0ZVxuICAgICAgICpcbiAgICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAgICogUmV0dXJucyB3aGV0aGVyIGZvcmNlIGFzeW5jIHJlbG9hZCBpcyBlbmFibGVkIG9yIG5vdFxuICAgICAgICpcbiAgICAgICAqIEByZXR1cm4ge2Jvb2xlYW59IGZvcmNlQXN5bmNSZWxvYWQgdmFsdWVcbiAgICAgICAqL1xuICAgICAgJHRyYW5zbGF0ZS5pc0ZvcmNlQXN5bmNSZWxvYWRFbmFibGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gJGZvcmNlQXN5bmNSZWxvYWRFbmFibGVkO1xuICAgICAgfTtcblxuICAgICAgLyoqXG4gICAgICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICAgICAqIEBuYW1lIHBhc2NhbHByZWNodC50cmFuc2xhdGUuJHRyYW5zbGF0ZSNyZWZyZXNoXG4gICAgICAgKiBAbWV0aG9kT2YgcGFzY2FscHJlY2h0LnRyYW5zbGF0ZS4kdHJhbnNsYXRlXG4gICAgICAgKlxuICAgICAgICogQGRlc2NyaXB0aW9uXG4gICAgICAgKiBSZWZyZXNoZXMgYSB0cmFuc2xhdGlvbiB0YWJsZSBwb2ludGVkIGJ5IHRoZSBnaXZlbiBsYW5nS2V5LiBJZiBsYW5nS2V5IGlzIG5vdCBzcGVjaWZpZWQsXG4gICAgICAgKiB0aGUgbW9kdWxlIHdpbGwgZHJvcCBhbGwgZXhpc3RlbnQgdHJhbnNsYXRpb24gdGFibGVzIGFuZCBsb2FkIG5ldyB2ZXJzaW9uIG9mIHRob3NlIHdoaWNoXG4gICAgICAgKiBhcmUgY3VycmVudGx5IGluIHVzZS5cbiAgICAgICAqXG4gICAgICAgKiBSZWZyZXNoIG1lYW5zIHRoYXQgdGhlIG1vZHVsZSB3aWxsIGRyb3AgdGFyZ2V0IHRyYW5zbGF0aW9uIHRhYmxlIGFuZCB0cnkgdG8gbG9hZCBpdCBhZ2Fpbi5cbiAgICAgICAqXG4gICAgICAgKiBJbiBjYXNlIHRoZXJlIGFyZSBubyBsb2FkZXJzIHJlZ2lzdGVyZWQgdGhlIHJlZnJlc2goKSBtZXRob2Qgd2lsbCB0aHJvdyBhbiBFcnJvci5cbiAgICAgICAqXG4gICAgICAgKiBJZiB0aGUgbW9kdWxlIGlzIGFibGUgdG8gcmVmcmVzaCB0cmFuc2xhdGlvbiB0YWJsZXMgcmVmcmVzaCgpIG1ldGhvZCB3aWxsIGJyb2FkY2FzdFxuICAgICAgICogJHRyYW5zbGF0ZVJlZnJlc2hTdGFydCBhbmQgJHRyYW5zbGF0ZVJlZnJlc2hFbmQgZXZlbnRzLlxuICAgICAgICpcbiAgICAgICAqIEBleGFtcGxlXG4gICAgICAgKiAvLyB0aGlzIHdpbGwgZHJvcCBhbGwgY3VycmVudGx5IGV4aXN0ZW50IHRyYW5zbGF0aW9uIHRhYmxlcyBhbmQgcmVsb2FkIHRob3NlIHdoaWNoIGFyZVxuICAgICAgICogLy8gY3VycmVudGx5IGluIHVzZVxuICAgICAgICogJHRyYW5zbGF0ZS5yZWZyZXNoKCk7XG4gICAgICAgKiAvLyB0aGlzIHdpbGwgcmVmcmVzaCBhIHRyYW5zbGF0aW9uIHRhYmxlIGZvciB0aGUgZW5fVVMgbGFuZ3VhZ2VcbiAgICAgICAqICR0cmFuc2xhdGUucmVmcmVzaCgnZW5fVVMnKTtcbiAgICAgICAqXG4gICAgICAgKiBAcGFyYW0ge3N0cmluZ30gbGFuZ0tleSBBIGxhbmd1YWdlIGtleSBvZiB0aGUgdGFibGUsIHdoaWNoIGhhcyB0byBiZSByZWZyZXNoZWRcbiAgICAgICAqXG4gICAgICAgKiBAcmV0dXJuIHtwcm9taXNlfSBQcm9taXNlLCB3aGljaCB3aWxsIGJlIHJlc29sdmVkIGluIGNhc2UgYSB0cmFuc2xhdGlvbiB0YWJsZXMgcmVmcmVzaGluZ1xuICAgICAgICogcHJvY2VzcyBpcyBmaW5pc2hlZCBzdWNjZXNzZnVsbHksIGFuZCByZWplY3QgaWYgbm90LlxuICAgICAgICovXG4gICAgICAkdHJhbnNsYXRlLnJlZnJlc2ggPSBmdW5jdGlvbiAobGFuZ0tleSkge1xuICAgICAgICBpZiAoISRsb2FkZXJGYWN0b3J5KSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb3VsZG5cXCd0IHJlZnJlc2ggdHJhbnNsYXRpb24gdGFibGUsIG5vIGxvYWRlciByZWdpc3RlcmVkIScpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcblxuICAgICAgICBmdW5jdGlvbiByZXNvbHZlKCkge1xuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgICAgICAgICAkcm9vdFNjb3BlLiRlbWl0KCckdHJhbnNsYXRlUmVmcmVzaEVuZCcsIHtsYW5ndWFnZTogbGFuZ0tleX0pO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gcmVqZWN0KCkge1xuICAgICAgICAgIGRlZmVycmVkLnJlamVjdCgpO1xuICAgICAgICAgICRyb290U2NvcGUuJGVtaXQoJyR0cmFuc2xhdGVSZWZyZXNoRW5kJywge2xhbmd1YWdlOiBsYW5nS2V5fSk7XG4gICAgICAgIH1cblxuICAgICAgICAkcm9vdFNjb3BlLiRlbWl0KCckdHJhbnNsYXRlUmVmcmVzaFN0YXJ0Jywge2xhbmd1YWdlOiBsYW5nS2V5fSk7XG5cbiAgICAgICAgaWYgKCFsYW5nS2V5KSB7XG4gICAgICAgICAgLy8gaWYgdGhlcmUncyBubyBsYW5ndWFnZSBrZXkgc3BlY2lmaWVkIHdlIHJlZnJlc2ggQUxMIFRIRSBUSElOR1MhXG4gICAgICAgICAgdmFyIHRhYmxlcyA9IFtdLCBsb2FkaW5nS2V5cyA9IHt9O1xuXG4gICAgICAgICAgLy8gcmVsb2FkIHJlZ2lzdGVyZWQgZmFsbGJhY2sgbGFuZ3VhZ2VzXG4gICAgICAgICAgaWYgKCRmYWxsYmFja0xhbmd1YWdlICYmICRmYWxsYmFja0xhbmd1YWdlLmxlbmd0aCkge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9ICRmYWxsYmFja0xhbmd1YWdlLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgIHRhYmxlcy5wdXNoKGxvYWRBc3luYygkZmFsbGJhY2tMYW5ndWFnZVtpXSkpO1xuICAgICAgICAgICAgICBsb2FkaW5nS2V5c1skZmFsbGJhY2tMYW5ndWFnZVtpXV0gPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIHJlbG9hZCBjdXJyZW50bHkgdXNlZCBsYW5ndWFnZVxuICAgICAgICAgIGlmICgkdXNlcyAmJiAhbG9hZGluZ0tleXNbJHVzZXNdKSB7XG4gICAgICAgICAgICB0YWJsZXMucHVzaChsb2FkQXN5bmMoJHVzZXMpKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB2YXIgYWxsVHJhbnNsYXRpb25zTG9hZGVkID0gZnVuY3Rpb24gKHRhYmxlRGF0YSkge1xuICAgICAgICAgICAgJHRyYW5zbGF0aW9uVGFibGUgPSB7fTtcbiAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaCh0YWJsZURhdGEsIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgIHRyYW5zbGF0aW9ucyhkYXRhLmtleSwgZGF0YS50YWJsZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmICgkdXNlcykge1xuICAgICAgICAgICAgICB1c2VMYW5ndWFnZSgkdXNlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgfTtcbiAgICAgICAgICBhbGxUcmFuc2xhdGlvbnNMb2FkZWQuZGlzcGxheU5hbWUgPSAncmVmcmVzaFBvc3RQcm9jZXNzb3InO1xuXG4gICAgICAgICAgJHEuYWxsKHRhYmxlcykudGhlbihhbGxUcmFuc2xhdGlvbnNMb2FkZWQsIHJlamVjdCk7XG5cbiAgICAgICAgfSBlbHNlIGlmICgkdHJhbnNsYXRpb25UYWJsZVtsYW5nS2V5XSkge1xuXG4gICAgICAgICAgdmFyIG9uZVRyYW5zbGF0aW9uc0xvYWRlZCA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICB0cmFuc2xhdGlvbnMoZGF0YS5rZXksIGRhdGEudGFibGUpO1xuICAgICAgICAgICAgaWYgKGxhbmdLZXkgPT09ICR1c2VzKSB7XG4gICAgICAgICAgICAgIHVzZUxhbmd1YWdlKCR1c2VzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICB9O1xuICAgICAgICAgIG9uZVRyYW5zbGF0aW9uc0xvYWRlZC5kaXNwbGF5TmFtZSA9ICdyZWZyZXNoUG9zdFByb2Nlc3Nvcic7XG5cbiAgICAgICAgICBsb2FkQXN5bmMobGFuZ0tleSkudGhlbihvbmVUcmFuc2xhdGlvbnNMb2FkZWQsIHJlamVjdCk7XG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZWplY3QoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICAgIH07XG5cbiAgICAgIC8qKlxuICAgICAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAgICAgKiBAbmFtZSBwYXNjYWxwcmVjaHQudHJhbnNsYXRlLiR0cmFuc2xhdGUjaW5zdGFudFxuICAgICAgICogQG1ldGhvZE9mIHBhc2NhbHByZWNodC50cmFuc2xhdGUuJHRyYW5zbGF0ZVxuICAgICAgICpcbiAgICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAgICogUmV0dXJucyBhIHRyYW5zbGF0aW9uIGluc3RhbnRseSBmcm9tIHRoZSBpbnRlcm5hbCBzdGF0ZSBvZiBsb2FkZWQgdHJhbnNsYXRpb24uIEFsbCBydWxlc1xuICAgICAgICogcmVnYXJkaW5nIHRoZSBjdXJyZW50IGxhbmd1YWdlLCB0aGUgcHJlZmVycmVkIGxhbmd1YWdlIG9mIGV2ZW4gZmFsbGJhY2sgbGFuZ3VhZ2VzIHdpbGwgYmVcbiAgICAgICAqIHVzZWQgZXhjZXB0IGFueSBwcm9taXNlIGhhbmRsaW5nLiBJZiBhIGxhbmd1YWdlIHdhcyBub3QgZm91bmQsIGFuIGFzeW5jaHJvbm91cyBsb2FkaW5nXG4gICAgICAgKiB3aWxsIGJlIGludm9rZWQgaW4gdGhlIGJhY2tncm91bmQuXG4gICAgICAgKlxuICAgICAgICogQHBhcmFtIHtzdHJpbmd8YXJyYXl9IHRyYW5zbGF0aW9uSWQgQSB0b2tlbiB3aGljaCByZXByZXNlbnRzIGEgdHJhbnNsYXRpb24gaWRcbiAgICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFRoaXMgY2FuIGJlIG9wdGlvbmFsbHkgYW4gYXJyYXkgb2YgdHJhbnNsYXRpb24gaWRzIHdoaWNoXG4gICAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHRzIHRoYXQgdGhlIGZ1bmN0aW9uJ3MgcHJvbWlzZSByZXR1cm5zIGFuIG9iamVjdCB3aGVyZVxuICAgICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWFjaCBrZXkgaXMgdGhlIHRyYW5zbGF0aW9uIGlkIGFuZCB0aGUgdmFsdWUgdGhlIHRyYW5zbGF0aW9uLlxuICAgICAgICogQHBhcmFtIHtvYmplY3R9IGludGVycG9sYXRlUGFyYW1zIFBhcmFtc1xuICAgICAgICogQHBhcmFtIHtzdHJpbmd9IGludGVycG9sYXRpb25JZCBUaGUgaWQgb2YgdGhlIGludGVycG9sYXRpb24gdG8gdXNlXG4gICAgICAgKlxuICAgICAgICogQHJldHVybiB7c3RyaW5nfG9iamVjdH0gdHJhbnNsYXRpb25cbiAgICAgICAqL1xuICAgICAgJHRyYW5zbGF0ZS5pbnN0YW50ID0gZnVuY3Rpb24gKHRyYW5zbGF0aW9uSWQsIGludGVycG9sYXRlUGFyYW1zLCBpbnRlcnBvbGF0aW9uSWQpIHtcblxuICAgICAgICAvLyBEZXRlY3QgdW5kZWZpbmVkIGFuZCBudWxsIHZhbHVlcyB0byBzaG9ydGVuIHRoZSBleGVjdXRpb24gYW5kIHByZXZlbnQgZXhjZXB0aW9uc1xuICAgICAgICBpZiAodHJhbnNsYXRpb25JZCA9PT0gbnVsbCB8fCBhbmd1bGFyLmlzVW5kZWZpbmVkKHRyYW5zbGF0aW9uSWQpKSB7XG4gICAgICAgICAgcmV0dXJuIHRyYW5zbGF0aW9uSWQ7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBEdWNrIGRldGVjdGlvbjogSWYgdGhlIGZpcnN0IGFyZ3VtZW50IGlzIGFuIGFycmF5LCBhIGJ1bmNoIG9mIHRyYW5zbGF0aW9ucyB3YXMgcmVxdWVzdGVkLlxuICAgICAgICAvLyBUaGUgcmVzdWx0IGlzIGFuIG9iamVjdC5cbiAgICAgICAgaWYgKGFuZ3VsYXIuaXNBcnJheSh0cmFuc2xhdGlvbklkKSkge1xuICAgICAgICAgIHZhciByZXN1bHRzID0ge307XG4gICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGMgPSB0cmFuc2xhdGlvbklkLmxlbmd0aDsgaSA8IGM7IGkrKykge1xuICAgICAgICAgICAgcmVzdWx0c1t0cmFuc2xhdGlvbklkW2ldXSA9ICR0cmFuc2xhdGUuaW5zdGFudCh0cmFuc2xhdGlvbklkW2ldLCBpbnRlcnBvbGF0ZVBhcmFtcywgaW50ZXJwb2xhdGlvbklkKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBXZSBkaXNjYXJkZWQgdW5hY2NlcHRhYmxlIHZhbHVlcy4gU28gd2UganVzdCBuZWVkIHRvIHZlcmlmeSBpZiB0cmFuc2xhdGlvbklkIGlzIGVtcHR5IFN0cmluZ1xuICAgICAgICBpZiAoYW5ndWxhci5pc1N0cmluZyh0cmFuc2xhdGlvbklkKSAmJiB0cmFuc2xhdGlvbklkLmxlbmd0aCA8IDEpIHtcbiAgICAgICAgICByZXR1cm4gdHJhbnNsYXRpb25JZDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHRyaW0gb2ZmIGFueSB3aGl0ZXNwYWNlXG4gICAgICAgIGlmICh0cmFuc2xhdGlvbklkKSB7XG4gICAgICAgICAgdHJhbnNsYXRpb25JZCA9IHRyaW0uYXBwbHkodHJhbnNsYXRpb25JZCk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcmVzdWx0LCBwb3NzaWJsZUxhbmdLZXlzID0gW107XG4gICAgICAgIGlmICgkcHJlZmVycmVkTGFuZ3VhZ2UpIHtcbiAgICAgICAgICBwb3NzaWJsZUxhbmdLZXlzLnB1c2goJHByZWZlcnJlZExhbmd1YWdlKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoJHVzZXMpIHtcbiAgICAgICAgICBwb3NzaWJsZUxhbmdLZXlzLnB1c2goJHVzZXMpO1xuICAgICAgICB9XG4gICAgICAgIGlmICgkZmFsbGJhY2tMYW5ndWFnZSAmJiAkZmFsbGJhY2tMYW5ndWFnZS5sZW5ndGgpIHtcbiAgICAgICAgICBwb3NzaWJsZUxhbmdLZXlzID0gcG9zc2libGVMYW5nS2V5cy5jb25jYXQoJGZhbGxiYWNrTGFuZ3VhZ2UpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIGogPSAwLCBkID0gcG9zc2libGVMYW5nS2V5cy5sZW5ndGg7IGogPCBkOyBqKyspIHtcbiAgICAgICAgICB2YXIgcG9zc2libGVMYW5nS2V5ID0gcG9zc2libGVMYW5nS2V5c1tqXTtcbiAgICAgICAgICBpZiAoJHRyYW5zbGF0aW9uVGFibGVbcG9zc2libGVMYW5nS2V5XSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiAkdHJhbnNsYXRpb25UYWJsZVtwb3NzaWJsZUxhbmdLZXldW3RyYW5zbGF0aW9uSWRdICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICByZXN1bHQgPSBkZXRlcm1pbmVUcmFuc2xhdGlvbkluc3RhbnQodHJhbnNsYXRpb25JZCwgaW50ZXJwb2xhdGVQYXJhbXMsIGludGVycG9sYXRpb25JZCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCRub3RGb3VuZEluZGljYXRvckxlZnQgfHwgJG5vdEZvdW5kSW5kaWNhdG9yUmlnaHQpIHtcbiAgICAgICAgICAgICAgcmVzdWx0ID0gYXBwbHlOb3RGb3VuZEluZGljYXRvcnModHJhbnNsYXRpb25JZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0eXBlb2YgcmVzdWx0ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFyZXN1bHQgJiYgcmVzdWx0ICE9PSAnJykge1xuICAgICAgICAgIC8vIFJldHVybiB0cmFuc2xhdGlvbiBvZiBkZWZhdWx0IGludGVycG9sYXRvciBpZiBub3QgZm91bmQgYW55dGhpbmcuXG4gICAgICAgICAgcmVzdWx0ID0gZGVmYXVsdEludGVycG9sYXRvci5pbnRlcnBvbGF0ZSh0cmFuc2xhdGlvbklkLCBpbnRlcnBvbGF0ZVBhcmFtcyk7XG4gICAgICAgICAgaWYgKCRtaXNzaW5nVHJhbnNsYXRpb25IYW5kbGVyRmFjdG9yeSAmJiAhcGVuZGluZ0xvYWRlcikge1xuICAgICAgICAgICAgcmVzdWx0ID0gdHJhbnNsYXRlQnlIYW5kbGVyKHRyYW5zbGF0aW9uSWQsIGludGVycG9sYXRlUGFyYW1zKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfTtcblxuICAgICAgLyoqXG4gICAgICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICAgICAqIEBuYW1lIHBhc2NhbHByZWNodC50cmFuc2xhdGUuJHRyYW5zbGF0ZSN2ZXJzaW9uSW5mb1xuICAgICAgICogQG1ldGhvZE9mIHBhc2NhbHByZWNodC50cmFuc2xhdGUuJHRyYW5zbGF0ZVxuICAgICAgICpcbiAgICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAgICogUmV0dXJucyB0aGUgY3VycmVudCB2ZXJzaW9uIGluZm9ybWF0aW9uIGZvciB0aGUgYW5ndWxhci10cmFuc2xhdGUgbGlicmFyeVxuICAgICAgICpcbiAgICAgICAqIEByZXR1cm4ge3N0cmluZ30gYW5ndWxhci10cmFuc2xhdGUgdmVyc2lvblxuICAgICAgICovXG4gICAgICAkdHJhbnNsYXRlLnZlcnNpb25JbmZvID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdmVyc2lvbjtcbiAgICAgIH07XG5cbiAgICAgIC8qKlxuICAgICAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAgICAgKiBAbmFtZSBwYXNjYWxwcmVjaHQudHJhbnNsYXRlLiR0cmFuc2xhdGUjbG9hZGVyQ2FjaGVcbiAgICAgICAqIEBtZXRob2RPZiBwYXNjYWxwcmVjaHQudHJhbnNsYXRlLiR0cmFuc2xhdGVcbiAgICAgICAqXG4gICAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgICAqIFJldHVybnMgdGhlIGRlZmluZWQgbG9hZGVyQ2FjaGUuXG4gICAgICAgKlxuICAgICAgICogQHJldHVybiB7Ym9vbGVhbnxzdHJpbmd8b2JqZWN0fSBjdXJyZW50IHZhbHVlIG9mIGxvYWRlckNhY2hlXG4gICAgICAgKi9cbiAgICAgICR0cmFuc2xhdGUubG9hZGVyQ2FjaGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBsb2FkZXJDYWNoZTtcbiAgICAgIH07XG5cbiAgICAgIC8vIGludGVybmFsIHB1cnBvc2Ugb25seVxuICAgICAgJHRyYW5zbGF0ZS5kaXJlY3RpdmVQcmlvcml0eSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGRpcmVjdGl2ZVByaW9yaXR5O1xuICAgICAgfTtcblxuICAgICAgLy8gaW50ZXJuYWwgcHVycG9zZSBvbmx5XG4gICAgICAkdHJhbnNsYXRlLnN0YXRlZnVsRmlsdGVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gc3RhdGVmdWxGaWx0ZXI7XG4gICAgICB9O1xuXG4gICAgICBpZiAoJGxvYWRlckZhY3RvcnkpIHtcblxuICAgICAgICAvLyBJZiBhdCBsZWFzdCBvbmUgYXN5bmMgbG9hZGVyIGlzIGRlZmluZWQgYW5kIHRoZXJlIGFyZSBub1xuICAgICAgICAvLyAoZGVmYXVsdCkgdHJhbnNsYXRpb25zIGF2YWlsYWJsZSB3ZSBzaG91bGQgdHJ5IHRvIGxvYWQgdGhlbS5cbiAgICAgICAgaWYgKGFuZ3VsYXIuZXF1YWxzKCR0cmFuc2xhdGlvblRhYmxlLCB7fSkpIHtcbiAgICAgICAgICAkdHJhbnNsYXRlLnVzZSgkdHJhbnNsYXRlLnVzZSgpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFsc28sIGlmIHRoZXJlIGFyZSBhbnkgZmFsbGJhY2sgbGFuZ3VhZ2UgcmVnaXN0ZXJlZCwgd2Ugc3RhcnRcbiAgICAgICAgLy8gbG9hZGluZyB0aGVtIGFzeW5jaHJvbm91c2x5IGFzIHNvb24gYXMgd2UgY2FuLlxuICAgICAgICBpZiAoJGZhbGxiYWNrTGFuZ3VhZ2UgJiYgJGZhbGxiYWNrTGFuZ3VhZ2UubGVuZ3RoKSB7XG4gICAgICAgICAgdmFyIHByb2Nlc3NBc3luY1Jlc3VsdCA9IGZ1bmN0aW9uICh0cmFuc2xhdGlvbikge1xuICAgICAgICAgICAgdHJhbnNsYXRpb25zKHRyYW5zbGF0aW9uLmtleSwgdHJhbnNsYXRpb24udGFibGUpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kZW1pdCgnJHRyYW5zbGF0ZUNoYW5nZUVuZCcsIHsgbGFuZ3VhZ2U6IHRyYW5zbGF0aW9uLmtleSB9KTtcbiAgICAgICAgICAgIHJldHVybiB0cmFuc2xhdGlvbjtcbiAgICAgICAgICB9O1xuICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSAkZmFsbGJhY2tMYW5ndWFnZS5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgdmFyIGZhbGxiYWNrTGFuZ3VhZ2VJZCA9ICRmYWxsYmFja0xhbmd1YWdlW2ldO1xuICAgICAgICAgICAgaWYgKCRmb3JjZUFzeW5jUmVsb2FkRW5hYmxlZCB8fCAhJHRyYW5zbGF0aW9uVGFibGVbZmFsbGJhY2tMYW5ndWFnZUlkXSkge1xuICAgICAgICAgICAgICBsYW5nUHJvbWlzZXNbZmFsbGJhY2tMYW5ndWFnZUlkXSA9IGxvYWRBc3luYyhmYWxsYmFja0xhbmd1YWdlSWQpLnRoZW4ocHJvY2Vzc0FzeW5jUmVzdWx0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuICR0cmFuc2xhdGU7XG4gICAgfVxuICBdO1xufVxuJHRyYW5zbGF0ZS4kaW5qZWN0ID0gWyckU1RPUkFHRV9LRVknLCAnJHdpbmRvd1Byb3ZpZGVyJywgJyR0cmFuc2xhdGVTYW5pdGl6YXRpb25Qcm92aWRlcicsICdwYXNjYWxwcmVjaHRUcmFuc2xhdGVPdmVycmlkZXInXTtcblxuJHRyYW5zbGF0ZS5kaXNwbGF5TmFtZSA9ICdkaXNwbGF5TmFtZSc7XG5cbi8qKlxuICogQG5nZG9jIG9iamVjdFxuICogQG5hbWUgcGFzY2FscHJlY2h0LnRyYW5zbGF0ZS4kdHJhbnNsYXRlRGVmYXVsdEludGVycG9sYXRpb25cbiAqIEByZXF1aXJlcyAkaW50ZXJwb2xhdGVcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIFVzZXMgYW5ndWxhcidzIGAkaW50ZXJwb2xhdGVgIHNlcnZpY2VzIHRvIGludGVycG9sYXRlIHN0cmluZ3MgYWdhaW5zdCBzb21lIHZhbHVlcy5cbiAqXG4gKiBCZSBhd2FyZSB0byBjb25maWd1cmUgYSBwcm9wZXIgc2FuaXRpemF0aW9uIHN0cmF0ZWd5LlxuICpcbiAqIFNlZSBhbHNvOlxuICogKiB7QGxpbmsgcGFzY2FscHJlY2h0LnRyYW5zbGF0ZS4kdHJhbnNsYXRlU2FuaXRpemF0aW9ufVxuICpcbiAqIEByZXR1cm4ge29iamVjdH0gJHRyYW5zbGF0ZURlZmF1bHRJbnRlcnBvbGF0aW9uIEludGVycG9sYXRvciBzZXJ2aWNlXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCdwYXNjYWxwcmVjaHQudHJhbnNsYXRlJykuZmFjdG9yeSgnJHRyYW5zbGF0ZURlZmF1bHRJbnRlcnBvbGF0aW9uJywgJHRyYW5zbGF0ZURlZmF1bHRJbnRlcnBvbGF0aW9uKTtcblxuZnVuY3Rpb24gJHRyYW5zbGF0ZURlZmF1bHRJbnRlcnBvbGF0aW9uICgkaW50ZXJwb2xhdGUsICR0cmFuc2xhdGVTYW5pdGl6YXRpb24pIHtcblxuICAndXNlIHN0cmljdCc7XG5cbiAgdmFyICR0cmFuc2xhdGVJbnRlcnBvbGF0b3IgPSB7fSxcbiAgICAgICRsb2NhbGUsXG4gICAgICAkaWRlbnRpZmllciA9ICdkZWZhdWx0JztcblxuICAvKipcbiAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAqIEBuYW1lIHBhc2NhbHByZWNodC50cmFuc2xhdGUuJHRyYW5zbGF0ZURlZmF1bHRJbnRlcnBvbGF0aW9uI3NldExvY2FsZVxuICAgKiBAbWV0aG9kT2YgcGFzY2FscHJlY2h0LnRyYW5zbGF0ZS4kdHJhbnNsYXRlRGVmYXVsdEludGVycG9sYXRpb25cbiAgICpcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqIFNldHMgY3VycmVudCBsb2NhbGUgKHRoaXMgaXMgY3VycmVudGx5IG5vdCB1c2UgaW4gdGhpcyBpbnRlcnBvbGF0aW9uKS5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IGxvY2FsZSBMYW5ndWFnZSBrZXkgb3IgbG9jYWxlLlxuICAgKi9cbiAgJHRyYW5zbGF0ZUludGVycG9sYXRvci5zZXRMb2NhbGUgPSBmdW5jdGlvbiAobG9jYWxlKSB7XG4gICAgJGxvY2FsZSA9IGxvY2FsZTtcbiAgfTtcblxuICAvKipcbiAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAqIEBuYW1lIHBhc2NhbHByZWNodC50cmFuc2xhdGUuJHRyYW5zbGF0ZURlZmF1bHRJbnRlcnBvbGF0aW9uI2dldEludGVycG9sYXRpb25JZGVudGlmaWVyXG4gICAqIEBtZXRob2RPZiBwYXNjYWxwcmVjaHQudHJhbnNsYXRlLiR0cmFuc2xhdGVEZWZhdWx0SW50ZXJwb2xhdGlvblxuICAgKlxuICAgKiBAZGVzY3JpcHRpb25cbiAgICogUmV0dXJucyBhbiBpZGVudGlmaWVyIGZvciB0aGlzIGludGVycG9sYXRpb24gc2VydmljZS5cbiAgICpcbiAgICogQHJldHVybnMge3N0cmluZ30gJGlkZW50aWZpZXJcbiAgICovXG4gICR0cmFuc2xhdGVJbnRlcnBvbGF0b3IuZ2V0SW50ZXJwb2xhdGlvbklkZW50aWZpZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICRpZGVudGlmaWVyO1xuICB9O1xuXG4gIC8qKlxuICAgKiBAZGVwcmVjYXRlZCB3aWxsIGJlIHJlbW92ZWQgaW4gMy4wXG4gICAqIEBzZWUge0BsaW5rIHBhc2NhbHByZWNodC50cmFuc2xhdGUuJHRyYW5zbGF0ZVNhbml0aXphdGlvbn1cbiAgICovXG4gICR0cmFuc2xhdGVJbnRlcnBvbGF0b3IudXNlU2FuaXRpemVWYWx1ZVN0cmF0ZWd5ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgJHRyYW5zbGF0ZVNhbml0aXphdGlvbi51c2VTdHJhdGVneSh2YWx1ZSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgLyoqXG4gICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgKiBAbmFtZSBwYXNjYWxwcmVjaHQudHJhbnNsYXRlLiR0cmFuc2xhdGVEZWZhdWx0SW50ZXJwb2xhdGlvbiNpbnRlcnBvbGF0ZVxuICAgKiBAbWV0aG9kT2YgcGFzY2FscHJlY2h0LnRyYW5zbGF0ZS4kdHJhbnNsYXRlRGVmYXVsdEludGVycG9sYXRpb25cbiAgICpcbiAgICogQGRlc2NyaXB0aW9uXG4gICAqIEludGVycG9sYXRlcyBnaXZlbiBzdHJpbmcgYWdhaW5zIGdpdmVuIGludGVycG9sYXRlIHBhcmFtcyB1c2luZyBhbmd1bGFyc1xuICAgKiBgJGludGVycG9sYXRlYCBzZXJ2aWNlLlxuICAgKlxuICAgKiBAcmV0dXJucyB7c3RyaW5nfSBpbnRlcnBvbGF0ZWQgc3RyaW5nLlxuICAgKi9cbiAgJHRyYW5zbGF0ZUludGVycG9sYXRvci5pbnRlcnBvbGF0ZSA9IGZ1bmN0aW9uIChzdHJpbmcsIGludGVycG9sYXRpb25QYXJhbXMpIHtcbiAgICBpbnRlcnBvbGF0aW9uUGFyYW1zID0gaW50ZXJwb2xhdGlvblBhcmFtcyB8fCB7fTtcbiAgICBpbnRlcnBvbGF0aW9uUGFyYW1zID0gJHRyYW5zbGF0ZVNhbml0aXphdGlvbi5zYW5pdGl6ZShpbnRlcnBvbGF0aW9uUGFyYW1zLCAncGFyYW1zJyk7XG5cbiAgICB2YXIgaW50ZXJwb2xhdGVkVGV4dCA9ICRpbnRlcnBvbGF0ZShzdHJpbmcpKGludGVycG9sYXRpb25QYXJhbXMpO1xuICAgIGludGVycG9sYXRlZFRleHQgPSAkdHJhbnNsYXRlU2FuaXRpemF0aW9uLnNhbml0aXplKGludGVycG9sYXRlZFRleHQsICd0ZXh0Jyk7XG5cbiAgICByZXR1cm4gaW50ZXJwb2xhdGVkVGV4dDtcbiAgfTtcblxuICByZXR1cm4gJHRyYW5zbGF0ZUludGVycG9sYXRvcjtcbn1cbiR0cmFuc2xhdGVEZWZhdWx0SW50ZXJwb2xhdGlvbi4kaW5qZWN0ID0gWyckaW50ZXJwb2xhdGUnLCAnJHRyYW5zbGF0ZVNhbml0aXphdGlvbiddO1xuXG4kdHJhbnNsYXRlRGVmYXVsdEludGVycG9sYXRpb24uZGlzcGxheU5hbWUgPSAnJHRyYW5zbGF0ZURlZmF1bHRJbnRlcnBvbGF0aW9uJztcblxuYW5ndWxhci5tb2R1bGUoJ3Bhc2NhbHByZWNodC50cmFuc2xhdGUnKS5jb25zdGFudCgnJFNUT1JBR0VfS0VZJywgJ05HX1RSQU5TTEFURV9MQU5HX0tFWScpO1xuXG5hbmd1bGFyLm1vZHVsZSgncGFzY2FscHJlY2h0LnRyYW5zbGF0ZScpXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHBhc2NhbHByZWNodC50cmFuc2xhdGUuZGlyZWN0aXZlOnRyYW5zbGF0ZVxuICogQHJlcXVpcmVzICRjb21waWxlXG4gKiBAcmVxdWlyZXMgJGZpbHRlclxuICogQHJlcXVpcmVzICRpbnRlcnBvbGF0ZVxuICogQHJlc3RyaWN0IEFcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIFRyYW5zbGF0ZXMgZ2l2ZW4gdHJhbnNsYXRpb24gaWQgZWl0aGVyIHRocm91Z2ggYXR0cmlidXRlIG9yIERPTSBjb250ZW50LlxuICogSW50ZXJuYWxseSBpdCB1c2VzIGB0cmFuc2xhdGVgIGZpbHRlciB0byB0cmFuc2xhdGUgdHJhbnNsYXRpb24gaWQuIEl0IHBvc3NpYmxlIHRvXG4gKiBwYXNzIGFuIG9wdGlvbmFsIGB0cmFuc2xhdGUtdmFsdWVzYCBvYmplY3QgbGl0ZXJhbCBhcyBzdHJpbmcgaW50byB0cmFuc2xhdGlvbiBpZC5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZz19IHRyYW5zbGF0ZSBUcmFuc2xhdGlvbiBpZCB3aGljaCBjb3VsZCBiZSBlaXRoZXIgc3RyaW5nIG9yIGludGVycG9sYXRlZCBzdHJpbmcuXG4gKiBAcGFyYW0ge3N0cmluZz19IHRyYW5zbGF0ZS12YWx1ZXMgVmFsdWVzIHRvIHBhc3MgaW50byB0cmFuc2xhdGlvbiBpZC4gQ2FuIGJlIHBhc3NlZCBhcyBvYmplY3QgbGl0ZXJhbCBzdHJpbmcgb3IgaW50ZXJwb2xhdGVkIG9iamVjdC5cbiAqIEBwYXJhbSB7c3RyaW5nPX0gdHJhbnNsYXRlLWF0dHItQVRUUiB0cmFuc2xhdGUgVHJhbnNsYXRpb24gaWQgYW5kIHB1dCBpdCBpbnRvIEFUVFIgYXR0cmlidXRlLlxuICogQHBhcmFtIHtzdHJpbmc9fSB0cmFuc2xhdGUtZGVmYXVsdCB3aWxsIGJlIHVzZWQgdW5sZXNzIHRyYW5zbGF0aW9uIHdhcyBzdWNjZXNzZnVsXG4gKiBAcGFyYW0ge2Jvb2xlYW49fSB0cmFuc2xhdGUtY29tcGlsZSAoZGVmYXVsdCB0cnVlIGlmIHByZXNlbnQpIGRlZmluZXMgbG9jYWxseSBhY3RpdmF0aW9uIG9mIHtAbGluayBwYXNjYWxwcmVjaHQudHJhbnNsYXRlLiR0cmFuc2xhdGVQcm92aWRlciNtZXRob2RzX3VzZVBvc3RDb21waWxpbmd9XG4gKlxuICogQGV4YW1wbGVcbiAgIDxleGFtcGxlIG1vZHVsZT1cIm5nVmlld1wiPlxuICAgIDxmaWxlIG5hbWU9XCJpbmRleC5odG1sXCI+XG4gICAgICA8ZGl2IG5nLWNvbnRyb2xsZXI9XCJUcmFuc2xhdGVDdHJsXCI+XG5cbiAgICAgICAgPHByZSB0cmFuc2xhdGU9XCJUUkFOU0xBVElPTl9JRFwiPjwvcHJlPlxuICAgICAgICA8cHJlIHRyYW5zbGF0ZT5UUkFOU0xBVElPTl9JRDwvcHJlPlxuICAgICAgICA8cHJlIHRyYW5zbGF0ZSB0cmFuc2xhdGUtYXR0ci10aXRsZT1cIlRSQU5TTEFUSU9OX0lEXCI+PC9wcmU+XG4gICAgICAgIDxwcmUgdHJhbnNsYXRlPVwie3t0cmFuc2xhdGlvbklkfX1cIj48L3ByZT5cbiAgICAgICAgPHByZSB0cmFuc2xhdGU+e3t0cmFuc2xhdGlvbklkfX08L3ByZT5cbiAgICAgICAgPHByZSB0cmFuc2xhdGU9XCJXSVRIX1ZBTFVFU1wiIHRyYW5zbGF0ZS12YWx1ZXM9XCJ7dmFsdWU6IDV9XCI+PC9wcmU+XG4gICAgICAgIDxwcmUgdHJhbnNsYXRlIHRyYW5zbGF0ZS12YWx1ZXM9XCJ7dmFsdWU6IDV9XCI+V0lUSF9WQUxVRVM8L3ByZT5cbiAgICAgICAgPHByZSB0cmFuc2xhdGU9XCJXSVRIX1ZBTFVFU1wiIHRyYW5zbGF0ZS12YWx1ZXM9XCJ7e3ZhbHVlc319XCI+PC9wcmU+XG4gICAgICAgIDxwcmUgdHJhbnNsYXRlIHRyYW5zbGF0ZS12YWx1ZXM9XCJ7e3ZhbHVlc319XCI+V0lUSF9WQUxVRVM8L3ByZT5cbiAgICAgICAgPHByZSB0cmFuc2xhdGUgdHJhbnNsYXRlLWF0dHItdGl0bGU9XCJXSVRIX1ZBTFVFU1wiIHRyYW5zbGF0ZS12YWx1ZXM9XCJ7e3ZhbHVlc319XCI+PC9wcmU+XG5cbiAgICAgIDwvZGl2PlxuICAgIDwvZmlsZT5cbiAgICA8ZmlsZSBuYW1lPVwic2NyaXB0LmpzXCI+XG4gICAgICBhbmd1bGFyLm1vZHVsZSgnbmdWaWV3JywgWydwYXNjYWxwcmVjaHQudHJhbnNsYXRlJ10pXG5cbiAgICAgIC5jb25maWcoZnVuY3Rpb24gKCR0cmFuc2xhdGVQcm92aWRlcikge1xuXG4gICAgICAgICR0cmFuc2xhdGVQcm92aWRlci50cmFuc2xhdGlvbnMoJ2VuJyx7XG4gICAgICAgICAgJ1RSQU5TTEFUSU9OX0lEJzogJ0hlbGxvIHRoZXJlIScsXG4gICAgICAgICAgJ1dJVEhfVkFMVUVTJzogJ1RoZSBmb2xsb3dpbmcgdmFsdWUgaXMgZHluYW1pYzoge3t2YWx1ZX19J1xuICAgICAgICB9KS5wcmVmZXJyZWRMYW5ndWFnZSgnZW4nKTtcblxuICAgICAgfSk7XG5cbiAgICAgIGFuZ3VsYXIubW9kdWxlKCduZ1ZpZXcnKS5jb250cm9sbGVyKCdUcmFuc2xhdGVDdHJsJywgZnVuY3Rpb24gKCRzY29wZSkge1xuICAgICAgICAkc2NvcGUudHJhbnNsYXRpb25JZCA9ICdUUkFOU0xBVElPTl9JRCc7XG5cbiAgICAgICAgJHNjb3BlLnZhbHVlcyA9IHtcbiAgICAgICAgICB2YWx1ZTogNzhcbiAgICAgICAgfTtcbiAgICAgIH0pO1xuICAgIDwvZmlsZT5cbiAgICA8ZmlsZSBuYW1lPVwic2NlbmFyaW8uanNcIj5cbiAgICAgIGl0KCdzaG91bGQgdHJhbnNsYXRlJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBpbmplY3QoZnVuY3Rpb24gKCRyb290U2NvcGUsICRjb21waWxlKSB7XG4gICAgICAgICAgJHJvb3RTY29wZS50cmFuc2xhdGlvbklkID0gJ1RSQU5TTEFUSU9OX0lEJztcblxuICAgICAgICAgIGVsZW1lbnQgPSAkY29tcGlsZSgnPHAgdHJhbnNsYXRlPVwiVFJBTlNMQVRJT05fSURcIj48L3A+JykoJHJvb3RTY29wZSk7XG4gICAgICAgICAgJHJvb3RTY29wZS4kZGlnZXN0KCk7XG4gICAgICAgICAgZXhwZWN0KGVsZW1lbnQudGV4dCgpKS50b0JlKCdIZWxsbyB0aGVyZSEnKTtcblxuICAgICAgICAgIGVsZW1lbnQgPSAkY29tcGlsZSgnPHAgdHJhbnNsYXRlPVwie3t0cmFuc2xhdGlvbklkfX1cIj48L3A+JykoJHJvb3RTY29wZSk7XG4gICAgICAgICAgJHJvb3RTY29wZS4kZGlnZXN0KCk7XG4gICAgICAgICAgZXhwZWN0KGVsZW1lbnQudGV4dCgpKS50b0JlKCdIZWxsbyB0aGVyZSEnKTtcblxuICAgICAgICAgIGVsZW1lbnQgPSAkY29tcGlsZSgnPHAgdHJhbnNsYXRlPlRSQU5TTEFUSU9OX0lEPC9wPicpKCRyb290U2NvcGUpO1xuICAgICAgICAgICRyb290U2NvcGUuJGRpZ2VzdCgpO1xuICAgICAgICAgIGV4cGVjdChlbGVtZW50LnRleHQoKSkudG9CZSgnSGVsbG8gdGhlcmUhJyk7XG5cbiAgICAgICAgICBlbGVtZW50ID0gJGNvbXBpbGUoJzxwIHRyYW5zbGF0ZT57e3RyYW5zbGF0aW9uSWR9fTwvcD4nKSgkcm9vdFNjb3BlKTtcbiAgICAgICAgICAkcm9vdFNjb3BlLiRkaWdlc3QoKTtcbiAgICAgICAgICBleHBlY3QoZWxlbWVudC50ZXh0KCkpLnRvQmUoJ0hlbGxvIHRoZXJlIScpO1xuXG4gICAgICAgICAgZWxlbWVudCA9ICRjb21waWxlKCc8cCB0cmFuc2xhdGUgdHJhbnNsYXRlLWF0dHItdGl0bGU9XCJUUkFOU0xBVElPTl9JRFwiPjwvcD4nKSgkcm9vdFNjb3BlKTtcbiAgICAgICAgICAkcm9vdFNjb3BlLiRkaWdlc3QoKTtcbiAgICAgICAgICBleHBlY3QoZWxlbWVudC5hdHRyKCd0aXRsZScpKS50b0JlKCdIZWxsbyB0aGVyZSEnKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICA8L2ZpbGU+XG4gICA8L2V4YW1wbGU+XG4gKi9cbi5kaXJlY3RpdmUoJ3RyYW5zbGF0ZScsIHRyYW5zbGF0ZURpcmVjdGl2ZSk7XG5mdW5jdGlvbiB0cmFuc2xhdGVEaXJlY3RpdmUoJHRyYW5zbGF0ZSwgJHEsICRpbnRlcnBvbGF0ZSwgJGNvbXBpbGUsICRwYXJzZSwgJHJvb3RTY29wZSkge1xuXG4gICd1c2Ugc3RyaWN0JztcblxuICAvKipcbiAgICogQG5hbWUgdHJpbVxuICAgKiBAcHJpdmF0ZVxuICAgKlxuICAgKiBAZGVzY3JpcHRpb25cbiAgICogdHJpbSBwb2x5ZmlsbFxuICAgKlxuICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgc3RyaW5nIHN0cmlwcGVkIG9mIHdoaXRlc3BhY2UgZnJvbSBib3RoIGVuZHNcbiAgICovXG4gIHZhciB0cmltID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMudG9TdHJpbmcoKS5yZXBsYWNlKC9eXFxzK3xcXHMrJC9nLCAnJyk7XG4gIH07XG5cbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdDogJ0FFJyxcbiAgICBzY29wZTogdHJ1ZSxcbiAgICBwcmlvcml0eTogJHRyYW5zbGF0ZS5kaXJlY3RpdmVQcmlvcml0eSgpLFxuICAgIGNvbXBpbGU6IGZ1bmN0aW9uICh0RWxlbWVudCwgdEF0dHIpIHtcblxuICAgICAgdmFyIHRyYW5zbGF0ZVZhbHVlc0V4aXN0ID0gKHRBdHRyLnRyYW5zbGF0ZVZhbHVlcykgP1xuICAgICAgICB0QXR0ci50cmFuc2xhdGVWYWx1ZXMgOiB1bmRlZmluZWQ7XG5cbiAgICAgIHZhciB0cmFuc2xhdGVJbnRlcnBvbGF0aW9uID0gKHRBdHRyLnRyYW5zbGF0ZUludGVycG9sYXRpb24pID9cbiAgICAgICAgdEF0dHIudHJhbnNsYXRlSW50ZXJwb2xhdGlvbiA6IHVuZGVmaW5lZDtcblxuICAgICAgdmFyIHRyYW5zbGF0ZVZhbHVlRXhpc3QgPSB0RWxlbWVudFswXS5vdXRlckhUTUwubWF0Y2goL3RyYW5zbGF0ZS12YWx1ZS0rL2kpO1xuXG4gICAgICB2YXIgaW50ZXJwb2xhdGVSZWdFeHAgPSAnXiguKikoJyArICRpbnRlcnBvbGF0ZS5zdGFydFN5bWJvbCgpICsgJy4qJyArICRpbnRlcnBvbGF0ZS5lbmRTeW1ib2woKSArICcpKC4qKScsXG4gICAgICAgICAgd2F0Y2hlclJlZ0V4cCA9ICdeKC4qKScgKyAkaW50ZXJwb2xhdGUuc3RhcnRTeW1ib2woKSArICcoLiopJyArICRpbnRlcnBvbGF0ZS5lbmRTeW1ib2woKSArICcoLiopJztcblxuICAgICAgcmV0dXJuIGZ1bmN0aW9uIGxpbmtGbihzY29wZSwgaUVsZW1lbnQsIGlBdHRyKSB7XG5cbiAgICAgICAgc2NvcGUuaW50ZXJwb2xhdGVQYXJhbXMgPSB7fTtcbiAgICAgICAgc2NvcGUucHJlVGV4dCA9ICcnO1xuICAgICAgICBzY29wZS5wb3N0VGV4dCA9ICcnO1xuICAgICAgICB2YXIgdHJhbnNsYXRpb25JZHMgPSB7fTtcblxuICAgICAgICB2YXIgaW5pdEludGVycG9sYXRpb25QYXJhbXMgPSBmdW5jdGlvbiAoaW50ZXJwb2xhdGVQYXJhbXMsIGlBdHRyLCB0QXR0cikge1xuICAgICAgICAgIC8vIGluaXRpYWwgc2V0dXBcbiAgICAgICAgICBpZiAoaUF0dHIudHJhbnNsYXRlVmFsdWVzKSB7XG4gICAgICAgICAgICBhbmd1bGFyLmV4dGVuZChpbnRlcnBvbGF0ZVBhcmFtcywgJHBhcnNlKGlBdHRyLnRyYW5zbGF0ZVZhbHVlcykoc2NvcGUuJHBhcmVudCkpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBpbml0aWFsbHkgZmV0Y2ggYWxsIGF0dHJpYnV0ZXMgaWYgZXhpc3RpbmcgYW5kIGZpbGwgdGhlIHBhcmFtc1xuICAgICAgICAgIGlmICh0cmFuc2xhdGVWYWx1ZUV4aXN0KSB7XG4gICAgICAgICAgICBmb3IgKHZhciBhdHRyIGluIHRBdHRyKSB7XG4gICAgICAgICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoaUF0dHIsIGF0dHIpICYmIGF0dHIuc3Vic3RyKDAsIDE0KSA9PT0gJ3RyYW5zbGF0ZVZhbHVlJyAmJiBhdHRyICE9PSAndHJhbnNsYXRlVmFsdWVzJykge1xuICAgICAgICAgICAgICAgIHZhciBhdHRyaWJ1dGVOYW1lID0gYW5ndWxhci5sb3dlcmNhc2UoYXR0ci5zdWJzdHIoMTQsIDEpKSArIGF0dHIuc3Vic3RyKDE1KTtcbiAgICAgICAgICAgICAgICBpbnRlcnBvbGF0ZVBhcmFtc1thdHRyaWJ1dGVOYW1lXSA9IHRBdHRyW2F0dHJdO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEVuc3VyZXMgYW55IGNoYW5nZSBvZiB0aGUgYXR0cmlidXRlIFwidHJhbnNsYXRlXCIgY29udGFpbmluZyB0aGUgaWQgd2lsbFxuICAgICAgICAvLyBiZSByZS1zdG9yZWQgdG8gdGhlIHNjb3BlJ3MgXCJ0cmFuc2xhdGlvbklkXCIuXG4gICAgICAgIC8vIElmIHRoZSBhdHRyaWJ1dGUgaGFzIG5vIGNvbnRlbnQsIHRoZSBlbGVtZW50J3MgdGV4dCB2YWx1ZSAod2hpdGUgc3BhY2VzIHRyaW1tZWQgb2ZmKSB3aWxsIGJlIHVzZWQuXG4gICAgICAgIHZhciBvYnNlcnZlRWxlbWVudFRyYW5zbGF0aW9uID0gZnVuY3Rpb24gKHRyYW5zbGF0aW9uSWQpIHtcblxuICAgICAgICAgIC8vIFJlbW92ZSBhbnkgb2xkIHdhdGNoZXJcbiAgICAgICAgICBpZiAoYW5ndWxhci5pc0Z1bmN0aW9uKG9ic2VydmVFbGVtZW50VHJhbnNsYXRpb24uX3Vud2F0Y2hPbGQpKSB7XG4gICAgICAgICAgICBvYnNlcnZlRWxlbWVudFRyYW5zbGF0aW9uLl91bndhdGNoT2xkKCk7XG4gICAgICAgICAgICBvYnNlcnZlRWxlbWVudFRyYW5zbGF0aW9uLl91bndhdGNoT2xkID0gdW5kZWZpbmVkO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChhbmd1bGFyLmVxdWFscyh0cmFuc2xhdGlvbklkICwgJycpIHx8ICFhbmd1bGFyLmlzRGVmaW5lZCh0cmFuc2xhdGlvbklkKSkge1xuICAgICAgICAgICAgLy8gUmVzb2x2ZSB0cmFuc2xhdGlvbiBpZCBieSBpbm5lciBodG1sIGlmIHJlcXVpcmVkXG4gICAgICAgICAgICB2YXIgaW50ZXJwb2xhdGVNYXRjaGVzID0gdHJpbS5hcHBseShpRWxlbWVudC50ZXh0KCkpLm1hdGNoKGludGVycG9sYXRlUmVnRXhwKTtcbiAgICAgICAgICAgIC8vIEludGVycG9sYXRlIHRyYW5zbGF0aW9uIGlkIGlmIHJlcXVpcmVkXG4gICAgICAgICAgICBpZiAoYW5ndWxhci5pc0FycmF5KGludGVycG9sYXRlTWF0Y2hlcykpIHtcbiAgICAgICAgICAgICAgc2NvcGUucHJlVGV4dCA9IGludGVycG9sYXRlTWF0Y2hlc1sxXTtcbiAgICAgICAgICAgICAgc2NvcGUucG9zdFRleHQgPSBpbnRlcnBvbGF0ZU1hdGNoZXNbM107XG4gICAgICAgICAgICAgIHRyYW5zbGF0aW9uSWRzLnRyYW5zbGF0ZSA9ICRpbnRlcnBvbGF0ZShpbnRlcnBvbGF0ZU1hdGNoZXNbMl0pKHNjb3BlLiRwYXJlbnQpO1xuICAgICAgICAgICAgICB2YXIgd2F0Y2hlck1hdGNoZXMgPSBpRWxlbWVudC50ZXh0KCkubWF0Y2god2F0Y2hlclJlZ0V4cCk7XG4gICAgICAgICAgICAgIGlmIChhbmd1bGFyLmlzQXJyYXkod2F0Y2hlck1hdGNoZXMpICYmIHdhdGNoZXJNYXRjaGVzWzJdICYmIHdhdGNoZXJNYXRjaGVzWzJdLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIG9ic2VydmVFbGVtZW50VHJhbnNsYXRpb24uX3Vud2F0Y2hPbGQgPSBzY29wZS4kd2F0Y2god2F0Y2hlck1hdGNoZXNbMl0sIGZ1bmN0aW9uIChuZXdWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgdHJhbnNsYXRpb25JZHMudHJhbnNsYXRlID0gbmV3VmFsdWU7XG4gICAgICAgICAgICAgICAgICB1cGRhdGVUcmFuc2xhdGlvbnMoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdHJhbnNsYXRpb25JZHMudHJhbnNsYXRlID0gaUVsZW1lbnQudGV4dCgpLnJlcGxhY2UoL15cXHMrfFxccyskL2csJycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0cmFuc2xhdGlvbklkcy50cmFuc2xhdGUgPSB0cmFuc2xhdGlvbklkO1xuICAgICAgICAgIH1cbiAgICAgICAgICB1cGRhdGVUcmFuc2xhdGlvbnMoKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgb2JzZXJ2ZUF0dHJpYnV0ZVRyYW5zbGF0aW9uID0gZnVuY3Rpb24gKHRyYW5zbGF0ZUF0dHIpIHtcbiAgICAgICAgICBpQXR0ci4kb2JzZXJ2ZSh0cmFuc2xhdGVBdHRyLCBmdW5jdGlvbiAodHJhbnNsYXRpb25JZCkge1xuICAgICAgICAgICAgdHJhbnNsYXRpb25JZHNbdHJhbnNsYXRlQXR0cl0gPSB0cmFuc2xhdGlvbklkO1xuICAgICAgICAgICAgdXBkYXRlVHJhbnNsYXRpb25zKCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gaW5pdGlhbCBzZXR1cCB3aXRoIHZhbHVlc1xuICAgICAgICBpbml0SW50ZXJwb2xhdGlvblBhcmFtcyhzY29wZS5pbnRlcnBvbGF0ZVBhcmFtcywgaUF0dHIsIHRBdHRyKTtcblxuICAgICAgICB2YXIgZmlyc3RBdHRyaWJ1dGVDaGFuZ2VkRXZlbnQgPSB0cnVlO1xuICAgICAgICBpQXR0ci4kb2JzZXJ2ZSgndHJhbnNsYXRlJywgZnVuY3Rpb24gKHRyYW5zbGF0aW9uSWQpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIHRyYW5zbGF0aW9uSWQgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAvLyBjYXNlIG9mIGVsZW1lbnQgXCI8dHJhbnNsYXRlPnh5ejwvdHJhbnNsYXRlPlwiXG4gICAgICAgICAgICBvYnNlcnZlRWxlbWVudFRyYW5zbGF0aW9uKCcnKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gY2FzZSBvZiByZWd1bGFyIGF0dHJpYnV0ZVxuICAgICAgICAgICAgaWYgKHRyYW5zbGF0aW9uSWQgIT09ICcnIHx8ICFmaXJzdEF0dHJpYnV0ZUNoYW5nZWRFdmVudCkge1xuICAgICAgICAgICAgICB0cmFuc2xhdGlvbklkcy50cmFuc2xhdGUgPSB0cmFuc2xhdGlvbklkO1xuICAgICAgICAgICAgICB1cGRhdGVUcmFuc2xhdGlvbnMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgZmlyc3RBdHRyaWJ1dGVDaGFuZ2VkRXZlbnQgPSBmYWxzZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZm9yICh2YXIgdHJhbnNsYXRlQXR0ciBpbiBpQXR0cikge1xuICAgICAgICAgIGlmIChpQXR0ci5oYXNPd25Qcm9wZXJ0eSh0cmFuc2xhdGVBdHRyKSAmJiB0cmFuc2xhdGVBdHRyLnN1YnN0cigwLCAxMykgPT09ICd0cmFuc2xhdGVBdHRyJykge1xuICAgICAgICAgICAgb2JzZXJ2ZUF0dHJpYnV0ZVRyYW5zbGF0aW9uKHRyYW5zbGF0ZUF0dHIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlBdHRyLiRvYnNlcnZlKCd0cmFuc2xhdGVEZWZhdWx0JywgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgc2NvcGUuZGVmYXVsdFRleHQgPSB2YWx1ZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKHRyYW5zbGF0ZVZhbHVlc0V4aXN0KSB7XG4gICAgICAgICAgaUF0dHIuJG9ic2VydmUoJ3RyYW5zbGF0ZVZhbHVlcycsIGZ1bmN0aW9uIChpbnRlcnBvbGF0ZVBhcmFtcykge1xuICAgICAgICAgICAgaWYgKGludGVycG9sYXRlUGFyYW1zKSB7XG4gICAgICAgICAgICAgIHNjb3BlLiRwYXJlbnQuJHdhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBhbmd1bGFyLmV4dGVuZChzY29wZS5pbnRlcnBvbGF0ZVBhcmFtcywgJHBhcnNlKGludGVycG9sYXRlUGFyYW1zKShzY29wZS4kcGFyZW50KSk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRyYW5zbGF0ZVZhbHVlRXhpc3QpIHtcbiAgICAgICAgICB2YXIgb2JzZXJ2ZVZhbHVlQXR0cmlidXRlID0gZnVuY3Rpb24gKGF0dHJOYW1lKSB7XG4gICAgICAgICAgICBpQXR0ci4kb2JzZXJ2ZShhdHRyTmFtZSwgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgIHZhciBhdHRyaWJ1dGVOYW1lID0gYW5ndWxhci5sb3dlcmNhc2UoYXR0ck5hbWUuc3Vic3RyKDE0LCAxKSkgKyBhdHRyTmFtZS5zdWJzdHIoMTUpO1xuICAgICAgICAgICAgICBzY29wZS5pbnRlcnBvbGF0ZVBhcmFtc1thdHRyaWJ1dGVOYW1lXSA9IHZhbHVlO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfTtcbiAgICAgICAgICBmb3IgKHZhciBhdHRyIGluIGlBdHRyKSB7XG4gICAgICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGlBdHRyLCBhdHRyKSAmJiBhdHRyLnN1YnN0cigwLCAxNCkgPT09ICd0cmFuc2xhdGVWYWx1ZScgJiYgYXR0ciAhPT0gJ3RyYW5zbGF0ZVZhbHVlcycpIHtcbiAgICAgICAgICAgICAgb2JzZXJ2ZVZhbHVlQXR0cmlidXRlKGF0dHIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE1hc3RlciB1cGRhdGUgZnVuY3Rpb25cbiAgICAgICAgdmFyIHVwZGF0ZVRyYW5zbGF0aW9ucyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gdHJhbnNsYXRpb25JZHMpIHtcblxuICAgICAgICAgICAgaWYgKHRyYW5zbGF0aW9uSWRzLmhhc093blByb3BlcnR5KGtleSkgJiYgdHJhbnNsYXRpb25JZHNba2V5XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgIHVwZGF0ZVRyYW5zbGF0aW9uKGtleSwgdHJhbnNsYXRpb25JZHNba2V5XSwgc2NvcGUsIHNjb3BlLmludGVycG9sYXRlUGFyYW1zLCBzY29wZS5kZWZhdWx0VGV4dCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFB1dCB0cmFuc2xhdGlvbiBwcm9jZXNzaW5nIGZ1bmN0aW9uIG91dHNpZGUgbG9vcFxuICAgICAgICB2YXIgdXBkYXRlVHJhbnNsYXRpb24gPSBmdW5jdGlvbih0cmFuc2xhdGVBdHRyLCB0cmFuc2xhdGlvbklkLCBzY29wZSwgaW50ZXJwb2xhdGVQYXJhbXMsIGRlZmF1bHRUcmFuc2xhdGlvblRleHQpIHtcbiAgICAgICAgICBpZiAodHJhbnNsYXRpb25JZCkge1xuICAgICAgICAgICAgJHRyYW5zbGF0ZSh0cmFuc2xhdGlvbklkLCBpbnRlcnBvbGF0ZVBhcmFtcywgdHJhbnNsYXRlSW50ZXJwb2xhdGlvbiwgZGVmYXVsdFRyYW5zbGF0aW9uVGV4dClcbiAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHRyYW5zbGF0aW9uKSB7XG4gICAgICAgICAgICAgICAgYXBwbHlUcmFuc2xhdGlvbih0cmFuc2xhdGlvbiwgc2NvcGUsIHRydWUsIHRyYW5zbGF0ZUF0dHIpO1xuICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAodHJhbnNsYXRpb25JZCkge1xuICAgICAgICAgICAgICAgIGFwcGx5VHJhbnNsYXRpb24odHJhbnNsYXRpb25JZCwgc2NvcGUsIGZhbHNlLCB0cmFuc2xhdGVBdHRyKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIGFzIGFuIGVtcHR5IHN0cmluZyBjYW5ub3QgYmUgdHJhbnNsYXRlZCwgd2UgY2FuIHNvbHZlIHRoaXMgdXNpbmcgc3VjY2Vzc2Z1bD1mYWxzZVxuICAgICAgICAgICAgYXBwbHlUcmFuc2xhdGlvbih0cmFuc2xhdGlvbklkLCBzY29wZSwgZmFsc2UsIHRyYW5zbGF0ZUF0dHIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgYXBwbHlUcmFuc2xhdGlvbiA9IGZ1bmN0aW9uICh2YWx1ZSwgc2NvcGUsIHN1Y2Nlc3NmdWwsIHRyYW5zbGF0ZUF0dHIpIHtcbiAgICAgICAgICBpZiAodHJhbnNsYXRlQXR0ciA9PT0gJ3RyYW5zbGF0ZScpIHtcbiAgICAgICAgICAgIC8vIGRlZmF1bHQgdHJhbnNsYXRlIGludG8gaW5uZXJIVE1MXG4gICAgICAgICAgICBpZiAoIXN1Y2Nlc3NmdWwgJiYgdHlwZW9mIHNjb3BlLmRlZmF1bHRUZXh0ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICB2YWx1ZSA9IHNjb3BlLmRlZmF1bHRUZXh0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaUVsZW1lbnQuaHRtbChzY29wZS5wcmVUZXh0ICsgdmFsdWUgKyBzY29wZS5wb3N0VGV4dCk7XG4gICAgICAgICAgICB2YXIgZ2xvYmFsbHlFbmFibGVkID0gJHRyYW5zbGF0ZS5pc1Bvc3RDb21waWxpbmdFbmFibGVkKCk7XG4gICAgICAgICAgICB2YXIgbG9jYWxseURlZmluZWQgPSB0eXBlb2YgdEF0dHIudHJhbnNsYXRlQ29tcGlsZSAhPT0gJ3VuZGVmaW5lZCc7XG4gICAgICAgICAgICB2YXIgbG9jYWxseUVuYWJsZWQgPSBsb2NhbGx5RGVmaW5lZCAmJiB0QXR0ci50cmFuc2xhdGVDb21waWxlICE9PSAnZmFsc2UnO1xuICAgICAgICAgICAgaWYgKChnbG9iYWxseUVuYWJsZWQgJiYgIWxvY2FsbHlEZWZpbmVkKSB8fCBsb2NhbGx5RW5hYmxlZCkge1xuICAgICAgICAgICAgICAkY29tcGlsZShpRWxlbWVudC5jb250ZW50cygpKShzY29wZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHRyYW5zbGF0ZSBhdHRyaWJ1dGVcbiAgICAgICAgICAgIGlmICghc3VjY2Vzc2Z1bCAmJiB0eXBlb2Ygc2NvcGUuZGVmYXVsdFRleHQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgIHZhbHVlID0gc2NvcGUuZGVmYXVsdFRleHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgYXR0cmlidXRlTmFtZSA9IGlBdHRyLiRhdHRyW3RyYW5zbGF0ZUF0dHJdO1xuICAgICAgICAgICAgaWYgKGF0dHJpYnV0ZU5hbWUuc3Vic3RyKDAsIDUpID09PSAnZGF0YS0nKSB7XG4gICAgICAgICAgICAgIC8vIGVuc3VyZSBodG1sNSBkYXRhIHByZWZpeCBpcyBzdHJpcHBlZFxuICAgICAgICAgICAgICBhdHRyaWJ1dGVOYW1lID0gYXR0cmlidXRlTmFtZS5zdWJzdHIoNSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBhdHRyaWJ1dGVOYW1lID0gYXR0cmlidXRlTmFtZS5zdWJzdHIoMTUpO1xuICAgICAgICAgICAgaUVsZW1lbnQuYXR0cihhdHRyaWJ1dGVOYW1lLCB2YWx1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGlmICh0cmFuc2xhdGVWYWx1ZXNFeGlzdCB8fCB0cmFuc2xhdGVWYWx1ZUV4aXN0IHx8IGlBdHRyLnRyYW5zbGF0ZURlZmF1bHQpIHtcbiAgICAgICAgICBzY29wZS4kd2F0Y2goJ2ludGVycG9sYXRlUGFyYW1zJywgdXBkYXRlVHJhbnNsYXRpb25zLCB0cnVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEVuc3VyZXMgdGhlIHRleHQgd2lsbCBiZSByZWZyZXNoZWQgYWZ0ZXIgdGhlIGN1cnJlbnQgbGFuZ3VhZ2Ugd2FzIGNoYW5nZWRcbiAgICAgICAgLy8gdy8gJHRyYW5zbGF0ZS51c2UoLi4uKVxuICAgICAgICB2YXIgdW5iaW5kID0gJHJvb3RTY29wZS4kb24oJyR0cmFuc2xhdGVDaGFuZ2VTdWNjZXNzJywgdXBkYXRlVHJhbnNsYXRpb25zKTtcblxuICAgICAgICAvLyBlbnN1cmUgdHJhbnNsYXRpb24gd2lsbCBiZSBsb29rZWQgdXAgYXQgbGVhc3Qgb25lXG4gICAgICAgIGlmIChpRWxlbWVudC50ZXh0KCkubGVuZ3RoKSB7XG4gICAgICAgICAgaWYgKGlBdHRyLnRyYW5zbGF0ZSkge1xuICAgICAgICAgICAgb2JzZXJ2ZUVsZW1lbnRUcmFuc2xhdGlvbihpQXR0ci50cmFuc2xhdGUpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvYnNlcnZlRWxlbWVudFRyYW5zbGF0aW9uKCcnKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoaUF0dHIudHJhbnNsYXRlKSB7XG4gICAgICAgICAgLy8gZW5zdXJlIGF0dHJpYnV0ZSB3aWxsIGJlIG5vdCBza2lwcGVkXG4gICAgICAgICAgb2JzZXJ2ZUVsZW1lbnRUcmFuc2xhdGlvbihpQXR0ci50cmFuc2xhdGUpO1xuICAgICAgICB9XG4gICAgICAgIHVwZGF0ZVRyYW5zbGF0aW9ucygpO1xuICAgICAgICBzY29wZS4kb24oJyRkZXN0cm95JywgdW5iaW5kKTtcbiAgICAgIH07XG4gICAgfVxuICB9O1xufVxudHJhbnNsYXRlRGlyZWN0aXZlLiRpbmplY3QgPSBbJyR0cmFuc2xhdGUnLCAnJHEnLCAnJGludGVycG9sYXRlJywgJyRjb21waWxlJywgJyRwYXJzZScsICckcm9vdFNjb3BlJ107XG5cbnRyYW5zbGF0ZURpcmVjdGl2ZS5kaXNwbGF5TmFtZSA9ICd0cmFuc2xhdGVEaXJlY3RpdmUnO1xuXG5hbmd1bGFyLm1vZHVsZSgncGFzY2FscHJlY2h0LnRyYW5zbGF0ZScpXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHBhc2NhbHByZWNodC50cmFuc2xhdGUuZGlyZWN0aXZlOnRyYW5zbGF0ZUNsb2FrXG4gKiBAcmVxdWlyZXMgJHJvb3RTY29wZVxuICogQHJlcXVpcmVzICR0cmFuc2xhdGVcbiAqIEByZXN0cmljdCBBXG4gKlxuICogJGRlc2NyaXB0aW9uXG4gKiBBZGRzIGEgYHRyYW5zbGF0ZS1jbG9ha2AgY2xhc3MgbmFtZSB0byB0aGUgZ2l2ZW4gZWxlbWVudCB3aGVyZSB0aGlzIGRpcmVjdGl2ZVxuICogaXMgYXBwbGllZCBpbml0aWFsbHkgYW5kIHJlbW92ZXMgaXQsIG9uY2UgYSBsb2FkZXIgaGFzIGZpbmlzaGVkIGxvYWRpbmcuXG4gKlxuICogVGhpcyBkaXJlY3RpdmUgY2FuIGJlIHVzZWQgdG8gcHJldmVudCBpbml0aWFsIGZsaWNrZXJpbmcgd2hlbiBsb2FkaW5nIHRyYW5zbGF0aW9uXG4gKiBkYXRhIGFzeW5jaHJvbm91c2x5LlxuICpcbiAqIFRoZSBjbGFzcyBuYW1lIGlzIGRlZmluZWQgaW5cbiAqIHtAbGluayBwYXNjYWxwcmVjaHQudHJhbnNsYXRlLiR0cmFuc2xhdGVQcm92aWRlciNjbG9ha0NsYXNzTmFtZSAkdHJhbnNsYXRlLmNsb2FrQ2xhc3NOYW1lKCl9LlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nPX0gdHJhbnNsYXRlLWNsb2FrIElmIGEgdHJhbnNsYXRpb25JZCBpcyBwcm92aWRlZCwgaXQgd2lsbCBiZSB1c2VkIGZvciBzaG93aW5nXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvciBoaWRpbmcgdGhlIGNsb2FrLiBCYXNpY2FsbHkgaXQgcmVsaWVzIG9uIHRoZSB0cmFuc2xhdGlvblxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZS5cbiAqL1xuLmRpcmVjdGl2ZSgndHJhbnNsYXRlQ2xvYWsnLCB0cmFuc2xhdGVDbG9ha0RpcmVjdGl2ZSk7XG5cbmZ1bmN0aW9uIHRyYW5zbGF0ZUNsb2FrRGlyZWN0aXZlKCRyb290U2NvcGUsICR0cmFuc2xhdGUpIHtcblxuICAndXNlIHN0cmljdCc7XG5cbiAgcmV0dXJuIHtcbiAgICBjb21waWxlOiBmdW5jdGlvbiAodEVsZW1lbnQpIHtcbiAgICAgIHZhciBhcHBseUNsb2FrID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0RWxlbWVudC5hZGRDbGFzcygkdHJhbnNsYXRlLmNsb2FrQ2xhc3NOYW1lKCkpO1xuICAgICAgfSxcbiAgICAgIHJlbW92ZUNsb2FrID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0RWxlbWVudC5yZW1vdmVDbGFzcygkdHJhbnNsYXRlLmNsb2FrQ2xhc3NOYW1lKCkpO1xuICAgICAgfSxcbiAgICAgIHJlbW92ZUxpc3RlbmVyID0gJHJvb3RTY29wZS4kb24oJyR0cmFuc2xhdGVDaGFuZ2VFbmQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJlbW92ZUNsb2FrKCk7XG4gICAgICAgIHJlbW92ZUxpc3RlbmVyKCk7XG4gICAgICAgIHJlbW92ZUxpc3RlbmVyID0gbnVsbDtcbiAgICAgIH0pO1xuICAgICAgYXBwbHlDbG9haygpO1xuXG4gICAgICByZXR1cm4gZnVuY3Rpb24gbGlua0ZuKHNjb3BlLCBpRWxlbWVudCwgaUF0dHIpIHtcbiAgICAgICAgLy8gUmVnaXN0ZXIgYSB3YXRjaGVyIGZvciB0aGUgZGVmaW5lZCB0cmFuc2xhdGlvbiBhbGxvd2luZyBhIGZpbmUgdHVuZWQgY2xvYWtcbiAgICAgICAgaWYgKGlBdHRyLnRyYW5zbGF0ZUNsb2FrICYmIGlBdHRyLnRyYW5zbGF0ZUNsb2FrLmxlbmd0aCkge1xuICAgICAgICAgIGlBdHRyLiRvYnNlcnZlKCd0cmFuc2xhdGVDbG9haycsIGZ1bmN0aW9uICh0cmFuc2xhdGlvbklkKSB7XG4gICAgICAgICAgICAkdHJhbnNsYXRlKHRyYW5zbGF0aW9uSWQpLnRoZW4ocmVtb3ZlQ2xvYWssIGFwcGx5Q2xvYWspO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH1cbiAgfTtcbn1cbnRyYW5zbGF0ZUNsb2FrRGlyZWN0aXZlLiRpbmplY3QgPSBbJyRyb290U2NvcGUnLCAnJHRyYW5zbGF0ZSddO1xuXG50cmFuc2xhdGVDbG9ha0RpcmVjdGl2ZS5kaXNwbGF5TmFtZSA9ICd0cmFuc2xhdGVDbG9ha0RpcmVjdGl2ZSc7XG5cbmFuZ3VsYXIubW9kdWxlKCdwYXNjYWxwcmVjaHQudHJhbnNsYXRlJylcbi8qKlxuICogQG5nZG9jIGZpbHRlclxuICogQG5hbWUgcGFzY2FscHJlY2h0LnRyYW5zbGF0ZS5maWx0ZXI6dHJhbnNsYXRlXG4gKiBAcmVxdWlyZXMgJHBhcnNlXG4gKiBAcmVxdWlyZXMgcGFzY2FscHJlY2h0LnRyYW5zbGF0ZS4kdHJhbnNsYXRlXG4gKiBAZnVuY3Rpb25cbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIFVzZXMgYCR0cmFuc2xhdGVgIHNlcnZpY2UgdG8gdHJhbnNsYXRlIGNvbnRlbnRzLiBBY2NlcHRzIGludGVycG9sYXRlIHBhcmFtZXRlcnNcbiAqIHRvIHBhc3MgZHluYW1pemVkIHZhbHVlcyB0aG91Z2ggdHJhbnNsYXRpb24uXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHRyYW5zbGF0aW9uSWQgQSB0cmFuc2xhdGlvbiBpZCB0byBiZSB0cmFuc2xhdGVkLlxuICogQHBhcmFtIHsqPX0gaW50ZXJwb2xhdGVQYXJhbXMgT3B0aW9uYWwgb2JqZWN0IGxpdGVyYWwgKGFzIGhhc2ggb3Igc3RyaW5nKSB0byBwYXNzIHZhbHVlcyBpbnRvIHRyYW5zbGF0aW9uLlxuICpcbiAqIEByZXR1cm5zIHtzdHJpbmd9IFRyYW5zbGF0ZWQgdGV4dC5cbiAqXG4gKiBAZXhhbXBsZVxuICAgPGV4YW1wbGUgbW9kdWxlPVwibmdWaWV3XCI+XG4gICAgPGZpbGUgbmFtZT1cImluZGV4Lmh0bWxcIj5cbiAgICAgIDxkaXYgbmctY29udHJvbGxlcj1cIlRyYW5zbGF0ZUN0cmxcIj5cblxuICAgICAgICA8cHJlPnt7ICdUUkFOU0xBVElPTl9JRCcgfCB0cmFuc2xhdGUgfX08L3ByZT5cbiAgICAgICAgPHByZT57eyB0cmFuc2xhdGlvbklkIHwgdHJhbnNsYXRlIH19PC9wcmU+XG4gICAgICAgIDxwcmU+e3sgJ1dJVEhfVkFMVUVTJyB8IHRyYW5zbGF0ZTone3ZhbHVlOiA1fScgfX08L3ByZT5cbiAgICAgICAgPHByZT57eyAnV0lUSF9WQUxVRVMnIHwgdHJhbnNsYXRlOnZhbHVlcyB9fTwvcHJlPlxuXG4gICAgICA8L2Rpdj5cbiAgICA8L2ZpbGU+XG4gICAgPGZpbGUgbmFtZT1cInNjcmlwdC5qc1wiPlxuICAgICAgYW5ndWxhci5tb2R1bGUoJ25nVmlldycsIFsncGFzY2FscHJlY2h0LnRyYW5zbGF0ZSddKVxuXG4gICAgICAuY29uZmlnKGZ1bmN0aW9uICgkdHJhbnNsYXRlUHJvdmlkZXIpIHtcblxuICAgICAgICAkdHJhbnNsYXRlUHJvdmlkZXIudHJhbnNsYXRpb25zKCdlbicsIHtcbiAgICAgICAgICAnVFJBTlNMQVRJT05fSUQnOiAnSGVsbG8gdGhlcmUhJyxcbiAgICAgICAgICAnV0lUSF9WQUxVRVMnOiAnVGhlIGZvbGxvd2luZyB2YWx1ZSBpcyBkeW5hbWljOiB7e3ZhbHVlfX0nXG4gICAgICAgIH0pO1xuICAgICAgICAkdHJhbnNsYXRlUHJvdmlkZXIucHJlZmVycmVkTGFuZ3VhZ2UoJ2VuJyk7XG5cbiAgICAgIH0pO1xuXG4gICAgICBhbmd1bGFyLm1vZHVsZSgnbmdWaWV3JykuY29udHJvbGxlcignVHJhbnNsYXRlQ3RybCcsIGZ1bmN0aW9uICgkc2NvcGUpIHtcbiAgICAgICAgJHNjb3BlLnRyYW5zbGF0aW9uSWQgPSAnVFJBTlNMQVRJT05fSUQnO1xuXG4gICAgICAgICRzY29wZS52YWx1ZXMgPSB7XG4gICAgICAgICAgdmFsdWU6IDc4XG4gICAgICAgIH07XG4gICAgICB9KTtcbiAgICA8L2ZpbGU+XG4gICA8L2V4YW1wbGU+XG4gKi9cbi5maWx0ZXIoJ3RyYW5zbGF0ZScsIHRyYW5zbGF0ZUZpbHRlckZhY3RvcnkpO1xuXG5mdW5jdGlvbiB0cmFuc2xhdGVGaWx0ZXJGYWN0b3J5KCRwYXJzZSwgJHRyYW5zbGF0ZSkge1xuXG4gICd1c2Ugc3RyaWN0JztcblxuICB2YXIgdHJhbnNsYXRlRmlsdGVyID0gZnVuY3Rpb24gKHRyYW5zbGF0aW9uSWQsIGludGVycG9sYXRlUGFyYW1zLCBpbnRlcnBvbGF0aW9uKSB7XG5cbiAgICBpZiAoIWFuZ3VsYXIuaXNPYmplY3QoaW50ZXJwb2xhdGVQYXJhbXMpKSB7XG4gICAgICBpbnRlcnBvbGF0ZVBhcmFtcyA9ICRwYXJzZShpbnRlcnBvbGF0ZVBhcmFtcykodGhpcyk7XG4gICAgfVxuXG4gICAgcmV0dXJuICR0cmFuc2xhdGUuaW5zdGFudCh0cmFuc2xhdGlvbklkLCBpbnRlcnBvbGF0ZVBhcmFtcywgaW50ZXJwb2xhdGlvbik7XG4gIH07XG5cbiAgaWYgKCR0cmFuc2xhdGUuc3RhdGVmdWxGaWx0ZXIoKSkge1xuICAgIHRyYW5zbGF0ZUZpbHRlci4kc3RhdGVmdWwgPSB0cnVlO1xuICB9XG5cbiAgcmV0dXJuIHRyYW5zbGF0ZUZpbHRlcjtcbn1cbnRyYW5zbGF0ZUZpbHRlckZhY3RvcnkuJGluamVjdCA9IFsnJHBhcnNlJywgJyR0cmFuc2xhdGUnXTtcblxudHJhbnNsYXRlRmlsdGVyRmFjdG9yeS5kaXNwbGF5TmFtZSA9ICd0cmFuc2xhdGVGaWx0ZXJGYWN0b3J5JztcblxuYW5ndWxhci5tb2R1bGUoJ3Bhc2NhbHByZWNodC50cmFuc2xhdGUnKVxuXG4vKipcbiAqIEBuZ2RvYyBvYmplY3RcbiAqIEBuYW1lIHBhc2NhbHByZWNodC50cmFuc2xhdGUuJHRyYW5zbGF0aW9uQ2FjaGVcbiAqIEByZXF1aXJlcyAkY2FjaGVGYWN0b3J5XG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBUaGUgZmlyc3QgdGltZSBhIHRyYW5zbGF0aW9uIHRhYmxlIGlzIHVzZWQsIGl0IGlzIGxvYWRlZCBpbiB0aGUgdHJhbnNsYXRpb24gY2FjaGUgZm9yIHF1aWNrIHJldHJpZXZhbC4gWW91XG4gKiBjYW4gbG9hZCB0cmFuc2xhdGlvbiB0YWJsZXMgZGlyZWN0bHkgaW50byB0aGUgY2FjaGUgYnkgY29uc3VtaW5nIHRoZVxuICogYCR0cmFuc2xhdGlvbkNhY2hlYCBzZXJ2aWNlIGRpcmVjdGx5LlxuICpcbiAqIEByZXR1cm4ge29iamVjdH0gJGNhY2hlRmFjdG9yeSBvYmplY3QuXG4gKi9cbiAgLmZhY3RvcnkoJyR0cmFuc2xhdGlvbkNhY2hlJywgJHRyYW5zbGF0aW9uQ2FjaGUpO1xuXG5mdW5jdGlvbiAkdHJhbnNsYXRpb25DYWNoZSgkY2FjaGVGYWN0b3J5KSB7XG5cbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIHJldHVybiAkY2FjaGVGYWN0b3J5KCd0cmFuc2xhdGlvbnMnKTtcbn1cbiR0cmFuc2xhdGlvbkNhY2hlLiRpbmplY3QgPSBbJyRjYWNoZUZhY3RvcnknXTtcblxuJHRyYW5zbGF0aW9uQ2FjaGUuZGlzcGxheU5hbWUgPSAnJHRyYW5zbGF0aW9uQ2FjaGUnO1xucmV0dXJuICdwYXNjYWxwcmVjaHQudHJhbnNsYXRlJztcblxufSkpO1xuIl0sImZpbGUiOiJhbmd1bGFyLXRyYW5zbGF0ZS5qcyIsInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9