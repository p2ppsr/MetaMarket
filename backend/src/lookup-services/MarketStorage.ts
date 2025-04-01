import { Collection, Db } from 'mongodb'
import { MarketRecord, UTXOReference, StoreReference, DetailsReference, AccountReference } from '../types.js'

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
      coverUrl
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
  async deleteRecord(txid: string, outputIndex: number): Promise<void> {
    await this.records.deleteMany({ txid, outputIndex })
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

  async findStore(): Promise<StoreReference[]> {    
    return await this.records.find({})
      .project<StoreReference>({
        name: 1,
        satoshis: 1,
        coverUrl: 1,
        txid: 1,
        outputIndex: 1
      })
      .toArray()
      .then(results => results.map(record => ({
        name: record.name.toString(),
        satoshis: Number(record.satoshis.toString()),
        coverUrl: record.coverUrl,
        txid: record.txid,
        outputIndex: record.outputIndex
      })))
  }

  async findDetails(txid: string, outputIndex: number): Promise<DetailsReference[]> {
    return await this.records.find({ txid, outputIndex })
      .project<DetailsReference>({
        fileUrl: 1,
        name: 1,
        description: 1,
        satoshis: 1,
        creatorPublicKey: 1,
        size: 1,
        txid: 1,
        outputIndex: 1,
        retentionPeriod: 1,
        coverUrl: 1,
        createdAt: 1
      })
      .toArray()
      .then(results => results.map(record => ({
        fileUrl: record.fileUrl.toString(),
        name: record.name.toString(),
        description: record.description.toString(),
        satoshis: Number(record.satoshis.toString()),
        creatorPublicKey: record.creatorPublicKey.toString(),
        size: Number(record.size.toString()),
        txid: record.txid.toString(),
        outputIndex: Number(record.outputIndex.toString()),
        retentionPeriod: Number(record.retentionPeriod.toString()),
        coverUrl: record.coverUrl.toString(),
        createdAt: record.createdAt
      })))
  }

  async findByUploaderPublicKey(publicKey: string): Promise<AccountReference[]> {
    return await this.records.find({ creatorPublicKey: publicKey })
      .project<AccountReference>({
        fileUrl: 1,
        name: 1,
        satoshis: 1,
        txid: 1,
        outputIndex: 1,
        coverUrl: 1,
        createdAt: 1
      })
      .toArray()
      .then(results=> results.map(record => ({
        fileUrl: record.fileUrl.toString(),
        name: record.name.toString(),
        satoshis: Number(record.satoshis.toString()),
        txid: record.txid.toString(),
        outputIndex: Number(record.outputIndex),
        coverUrl: record.coverUrl.toString(),
        createdAt: record.createdAt
      })))
  }

  async findByName(name: string): Promise<StoreReference[]> {
    return await this.records.find({ name: { $regex: name, $options: 'i' } })
      .project<StoreReference>({
        name: 1,
        satoshis: 1,
        coverUrl: 1,
        txid: 1,
        outputIndex: 1
      })
      .toArray()
      .then( results=> results.map(record => ({    
        name: record.name.toString(),
        satoshis: Number(record.satoshis.toString()),
        coverUrl: record.coverUrl.toString(),
        txid: record.txid,
        outputIndex: record.outputIndex
   })))
  }

  /**
   * Checks if a record with the specified fileUrl exists in the database
   * @param {string} fileUrl - The file Url to search for
   * @returns {Promise<boolean>} - Returns true if the record exists, otherwise false
   */
  async isFileUrlInDatabase(fileUrl: string): Promise<boolean> {
    const record = await this.records.findOne({ fileUrl });
    return record !== null;
}}
