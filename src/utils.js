import crypto from 'crypto'

export async function generateKey(n = 256 / 8) {
  const b = crypto.randomBytes(n)
  let result = b
  if (result instanceof Promise) {
    result = await b
  }
  return result
}

export function handleResponse(res) {
  if (res.status >= 400) {
    throw new Error(res.statusText)
  }
}
