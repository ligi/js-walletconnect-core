module.exports = {
  parser: 'babel-eslint',
  extends: 'standard',
  globals: {
    fetch: false
  },
  rules: {
    'space-before-function-paren': ['error', 'never'],
    'no-underscore-dangle': 0
  }
}
