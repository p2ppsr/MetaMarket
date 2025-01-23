export interface UHRPRecord {
  fileHash: string
  fileURL: string
  name: string
  description: string
  satoshis: number
  creatorPublicKey: string
  size: number
  txid: string
  outputIndex: number
  retentionPeriod: number
  coverHash: string
  coverURL: string
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