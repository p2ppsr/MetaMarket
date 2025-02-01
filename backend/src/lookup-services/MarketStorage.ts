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
   * @param {string} txid transaction id             TODO: CHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANGE!
   * @param {number} outputIndex index of the UTXO
   * @param {string} value - Market value to save
   */
  async storeRecord(fileHash: string, name: string, description: string, satoshis: number, creatorPublicKey: string, size: number, txid: string, outputIndex: number, retentionPeriod: number, coverHash: string): Promise<void> {
    console.log("Storing record in MongoDB:", {
      fileHash,
      name,
      description,
      satoshis,
      creatorPublicKey,
      size,
      txid,
      outputIndex,
      retentionPeriod,
      coverHash
  })

  debugger

    try {
      // Insert new record
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
        coverHash,
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
        coverHash: 1,
        txid: 1,
        outputIndex: 1
      })
      .toArray()
      .then(results => results.map(record => ({
        name: record.name.toString(),
        satoshis: Number(record.satoshis.toString()),
        coverHash: record.coverHash.toString(),
        txid: record.txid,
        outputIndex: record.outputIndex
      })))
  }

  async findDetails(txid: string, outputIndex: number): Promise<DetailsReference[]> {
    return await this.records.find({ txid, outputIndex })
      .project<DetailsReference>({
        fileHash: 1,
        name: 1,
        description: 1,
        satoshis: 1,
        creatorPublicKey: 1,
        size: 1,
        txid: 1,
        outputIndex: 1,
        retentionPeriod: 1,
        coverHash: 1,
        createdAt: 1
      })
      .toArray()
      .then(results => results.map(record => ({
        fileHash: record.fileHash.toString(),
        name: record.name.toString(),
        description: record.description.toString(),
        satoshis: Number(record.satoshis.toString()),
        creatorPublicKey: record.creatorPublicKey.toString(),
        size: Number(record.size.toString()),
        txid: record.txid.toString(),
        outputIndex: Number(record.outputIndex.toString()),
        retentionPeriod: Number(record.retentionPeriod.toString()),
        coverHash: record.coverHash.toString(),
        createdAt: record.createdAt
      })))
  }

  async findByUploaderPublicKey(publicKey: string): Promise<AccountReference[]> {
    return await this.records.find({ creatorPublicKey: publicKey })
      .project<AccountReference>({
        fileHash: 1,
        name: 1,
        satoshis: 1,
        txid: 1,
        outputIndex: 1,
        coverHash: 1,
        createdAt: 1
      })
      .toArray()
      .then(results=> results.map(record => ({
        fileHash: record.fileHash.toString(),
        name: record.name.toString(),
        satoshis: Number(record.satoshis.toString()),
        txid: record.txid.toString(),
        outputIndex: Number(record.outputIndex),
        coverHash: record.coverHash.toString(),
        createdAt: record.createdAt
      })))
  }

  async findByName(name: string): Promise<StoreReference[]> {
    return await this.records.find({ name: { $regex: name, $options: 'i' } })
      .project<StoreReference>({
        name: 1,
        satoshis: 1,
        coverHash: 1,
        txid: 1,
        outputIndex: 1
      })
      .toArray()
      .then( results=> results.map(record => ({    
        name: record.name.toString(),
        satoshis: Number(record.satoshis.toString()),
        coverHash: record.coverHash.toString(),
        txid: record.txid,
        outputIndex: record.outputIndex
   })))
  }

  /**
   * Checks if a record with the specified fileHash exists in the database
   * @param {string} fileHash - The file hash to search for
   * @returns {Promise<boolean>} - Returns true if the record exists, otherwise false
   */
  async isFileHashInDatabase(fileHash: string): Promise<boolean> {
    const record = await this.records.findOne({ fileHash });
    return record !== null;
}}
