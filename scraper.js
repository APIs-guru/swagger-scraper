'use strict';
var system = require('system');
var webpage = require('webpage');
var _ = require('lodash');

var debugMode = false;
var url = system.args[1];

var page = webpage.create();
page.settings.loadImages = false;
page.settings.userAgent = 'Mozilla/5.0 (Windows NT 6.1; rv:31.0) Gecko/20100101 Firefox/31.0';
page.settings.resourceTimeout = 20000;

if (debugMode) {
  debugger;
  page.evaluateAsync(function() {
    debugger;
  });
  page.onConsoleMessage = function(msg) {
  console.log('> ' + msg);
  }
}
else {
  //Suppress calltraces from page
  page.onError = function () {}
}

page.open(url, function(status) {
  if (status === 'fail')
    returnValue({error: 'unreachable'});

  var swagger = scrapePage();
  if (swagger)
    returnSwagger(swagger);

  /* try one more time after small sleep */
  var tries = 5;
  var intervalId = setInterval(function () {
    if (!isLoadingComplete() && --tries > 0)
      return;
    clearInterval(intervalId);
    var swagger = scrapePage();
    returnSwagger(swagger);
  }, 2000);
});

function returnSwagger(swagger) {
  if (!swagger)
    returnValue({error: 'not_swagger'});
  returnValue({swagger: swagger});
}

function returnValue(value) {
  value.url = url;
  console.log(JSON.stringify(value));
  phantom.exit();
}

function isLoadingComplete() {
  return page.evaluate(function() {
    console.log('state: ' + document.readyState);
    return document.readyState === 'complete';
  });
}

function scrapePage() {
  var swagger = scrapeSwaggerUi();

  for (var i = 0; i < page.framesCount; ++i) {
    page.switchToChildFrame(i);
    var result = scrapeSwaggerUi();
    page.switchToParentFrame();

    if (result) {
      if (swagger)
        throw 'duplicate swaggerUi';
      swagger = result;
    }
  }
  return swagger;
}

function scrapeSwaggerUi() {
  return page.evaluate(function() {
    if (!window.swaggerUi) {
      console.log('missing swaggerUi');
      return;
    }
    var options = window.swaggerUi.options;
    console.log('options:' + JSON.stringify(options));
    return options.url || options.discoveryUrl;
  });
}
