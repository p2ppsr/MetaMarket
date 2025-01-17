export interface UHRPRecord {
  fileHash: string
  name: string
  description: string
  satoshis: number
  creatorPublicKey: string,
  size: number
  txid: string
  outputIndex: number
  retentionPeriod: number
  createdAt: Date
}

export interface UTXOReference {
  txid: string
  outputIndex: number
}