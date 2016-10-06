"use strict";

const re = /%%\w+%%/g

const StanzaMatcher = function () {

}

String.prototype.matchAll = function(regexp) {
  var matches = [];
  this.replace(regexp, function() {
    var arr = ([]).slice.call(arguments, 0);
    var extras = arr.splice(-2);
    arr.index = extras[0];
    arr.input = extras[1];
    matches.push(arr);
  });
  return matches.length ? matches : null
}

const compareAttributes = function (expectedAttrs, attrs) {
  var match = true
  for (var attr in expectedAttrs) {
    var expectedValue = expectedAttrs[attr]
    var value = attrs[attr]

    var allPlaceholders = expectedValue.matchAll(re)

    var find = escapeRegExp(expectedValue)
    for(var i in allPlaceholders){
      var placeholder = allPlaceholders[i][0]
      find = find.replace(placeholder, '[\\w\\.]+')
    }
    var regExp = new RegExp(find)

    if(!regExp.test(value)){
      console.log(`Expected ${expectedValue}, found ${value}`)
      match =false
    }
  }
  return match
}

function escapeRegExp(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

// returns true if the matcher matches the stanza
StanzaMatcher.prototype.matching = function (matcher, stanza) {
  if (matcher.name && matcher.name !== stanza.name) {
    return false
  }
  return !(matcher.attrs && !compareAttributes(matcher.attrs, stanza.attrs))
}

// returns an object with wildcard replacements
StanzaMatcher.prototype.getReplacements = function (matcher, stanza) {


}


module.exports = StanzaMatcher