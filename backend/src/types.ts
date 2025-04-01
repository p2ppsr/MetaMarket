export interface MarketRecord {
  fileUrl: string
  name: string
  description: string
  satoshis: number
  creatorPublicKey: string
  size: number
  txid: string
  outputIndex: number
  retentionPeriod: number
  coverUrl: string
  createdAt: Date
}

export interface UTXOReference {
  txid: string
  outputIndex: number
}

export interface StoreReference {
  name: string
  satoshis: number
  coverUrl: string
  txid: string
  outputIndex: number
}

export interface DetailsReference {
  fileUrl: string
  name: string
  description: string
  satoshis: number
  creatorPublicKey: string
  size: number
  txid: string
  outputIndex: number
  retentionPeriod: number
  coverUrl: string
  createdAt: Date
}

export interface AccountReference {
  fileUrl: string
  name: string
  satoshis: number
  txid: string
  outputIndex: number
  coverUrl: string
  createdAt: Date
}