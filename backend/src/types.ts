export interface MarketRecord {
  fileHash: string
  name: string
  description: string
  satoshis: number
  creatorPublicKey: string
  size: number
  txid: string
  outputIndex: number
  retentionPeriod: number
  coverHash: string
  createdAt: Date
}

export interface UTXOReference {
  txid: string
  outputIndex: number
}

export interface StoreReference {
  name: string
  satoshis: number
  coverHash: string
  txid: string
  outputIndex: number
}

export interface DetailsReference {
  fileHash: string
  name: string
  description: string
  satoshis: number
  creatorPublicKey: string
  size: number
  txid: string
  outputIndex: number
  retentionPeriod: number
  coverHash: string
  createdAt: Date
}

export interface AccountReference {
  fileHash: string
  name: string
  satoshis: number
  txid: string
  outputIndex: number
  coverHash: string
  createdAt: Date
}