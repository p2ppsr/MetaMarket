import { Collection, Db } from 'mongodb'
import { UHRPRecord, UTXOReference } from '../types.js'

// Implements a Lookup StorageEngine for MetaMarket
export class UHRPStorage {
  private readonly records: Collection<UHRPRecord>

  /**
   * Constructs a new UHRPStorageEngine instance
   * @param {Db} db - connected mongo database instance
   */
  constructor(private readonly db: Db) {
    this.records = db.collection<UHRPRecord>('UHRPRecords')
    console.log('ERGGSEDBSFGBSGERGERGDSFSDFB DB CONNECTION CREATED!!!:', this.records)
  }

  /**
   * Stores UHRP record
   * @param {string} txid transaction id             TODO: CHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANGE!
   * @param {number} outputIndex index of the UTXO
   * @param {string} value - UHRP value to save
   */
  async storeRecord(fileHash: string, name: string, description: string, satoshis: number, creatorPublicKey: string, size: number, txid: string, outputIndex: number, retentionPeriod: number): Promise<void> {
    try {
      // Insert new record
      console.log("Storing record in MongoDB:", {
        fileHash,
        name,
        description,
        satoshis,
        creatorPublicKey,
        size,
        txid,
        outputIndex,
        retentionPeriod
    })

      await this.records.insertOne({
        fileHash,
        name,
        description,
        satoshis,
        creatorPublicKey,
        size,
        txid,
        outputIndex,
        retentionPeriod,
        createdAt: new Date()
      })
    } catch (error) {
      console.error("Failed to store record:", error)
      throw error
    }
  }

  /**
   * Delete a matching UHRP record
   * @param {string} txid transaction id
   * @param {number} outputIndex Output index of the UTXO
   */
  async deleteRecord(txid: string, outputIndex: number): Promise<void> {
    await this.records.deleteOne({ txid, outputIndex })
  }

  // TODO maybe change the UTXOReference type to have more info to use(?)

  /**
   * Returns all results tracked by the overlay
   * @returns {Promise<UTXOReference[]>} returns matching UTXO references
   */
  async findAll(): Promise<UTXOReference[]> {
    return await this.records.find({})
      .project<UTXOReference>({ txid: 1, outputIndex: 1 })
      .toArray()
      .then(results => results.map(record => ({
        txid: record.txid,
        outputIndex: record.outputIndex
      })))
  }
}
