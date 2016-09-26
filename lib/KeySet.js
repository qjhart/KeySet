'use strict'
module.exports =
  function (bitset, max) {
    var Size = 32
    var Bits = []
    var BitNum = {}

    if (Array.isArray(bitset)) {
      for (var i = 0; i < bitset.length; i++) {
        Bits[i] = bitset[i]
        BitNum[bitset[i]] = i
      }
      Size = Bits.length
    } else {
      max = typeof max === 'undefined' ? bitset : max
    }

    if (Number.isInteger(max)) {
      Size = (Bits.length > max) ? Bits.length : max
    }

    function size () {
      return Size
    }

    function bits () {
      return Bits
    }

    function bitNum () {
      return BitNum
    }

    function bit (name, n) {
      if (typeof BitNum[name] !== 'undefined' && (n < Size)) {
        // console.log('Delete Bits['+BitNum[name]+']')
        delete (Bits[BitNum[name]])
        delete (BitNum[name])
      }
      if (typeof n !== 'undefined') {
        if (n < Size) {
          if (typeof Bits[n] !== 'undefined') {
            delete (BitNum[Bits[n]])
          }
          Bits[n] = name
        } else {
          return null
        }
      } else {
        if (Bits.length < Size) {
          Bits.push(name)
          n = Bits.length - 1
        } else {
          return null
        }
      }
      BitNum[name] = n
      return n
    }

    class Key extends Uint32Array {
      constructor (bits) {
        var key = super(new Uint32Array(Math.ceil(Size / 32)))
        bits = typeof bits === 'undefined' ? 0 : bits
        if (bits === 0) {
          key.fill(0)
        } else if (bits === 1) {
          // Fill in every bit
          for (var i = 0; i < Bits.length; i++) {
            if (Bits[i]) {
              var j = Math.floor(i / 32)
              key[j] = key[j] | 0x1 << i % 32
            }
          }
        } else if (Array.isArray(bits)) {
          bits.forEach(function (n) {
            if (Number.isInteger(BitNum[n])) {
              var b = BitNum[n]
              var i = Math.floor(b / 32)
              var j = b % 32
              key[i] = key[i] | 0x1 << j
            }
          })
        } else if (bits.constructor.name === 'Key') {
          for (var i = 0; i < key.length; i++) {
            key[i] = bits[i]
          }
        } else if (typeof bits === 'object') {
          Object.keys(bits).forEach(function (n) {
            if (Number.isInteger(BitNum[n])) {
              var b = BitNum[n]
              var i = Math.floor(b / 32)
              var j = b % 32
              if (bits[n]) {
                key[i] = key[i] | 0x1 << j
              } else {
                key[i] = key[i] & (0xFFFFFFFF ^ (0x1 << j))
              }
            }
          })
        }
        return key
      }
      bits () {
        var key = this
        var bits = {}
        for (var i = 0; i < key.length; i++) {
          for (var k = 0; k < 32; k++) {
            if (key[i] & 0x1 << k) {
              if (Bits[i * 32 + k]) {
                bits[Bits[i * 32 + k]] = 1
              }
            }
          }
        }
        return bits
      }
      isZero () {
        var key = this
        for (var i = 0; i != key.length; i++) {
          if (key[i] !== 0) return false
        }
        return true
      }
      // This checks equality of buffers
      isEqual (bv2) {
        var key = this
        if (key.length != bv2.length) return false
        var dv2 = new UInt32Array(bv2)
        for (var i = 0; i < this.length; i++) {
          if (key[i] != dv2[i]) return false
        }
        return true
      }
// This checks the distance from one key to another
      distance (bv2) {
          var key = this
	  var distance=0
        if (key.length != bv2.length) return key.length
        var dv2 = new UInt32Array(bv2)
        for (var i = 0; i < key.length; i++) {
          if (key[i] != dv2[i]) distance++
        }
        return distance
      }
	
	
	// Generic Operations
      _op (bv, op) {
        op = typeof op === 'undefined' ? '|' : op
        var a = this
        var b = bv.constructor.name === 'Key' ? bv : new Key(bv)
        var n = new Key(0)
        for (var i = 0; i < a.length; i++) {
          switch (op) {
            case '&':
              n[i] = a[i] & b[i]
              break
            case '|':
              n[i] = a[i] | b[i]
              break
            case '^':
              n[i] = a[i] ^ b[i]
              break
            default:
              n[i] = a[i] | b[i]
          }
        }
        return n
      }
      and (b) { return this._op(b, '&'); }
      or (b) { return this._op(b, '|'); }
      xor (b) { return this._op(b, '^'); }
      not () { return this.xor(new Key(1)); }
      parseInt (str, sz) {
        var n = new Key(2)
        var l = 32 * 4 / sz
        for (var i = 0; i < this.length; i++) {
          var b = str.substring(i * l, (i + 1) * l - 1)
          n[i] = parseInt(b, sz)
        }
        return n
      }
      toString (sz) {
        var n = ''
        var l = 32 * 4 / sz
        for (var i = 0; i < this.length; i++) {
          var b = this[i].toString(sz)
          n += Array(l + 1 - String(b).length).join('0') + b
        }
        return n
      }
      // https://gist.github.com/jonleighton/958841
      toBase64 () {
        var base64 = ''
        var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

        var bytes = new Uint8Array(this.buffer)
        var byteLength = bytes.byteLength
        var byteRemainder = byteLength % 3
        var mainLength = byteLength - byteRemainder

        var a, b, c, d
        var chunk

        // Main loop deals with bytes in chunks of 3
        for (var i = 0; i < mainLength; i = i + 3) {
          // Combine the three bytes into a single integer
          chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]

          // Use bitmasks to extract 6-bit segments from the triplet
          a = (chunk & 16515072) >> 18 // 16515072 = (2^6 - 1) << 18
          b = (chunk & 258048) >> 12 // 258048   = (2^6 - 1) << 12
          c = (chunk & 4032) >> 6 // 4032     = (2^6 - 1) << 6
          d = chunk & 63 // 63       = 2^6 - 1

          // Convert the raw binary segments to the appropriate ASCII encoding
          base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d]
        }

        // Deal with the remaining bytes and padding
        if (byteRemainder == 1) {
          chunk = bytes[mainLength]

          a = (chunk & 252) >> 2 // 252 = (2^6 - 1) << 2

          // Set the 4 least significant bits to zero
          b = (chunk & 3) << 4 // 3   = 2^2 - 1

          base64 += encodings[a] + encodings[b] + '=='
        } else if (byteRemainder == 2) {
          chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1]

          a = (chunk & 64512) >> 10 // 64512 = (2^6 - 1) << 10
          b = (chunk & 1008) >> 4 // 1008  = (2^6 - 1) << 4

          // Set the 2 least significant bits to zero
          c = (chunk & 15) << 2 // 15    = 2^4 - 1

          base64 += encodings[a] + encodings[b] + encodings[c] + '='
        }

        return base64
      }
      fromBase64 (input) {
        /*
          Copyright (c) 2011, Daniel Guerrero
          All rights reserved.
          Redistribution and use in source and binary forms, with or without
          modification, are permitted provided that the following conditions are met:
          * Redistributions of source code must retain the above copyright
            notice, this list of conditions and the following disclaimer.
          * Redistributions in binary form must reproduce the above copyright
            notice, this list of conditions and the following disclaimer in the
            documentation and/or other materials provided with the distribution.
          THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
          ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
          WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
          DISCLAIMED. IN NO EVENT SHALL DANIEL GUERRERO BE LIABLE FOR ANY
          DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
          (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES
          LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
          ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
          (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
          SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
           */

        var keyStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='

        var chr1, chr2, chr3
        var enc1, enc2, enc3, enc4
        var i = 0
        var j = 0

        var bytes = parseInt((input.length / 4) * 3, 10)
        var uarray = new Uint8Array(this.buffer)

        for (i = 0; i < bytes; i += 3) {
          // get the 3 octects in 4 ascii chars
          enc1 = keyStr.indexOf(input.charAt(j++))
          enc2 = keyStr.indexOf(input.charAt(j++))
          enc3 = keyStr.indexOf(input.charAt(j++))
          enc4 = keyStr.indexOf(input.charAt(j++))

          chr1 = (enc1 << 2) | (enc2 >> 4)
          chr2 = ((enc2 & 15) << 4) | (enc3 >> 2)
          chr3 = ((enc3 & 3) << 6) | enc4

          uarray[i] = chr1
          if (enc3 != 64) uarray[i + 1] = chr2
          if (enc4 != 64) uarray[i + 2] = chr3
        }

        return this
      }
    }

    // console.log('Bits'+Bits)
    return {
      key: function (bits) { return new Key(bits) },
      bits: bits,
      size: size,
      bitNum: bitNum,
      bit: bit
    }
}
