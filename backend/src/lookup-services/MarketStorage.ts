import { Collection, Db } from 'mongodb'
import { MarketRecord, UTXOReference } from '../types.js'

// Implements a Lookup StorageEngine for MetaMarket
export class MarketStorage {
  private readonly records: Collection<MarketRecord>

  /**
   * Constructs a new MarketStorageEngine instance
   * @param {Db} db - connected mongo database instance
   */
  constructor(private readonly db: Db) {
    this.records = db.collection<MarketRecord>('MarketRecords')
  }

  /**
   * Stores Market record
   * @param {string} txid transaction id
   * @param {number} outputIndex index of the UTXO
   * @param {string} value - Market value to save
   */
  async storeRecord(fileUrl: string, name: string, description: string, satoshis: number, creatorPublicKey: string, size: number, txid: string, outputIndex: number, retentionPeriod: number, coverUrl: string): Promise<void> {
    console.log("Storing record in MongoDB:", {
      fileUrl,
      name,
      description,
      satoshis,
      creatorPublicKey,
      size,
      txid,
      outputIndex,
      retentionPeriod,
      coverUrl,
      createdAt: Date.now()
    })
    try {
      // Insert new record
      await this.records.insertOne({
        fileUrl,
        name,
        description,
        satoshis,
        creatorPublicKey,
        size,
        txid,
        outputIndex,
        retentionPeriod,
        coverUrl,
        createdAt: new Date()
      })
    } catch (error) {
      console.error("Failed to store record:", error)
      throw error
    }
  }

  /**
   * Delete a matching Market record
   * @param {string} txid transaction id
   * @param {number} outputIndex Output index of the UTXO
   */
  async deleteRecord(txid: string, outputIndex: number): Promise<number> {
    return (await this.records.deleteMany({ txid, outputIndex })).deletedCount

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

  async findStore(): Promise<UTXOReference[]> {
    return await this.records.find({ retentionPeriod: { $gte: Math.floor(Date.now()) } })
      .project<UTXOReference>({ txid: 1, outputIndex: 1 })
      .toArray()
      .then(results => results.map(record => ({
        txid: record.txid,
        outputIndex: record.outputIndex
      })))
  }

  async findByUploaderPublicKey(publicKey: string): Promise<UTXOReference[]> {
    return await this.records.find({ creatorPublicKey: publicKey, retentionPeriod: { $gte: Math.floor(Date.now()) } })
      .project<UTXOReference>({
        txid: 1,
        outputIndex: 1
      })
      .toArray()
      .then(results => results.map(record => ({
        txid: record.txid.toString(),
        outputIndex: Number(record.outputIndex)
      })))
  }

  async findByUploaderPublicKeyExpired(publicKey: string): Promise<UTXOReference[]> {
    return await this.records.find({ creatorPublicKey: publicKey, retentionPeriod: { $lt: Math.floor(Date.now()) } })
      .project<UTXOReference>({
        txid: 1,
        outputIndex: 1
      })
      .toArray()
      .then(results => results.map(record => ({
        txid: record.txid.toString(),
        outputIndex: Number(record.outputIndex)
      })))
  }

  async findByName(name: string): Promise<UTXOReference[]> {
    return await this.records.find({ name: { $regex: name, $options: 'i' }, retentionPeriod: { $gte: Math.floor(Date.now()) } })
      .project<UTXOReference>({
        txid: 1,
        outputIndex: 1
      })
      .toArray()
      .then(results => results.map(record => ({
        txid: record.txid,
        outputIndex: record.outputIndex
      })))
  }

  /**
   * Checks if a record with the specified fileUrl exists in the database
   * @param {string} fileUrl - The file Url to search for
   * @returns {Promise<boolean>} - Returns true if the record exists, otherwise false
   */
  async isFileUrlInDatabase(fileUrl: string): Promise<UTXOReference[]> {
    return await this.records.find({ fileUrl })
      .project<UTXOReference>({
        txid: 1,
        outputIndex: 1
      })
      .toArray()
      .then(results => results.map(record => ({
        txid: record.txid,
        outputIndex: record.outputIndex
      })))
  }
}
