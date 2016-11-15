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
  console.log(`Compare text '${expectedValue}', '${value}'`)
  if (expectedValue === value) {
    console.log('trivial equals')
    return
  }

  var placeholders = expectedValue.match(/%%\w+%%/g)
  if (!placeholders) {
    result.matches = false
    return
  }

  console.log(placeholders)
  var temp = expectedValue
  for (var i = 0; i < placeholders.length; i++) {
    var ph = placeholders[ i ]
    temp = temp.replace(ph, '')
  }

  var diffChars = jsdiff.diffChars(temp, value)
  console.log(`diff: ${JSON.stringify(diffChars)}`)

  var curPlaceholder = 0
  for (var j = 0; j < diffChars.length; j++) {
    var curDiff = diffChars[ j ]
    if (curDiff.removed) {
      result.matches = false
      return
    } else if (curDiff.added) {
      if (curPlaceholder >= placeholders.length) {
        result.matches = false
        return
      }
      // is  there already an existing placeholder with a different value?
      var currentValue = result.replacements[ placeholders[ curPlaceholder ] ]
      if (currentValue && currentValue !== curDiff.value) {
        console.log(`Existing placeholder ${placeholders[ curPlaceholder ]} -> ${currentValue} found again with a different value ${curDiff.value}`)
        result.matches = false
        return
      }
      result.replacements[ placeholders[ curPlaceholder++ ] ] = curDiff.value
    }
  }
}

function compareAttributes (expectedAttrs, attrs, result) {
  console.log(`
        Comparing
        attrs
        expected: ${JSON.stringify(expectedAttrs)},
        received: ${JSON.stringify(attrs)}`)
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
      console.log(`
        Did
        not
        find
        an
        element
        with name ${name} in ${children}`)
      result.matches = false
      return result
    } else {
      if (expected[ i ].text) {
        var textChild = getText(child)
        compareText(expected[ i ].text, textChild, result)
        if (!result.matches) {
          result.matches = false
          console.log(`Unexpected
        text ${textChild}`)
        }
      }
      result = compareAttributes(expected[ i ].attrs, child.attrs, result)
      result = compareChildren(expected.children, child.children, result)
    }
  }
  return result
}

module.exports = { matching, compareText }
