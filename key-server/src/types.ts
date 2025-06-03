export interface DecodedOutput {
  fileUrl?: string
  name?: string
  description?: string
  satoshis?: number
  creatorPublicKey?: string
  size?: number
  txid: string
  outputIndex: number
  retentionPeriod?: number
  coverUrl?: string
}

export interface KeyRecord {
  fileUrl: string
  encryptionKey: string
  satoshis: number
  publicKey: string
}

export interface BalanceRecord {
  publicKey: string
  balance: number
}