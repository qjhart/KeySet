'use strict'
var assert = require('assert')
var should = require('should')

describe('testing keyset', function () {
  var KeySet
  var AZ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
  before(function () {
    KeySet = require('../nodejs/lib/KeySet.js')
  })

  it('should make new keysets', function (next) {
    var ks = new KeySet(AZ)
    ks.size().should.equal(AZ.length)
    ks.bits().length.should.equal(AZ.length)

    ks = new KeySet(AZ.slice(0, 10), 26)
    AZ.slice(10, 100).forEach(function (k) { ks.bit(k)})
    ks.bits().length.should.equal(26)

    next()
  })

  it('should manipulate keys', function (next) {
    var ks = new KeySet(AZ)
    var all = ks.key(1)
    parseInt(all.toString(16), 16).should.equal(parseInt('11111111111111111111111111', 2))
    parseInt(ks.key(['A']).toString(16), 16).should.equal(0x1)
    parseInt(ks.key(['G']).toString(16), 16).should.equal(0x1 << 6)
    var bg = ks.key(['B', 'G'])
    parseInt(bg.toString(16), 16).should.equal(0x1 << 1 | 0x1 << 6)
    parseInt(all.and(bg).toString(2), 2).should.equal(0x1 << 1 | 0x1 << 6)
    all.xor(bg).toString(16).should.equal(bg.not().toString(16))
    next()
  })

  it('should convert to base64', function (next) {
    var ks = new KeySet(AZ)
    var all = ks.key(1)
    var bg = ks.key(['B', 'G'])
    all.toBase64().should.equal('////Aw==')
    bg.toBase64().should.equal('QgAAAA==')
    
    var bg64=ks.key().fromBase64('QgAAAA==')
    console.log(bg64.bits())
    next()
  })
})
