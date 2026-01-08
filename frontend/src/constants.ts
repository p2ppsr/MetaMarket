interface Constants {
  preset: 'local' | 'mainnet'
  keyServer: string
}

// Local and Production URLs
const production = 'https://metamarket-keyserver.babbage.systems'
const local = 'http://localhost:3000'

let constants: Constants

if (window.location.host.startsWith('localhost')) {
  constants = {
    preset: 'mainnet',
    keyServer: local
  }
} else {
  // Production
  constants = {
    preset: 'mainnet',
    keyServer: production
  }
}

export default constants
