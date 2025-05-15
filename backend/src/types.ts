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
