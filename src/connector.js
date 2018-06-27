import crypto from 'crypto'
import {Buffer} from 'buffer'
import Ajv from 'ajv'

import {generateKey, handleResponse} from './utils'

const AES_ALGORITHM = 'AES-256-CBC'
const HMAC_ALGORITHM = 'SHA256'

export default class Connector {
  constructor(url, options = {}) {
    const {sessionId, sharedKey, dappName} = options

    // set bridge url, sessionId and key
    this.bridgeURL = url
    this.sessionId = sessionId
    this.sharedKey = sharedKey
    this.dappName = dappName

    // counter
    this._counter = 0
  }

  get bridgeURL() {
    return this._bridgeURL
  }

  set bridgeURL(value) {
    if (this.bridgeURL) {
      throw new Error('bridgeURL already set')
    }

    if (!value) {
      return
    }

    this._bridgeURL = value
  }

  get sharedKey() {
    if (this._sharedKey) {
      return this._sharedKey.toString('hex')
    }

    return null
  }

  set sharedKey(value) {
    if (this.sharedKey) {
      throw new Error('sharedKey already set')
    }

    if (!value) {
      return
    }

    const v = Buffer.from(value.toString('hex'), 'hex')
    this._sharedKey = v
  }

  // getter for session id
  get sessionId() {
    return this._sessionId
  }

  // setter for sessionId
  set sessionId(value) {
    if (this.sessionId) {
      throw new Error('sessionId already set')
    }

    if (!value) {
      return
    }

    this._sessionId = value
  }

  get typedDataSchema() {
    // From https://github.com/ethereum/EIPs/blob/master/EIPS/eip-712.md#specification-of-the-eth_signtypeddata-json-rpc
    return {
      type: 'object',
      properties: {
        types: {
          type: 'object',
          additionalProperties: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: {type: 'string'},
                type: {type: 'string'}
              },
              required: ['name', 'type']
            }
          }
        },
        primaryType: {type: 'string'},
        domain: {type: 'object'},
        message: {type: 'object'}
      }
    }
  }

  async encrypt(data, customIv = null) {
    const ajv = new Ajv()
    const valid = ajv.validate(this.typedDataSchema, data)

    if (!valid) {
      throw new Error(
        'Data must follow the EIP712 standard. ' + ajv.errorsText()
      )
    }

    const key = this._sharedKey
    if (!key) {
      throw new Error(
        'Shared key is required. Please use `sharedKey` before using encryption'
      )
    }

    // use custom iv or generate one
    let rawIv = customIv
    if (!rawIv) {
      rawIv = await generateKey(128 / 8)
    }
    const iv = Buffer.from(rawIv)

    // update counter
    this._counter += 1

    const actualContent = JSON.stringify({
      data: data,
      aad: this._counter
    })

    const encryptor = crypto.createCipheriv(AES_ALGORITHM, key, iv)
    encryptor.setEncoding('hex')
    encryptor.write(actualContent)
    encryptor.end()

    // get cipher text
    const encryptedData = encryptor.read()

    // ensure that both the IV and the cipher-text is protected by the HMAC
    const hmac = crypto.createHmac(HMAC_ALGORITHM, key)
    hmac.update(encryptedData)
    hmac.update(iv.toString('hex'))

    return {
      data: encryptedData,
      hmac: hmac.digest('hex'),
      aad: this._counter, // message counter for the "additional authenticated data"
      iv: iv.toString('hex')
    }
  }

  decrypt({data, hmac, nonce, iv}) {
    const key = this._sharedKey
    const ivBuffer = Buffer.from(iv, 'hex')
    const hmacBuffer = Buffer.from(hmac, 'hex')

    const chmac = crypto.createHmac(HMAC_ALGORITHM, key)
    chmac.update(data)
    chmac.update(ivBuffer.toString('hex'))
    const chmacBuffer = Buffer.from(chmac.digest('hex'), 'hex')

    // compare buffers
    if (Buffer.compare(chmacBuffer, hmacBuffer) !== 0) {
      return null
    }

    const decryptor = crypto.createDecipheriv(AES_ALGORITHM, key, ivBuffer)
    const decryptedText = decryptor.update(data, 'hex', 'utf8')
    return JSON.parse(decryptedText + decryptor.final('utf8'))
  }

  //
  // Private methods
  //

  //
  // Get encryptedData remote data
  //

  async _getEncryptedData(url) {
    const res = await fetch(`${this.bridgeURL}${url}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    })

    // check for no content
    if (res.status === 204) {
      return null
    }

    handleResponse(res)

    // get body
    const body = await res.json()

    // decrypt data
    return this.decrypt(body.data).data
  }
}
