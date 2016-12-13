'use strict'

var jsdiff = require('diff')

// returns true if the matcher matches the stanza
function matching (matcher, stanza) {
  console.log(`Checking match on: ${JSON.stringify(matcher)}`)

  var result = {
    matches: true,
    replacements: {}
  }

  if (matcher.name && matcher.name !== stanza.name) {
    result.matches = false
    console.log(`Name not matching: ${stanza.name}, expected: ${matcher.name}`)
    return result
  }
  result = compareAttributes(matcher.attrs, stanza.attrs, result)
  result = compareChildren(matcher.children, stanza.children, result)
  return result
}

/**
 * Compare two text elements, sets 'matches=false' in  the result if the texts don't match,
 * adds existing '%%\w+%%' placeholders with their values into 'result.replacements'.
 * - Diffs the expected value against the actual one, should yield all 'added' diffs. If there's any 'removed' difference,
 * then matches=false.
 *
 */
function compareText (expectedValue, value, result) {
  console.log(`Compare text '${expectedValue}', '${value}'`)

  // Compare trivial equality (full text match)
  if (expectedValue === value) {
    console.log('Matches - Trivial equals')
    return
  }

  // Find any placeholders
  var placeholders = expectedValue.match(/%%\w+%%/g)
  if (!placeholders) {
    result.matches = false
    console.log(`Not matching, value doesn't match and no placeholders found in ${value}`)
    return
  }

  console.log(`Extracted placeholders: ${placeholders}`)
  var temp = expectedValue
  for (var i = 0; i < placeholders.length; i++) {
    var ph = placeholders[ i ]
    temp = temp.replace(ph, '')
  }

  var diffChars = jsdiff.diffChars(temp, value)

  var curPlaceholder = 0
  for (var j = 0; j < diffChars.length; j++) {
    var curDiff = diffChars[ j ]
    if (curDiff.removed) {
      result.matches = false
      console.log(`Not matching, found extra string ${curDiff.value}`)
      return
    } else if (curDiff.added) {
      if (curPlaceholder >= placeholders.length) {
        result.matches = false
        console.log(`Not matching, there are more differences than placeholders, expected ${placeholders.length}`)
        return
      }
      // is  there already an existing placeholder with a different value?
      var currentValue = result.replacements[ placeholders[ curPlaceholder ] ]
      if (currentValue && currentValue !== curDiff.value) {
        console.log(`Not matching, existing placeholder ${placeholders[ curPlaceholder ]} -> ${currentValue} found again with a different value ${curDiff.value}`)
        result.matches = false
        return
      }
      result.replacements[ placeholders[ curPlaceholder++ ] ] = curDiff.value
    }
  }
}

function compareAttributes (expectedAttrs, attrs, result) {
  // console.log(`Comparing attrs
  // expected:
  //   ${JSON.stringify(expectedAttrs)}
  // received:
  //   ${JSON.stringify(attrs)}`)

  for (var i in expectedAttrs) {
    var expectedValue = expectedAttrs[ i ]
    var value = attrs[ i ]

    if (!value) {
      console.log(`Not matching, attribute '${i}' not found`)
      result.matches = false
    } else {
      // console.log(`Compare attribute value of '${i}'`)
      compareText(expectedValue, value, result)
    }
  }
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
  for (var i in child.children) {
    var curChild = child.children[ i ]
    if (typeof curChild === 'string') {
      return curChild
    }
  }
  return undefined
}

function compareChildren (expected, children, result) {
  if (!expected || expected.length === 0) {
    return result
  }

  for (var i in expected) {
    let matcher = expected[ i ]

    var name = matcher.name
    var child = getChild(children, name)

    if (matcher.absent && !child) {
      // fine, go, on...
    } else if (matcher.absent && child) {
      console.log(`No match - Element with name ${name} should not be present in ${children}`)
      result.matches = false
      return result
    } else if (!child) {
      console.log(`No match - Did not find an element with name ${name} in ${children}`)
      result.matches = false
      return result
    } else { // Expected to be present, match rest of attributes
      if (matcher.text) {
        var textChild = getText(child)
        compareText(matcher.text, textChild, result)
        if (!result.matches) {
          result.matches = false
          console.log(`No match - Unexpected text ${textChild}`)
          return result
        }
      }
      result = compareAttributes(matcher.attrs, child.attrs, result)
      if (!result.matches) {
        // console.log("Attributes don't match")
        return result
      }
      result = compareChildren(matcher.children, child.children, result)
    }
  }
  return result
}

module.exports = { matching, compareText }
