"use strict";

var jsdiff = require('diff');

const re = /%%\w+%%/g

const StanzaMatcher = function () {

}

const compareAttributes = function (expectedAttrs, attrs, result) {
  for (var i in expectedAttrs) {
    var expectedValue = expectedAttrs[i]
    var value = attrs[i]

    if (!value) {
      result.matches = false
    } else {

      var diffChars = jsdiff.diffChars(expectedValue, value);

      console.log(diffChars)
      for (var j = 0; j < diffChars.length; j++) {
        var curDiff = diffChars[j];

        var removed = curDiff.removed
        var added = curDiff.added
        var matchesRegexp = re.test(curDiff.value)

        if (removed && matchesRegexp) {
          console.log("found placeholder " + curDiff.value)
          result.replacements[curDiff.value] = diffChars[+j + 1].value
          j++
        } else if (removed || added) {
          result.matches = false
          console.log(`attribute value not matching, expected ${expectedValue}, got ${value}`)
          return result
        }
      }

    }

  }
  return result
}

// returns true if the matcher matches the stanza
StanzaMatcher.prototype.matching = function (matcher, stanza) {
  var result = {
    matches: true,
    replacements: {}
  }

  if (matcher.name && matcher.name !== stanza.name) {
    result.matches = false
    return result
  }
  return compareAttributes(matcher.attrs, stanza.attrs, result)
}


module.exports = StanzaMatcher