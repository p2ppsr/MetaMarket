import { LookupService, LookupQuestion, LookupAnswer, LookupFormula } from '@bsv/overlay'
import { MarketStorage } from './MarketStorage.js'
import { Script, Utils } from '@bsv/sdk'
import docs from './MarketLookupDocs.md.js'
import { Db } from 'mongodb'
import pushdrop from 'pushdrop'
import { StoreReference, DetailsReference } from '../types.js'


/**
 * Implements a Market lookup service
 *
 * @public
 */
class MarketLookupService implements LookupService {
  /**
   * Constructs a new MarketLookupService instance
   * @param storage - The storage instance to use for managing records
   */
  constructor(public storage: MarketStorage) { }

  /**
   * Notifies the lookup service of a new output added.
   *
   * @param {string} txid - The transaction ID containing the output.
   * @param {number} outputIndex - The index of the output in the transaction.
   * @param {Script} outputScript - The script of the output to be processed.
   * @param {string} topic - The topic associated with the output.
   *
   * @returns {Promise<void>} A promise that resolves when the processing is complete.
   * @throws Will throw an error if there is an issue with storing the record in the storage engine.
   */
  async outputAdded?(txid: string, outputIndex: number, outputScript: Script, topic: string): Promise<void> {
    if (topic !== 'tm_market') return
    console.log(pushdrop.decode({ script: outputScript.toHex(), fieldFormat: 'buffer' }).fields)
    try {
      const decodedScript = pushdrop.decode({ script: outputScript.toHex(), fieldFormat: 'buffer' })
      const fields = decodedScript.fields

      const uhrpUrl = fields[0]?.toString('utf8')
      const name = fields[1]?.toString('utf8')
      const description = fields[2]?.toString('utf8')
      const satoshis = Number(fields[3]?.toString('utf8'))
      const creatorPublicKey = fields[4]?.toString('utf8')
      const size = Number(fields[5]?.toString('utf8'))
      const retentionPeriod = Number(fields[6]?.toString('utf8'))
      const coverUrl = fields[7]?.toString('utf8')

      // Store the token fields for future lookup
      await this.storage.storeRecord(
        uhrpUrl,
        name,
        description,
        satoshis,
        creatorPublicKey,
        size,
        txid,
        outputIndex,
        retentionPeriod,
        coverUrl
      )
    } catch (error) {
      console.error('Failed to store record', error)
      return
    }
  }

  /**
   * Notifies the lookup service that an output was spent
   * @param txid - The transaction ID of the spent output
   * @param outputIndex - The index of the spent output
   * @param topic - The topic associated with the spent output
   */
  async outputSpent?(txid: string, outputIndex: number, topic: string): Promise<void> {
    if (topic !== 'tm_market') return
    await this.storage.deleteRecord(txid, outputIndex)
  }

  /**
   * Notifies the lookup service that an output has been deleted
   * @param txid - The transaction ID of the deleted output
   * @param outputIndex - The index of the deleted output
   * @param topic - The topic associated with the deleted output
   */
  async outputDeleted?(txid: string, outputIndex: number, topic: string): Promise<void> {
    if (topic !== 'tm_market') return
    await this.storage.deleteRecord(txid, outputIndex)
  }

  /**
   * Answers a lookup query
   * @param question - The lookup question to be answered
   * @returns A promise that resolves to a lookup answer or formula
   */
  async lookup(question: LookupQuestion): Promise<LookupAnswer | LookupFormula> {
    try {
      const query = question.query
            
      // Validate query presence
      if (!query) {
        throw new Error('A valid query must be provided!');
      }

      // Validate service
      if (question.service !== 'ls_market') {
        throw new Error('Lookup service not supported!');
      }

      // Handle specific queries
      if (query === 'findAll') {
        return await this.storage.findAll();
      }

      if (query === 'findStore') {
        const result: StoreReference[] = await this.storage.findStore();
        return {
          type: 'freeform',
          result: result,
        };
      }

      if (isFindDetailsQuery(query)) {
        const { txid, outputIndex } = query.value;
        if (!txid || outputIndex === undefined) {
          throw new Error('findDetails query must include txid and outputIndex.');
        }

        const result: DetailsReference[] = await this.storage.findDetails(txid, outputIndex);
        return {
          type: 'freeform',
          result,
        };
      }

      if (isUrlCheckQuery(query)) {
        const { fileUrl } = query.value
        const result: boolean = await this.storage.isFileUrlInDatabase(fileUrl)
        return {
          type: 'freeform',
          result
        }
      }

      if (isUploaderFilesQuery(query)) {
        const { publicKey } = query.value
        const result = await this.storage.findByUploaderPublicKey(publicKey)
        return {
          type: 'freeform',
          result
        }
      }

      if (isDeleteFile(query)) {
        const { txid, outputIndex } = query.value
        const result = await this.storage.deleteRecord(txid, outputIndex)
        return {
          type: 'freeform',
          result
        }
      }

      if (isNameSearchQuery(query)) {
        const { name } = query.value
        const results = await this.storage.findByName(name)
        return {
          type: 'freeform',
          result: results
        }
      } 
           
      throw new Error('Unknown query type');
    } catch (error) {
      console.error('Failed to process lookup query:', error);
      throw error;
    }
  }

  /**
   * Returns documentation specific to this overlay lookup service
   * @returns A promise that resolves to the documentation string
   */
  async getDocumentation(): Promise<string> {
    return docs
  }

  /**
   * Returns metadata associated with this lookup service
   * @returns A promise that resolves to an object containing metadata
   * @throws An error indicating the method is not implemented
   */
  async getMetaData(): Promise<{
    name: string
    shortDescription: string
    iconURL?: string
    version?: string
    informationURL?: string
  }> {
    return {
      name: 'MetaMarket Lookup Service',
      shortDescription: 'MetaMarket.'
    }
  }
}

function isFindDetailsQuery(query: any): query is { type: 'findDetails'; value: { txid: string, outputIndex: number } } {
  return (
    typeof query === 'object' &&
    query.type === 'findDetails' &&
    query.value &&
    typeof query.value.txid === 'string' &&
    typeof query.value.outputIndex === 'number'
  )
}

function isUrlCheckQuery(query: any): query is { type: 'urlCheck'; value: { fileUrl: string } } {
  return (
    typeof query === 'object' &&
    query.type === 'urlCheck' &&
    query.value &&
    typeof query.value.fileUrl === 'string'
  );
}

function isUploaderFilesQuery(query: any): query is { type: 'findUploaderFiles', value: { publicKey: string } } {
  return (
    typeof query === 'object' &&
    query.type === 'findUploaderFiles' &&
    query.value &&
    typeof query.value.publicKey === 'string'
  )
}

function isDeleteFile(query: any): query is { type: 'deleteFile', value: { txid: string, outputIndex: number } } {
  return (
    typeof query === 'object' &&
    query.type === 'deleteFile' &&
    query.value &&
    typeof query.value.txid === 'string' &&
    typeof query.value.outputIndex === 'number'
  )
}

function isNameSearchQuery(query: any): query is { type: 'findByName', value: { name: string } } {
  return (
    typeof query === 'object' &&
    query.type === 'findByName' &&
    query.value &&
    typeof query.value.name === 'string'
  )
}

// Factory function
export default (db: Db): MarketLookupService => {
  return new MarketLookupService(new MarketStorage(db))
}
