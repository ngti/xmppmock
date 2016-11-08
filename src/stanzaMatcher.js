"use strict";

var jsdiff = require('diff');


const StanzaMatcher = function () {

}

var compareText = function (expectedValue, value, result) {
  console.log(`Compare text '${expectedValue}', '${value}'`)
  var diffChars = jsdiff.diffChars(expectedValue, value);

  for (var j = 0; j < diffChars.length; j++) {
    const re = /%%\w+%%/g
    var curDiff = diffChars[j];

    var removed = curDiff.removed
    var added = curDiff.added
    console.log(`matching on ${curDiff.value}`)
    var matchesRegexp = re.test(curDiff.value)

    console.log(`Removed: ${removed}, added: ${added}, matches: ${matchesRegexp}`)
    if (removed && matchesRegexp) {
      console.log(`Found placeholder ${curDiff.value}`)
      result.replacements[curDiff.value] = diffChars[+j + 1].value
      j++
    } else if (removed || added) {
      result.matches = false
      console.log(`Attribute value not matching, expected ${expectedValue}, got ${value}`)
    }
  }

}

const compareAttributes = function (expectedAttrs, attrs, result) {
  console.log(`expected ${JSON.stringify(expectedAttrs)}, attrs ${JSON.stringify(attrs)}`)
  for (var i in expectedAttrs) {
    var expectedValue = expectedAttrs[i]
    var value = attrs[i]

    if (!value) {
      result.matches = false
    } else {
      compareText(expectedValue, value, result);
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
  result = compareAttributes(matcher.attrs, stanza.attrs, result)
  return this.compareChildren(matcher.children, stanza.children, result)
}

StanzaMatcher.prototype.compareChildren = function (expected, children, result) {
  if (!expected || expected.length == 0) {
    return result
  }

  function getChild (children, name) {
    for (var i in children) {
      if (children[i].name === name) {
        return children[i]
      }
    }
  }

  function getText (child) {
    for (i in child.children) {
      var curChild = child.children[i];
      if (typeof curChild == "string") {
        return curChild
      }
    }
    return undefined
  }

  for (var i in expected) {
    var name = expected[i].name;
    var child = getChild(children, name);
    if (!child) {
      console.log(`Did not find an element with name ${name} in ${children}`)
      result.matches = false
      return result
    } else {

      if (expected[i].text) {
        var textChild = getText(child)
        compareText(expected[i].text, textChild, result);
        if (!result.matches) {
          // result.matches = false
          console.log(`Unexpected text ${textChild}`)
        }
      }
      result = compareAttributes(expected.attrs, child.attrs, result)
      result = this.compareChildren(expected.children, child.children, result)
    }
  }
  return result
}


module.exports = StanzaMatcher