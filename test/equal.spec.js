'use strict'

const isEqual = require('lodash.isequal')
const assert = require('assert')

describe('equals stuff', function () {
  assert(isEqual({a: 1}, {a: 1}))
})
