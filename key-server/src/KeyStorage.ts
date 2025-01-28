import { Collection, Db, DeleteResult } from 'mongodb';
import { KeyRecord } from './types.js';
import dotenv from 'dotenv'

dotenv.config()

const COLLECTION_NAME = process.env.COLLECTION_NAME as string

export class KeyStorage {
  private readonly records: Collection<KeyRecord>;

  /**
   * Constructs a new KeyStorage instance
   * @param {Db} db - connected mongo database instance
   */
  constructor(private readonly db: Db) {
    this.records = db.collection<KeyRecord>(COLLECTION_NAME);
  }

  /**
   * Stores a record in the database
   * @param {string} fileHash The file hash
   * @param {string} encryptionKey The encryption key
   * @param {number} satoshis The satoshi count
   * @param {string} publicKey The public key of the uploader
   */
  async storeRecord(
    fileHash: string,
    encryptionKey: string,
    satoshis: number,
    publicKey: string
  ): Promise<void> {
    console.log('Storing record in MongoDB:', {
      fileHash,
      encryptionKey,
      satoshis,
      publicKey
    });

    try {
      await this.records.insertOne({
        fileHash,
        encryptionKey,
        satoshis,
        publicKey
      });
    } catch (error) {
      console.error('Failed to store record:', error);
      throw error;
    }
  }

    /**
   * Delete a matching record
   * @param {string} fileHash The file hash
   */
  async deleteRecord(fileHash: string): Promise<void> {
    await this.records.deleteOne({ fileHash })
  }

  /**
   * Finds all records (for testing purposes)
   * @returns {Promise<KeyRecord[]>} All stored records
   */
  async findAll(): Promise<KeyRecord[]> {
    try {
      return await this.records.find({}).toArray();
    } catch (error) {
      console.error('Failed to retrieve all records:', error);
      throw error;
    }
  }

  /**
   * Finds records by query using fileHash
   * @param {string} fileHash The file hash
   * @returns {Promise<KeyRecord[]>} Matching records
   */
  async findByQuery(
    fileHash: string
  ): Promise<KeyRecord[]> {
    try {
      return await this.records
        .find({ fileHash })
        .toArray();
    } catch (error) {
      console.error('Failed to find records by query:', error);
      throw error;
    }
  }

  // FOR TESTING PURPOSES TODO!!!!!!!!!! TODO TODO TODO
  async deleteAll(): Promise<DeleteResult> {
    return await this.records.deleteMany({})
  }

}
