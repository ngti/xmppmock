'use strict'

var jsdiff = require('diff')

// returns true if the matcher matches the stanza
function matching (matcher, stanza) {
  var result = {
    matches: true,
    replacements: {}
  }

  if (matcher.name && matcher.name !== stanza.name) {
    result.matches = false
    return result
  }
  result = compareAttributes(matcher.attrs, stanza.attrs, result)
  return compareChildren(matcher.children, stanza.children, result)
}

function compareText (expectedValue, value, result) {
  // console.log(`Compare text '${expectedValue}', '${value}'`)
  var diffChars = jsdiff.diffChars(expectedValue, value)

  for (var j = 0; j < diffChars.length; j++) {
    const placeholderRegex = /%%\w+%%/g
    var curDiff = diffChars[ j ]

    var removed = curDiff.removed
    var added = curDiff.added
    // console.log(`matching on ${curDiff.value}`)
    var matchesRegexp = placeholderRegex.test(curDiff.value)

    // console.log(`Removed: ${removed}, added: ${added}, matches: ${matchesRegexp}`)
    if (removed && matchesRegexp) {
      result.replacements[ curDiff.value ] = diffChars[ +j + 1 ].value
      console.log(`Found placeholder ${curDiff.value} -> ${diffChars[ +j + 1 ].value}`)
      j++
    } else if (removed || added) {
      result.matches = false
      console.log(`Attribute value not matching, expected ${expectedValue}, got ${value}`)
    }
  }
}

function compareAttributes (expectedAttrs, attrs, result) {
  // console.log(`expected ${JSON.stringify(expectedAttrs)}, attrs ${JSON.stringify(attrs)}`)
  for (var i in expectedAttrs) {
    var expectedValue = expectedAttrs[ i ]
    var value = attrs[ i ]

    if (!value) {
      result.matches = false
    } else {
      compareText(expectedValue, value, result)
    }
  }
  return result
}

function compareChildren (expected, children, result) {
  if (!expected || expected.length === 0) {
    return result
  }

  function getChild (children, name) {
    for (var i in children) {
      if (children[ i ].name === name) {
        return children[ i ]
      }
    }
  }

  function getText (child) {
    for (i in child.children) {
      var curChild = child.children[ i ]
      if (typeof curChild === 'string') {
        return curChild
      }
    }
    return undefined
  }

  for (var i in expected) {
    var name = expected[ i ].name
    var child = getChild(children, name)
    if (!child) {
      console.log(`Did not find an element with name ${name} in ${children}`)
      result.matches = false
      return result
    } else {
      if (expected[ i ].text) {
        var textChild = getText(child)
        compareText(expected[ i ].text, textChild, result)
        if (!result.matches) {
          result.matches = false
          console.log(`Unexpected text ${textChild}`)
        }
      }
      result = compareAttributes(expected.attrs, child.attrs, result)
      result = compareChildren(expected.children, child.children, result)
    }
  }
  return result
}

module.exports = { matching }
