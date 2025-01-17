import { LookupService, LookupQuestion, LookupAnswer, LookupFormula } from '@bsv/overlay'
import { UHRPStorage } from './UHRPStorage.js'
import { Script, Utils } from '@bsv/sdk'
import docs from './UHRPLookupDocs.md.js'
import { Db } from 'mongodb'
import pushdrop from 'pushdrop'

/**
 * Implements a UHRP lookup service
 *
 * @public
 */
class UHRPLookupService implements LookupService {
  /**
   * Constructs a new UHRPLookupService instance
   * @param storage - The storage instance to use for managing records
   */ 
  constructor(public storage: UHRPStorage) { }

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
    if (topic !== 'tm_uhrp') return
    try {
      const decodedScript = pushdrop.decode({ script: outputScript.toHex(), fieldFormat: 'buffer'})

      const fileHash = decodedScript.fields[1]
      const name = decodedScript.fields[2]
      const description = decodedScript.fields[3]
      const satoshis = decodedScript.fields[4]
      const creatorPublicKey = decodedScript.fields[5]
      const size = decodedScript.fields[6]
      const retentionPeriod = decodedScript[7]

      // Store the token fields for future lookup
      await this.storage.storeRecord(
        fileHash,
        name,
        description,
        satoshis,
        creatorPublicKey,
        size,
        txid,
        outputIndex,
        retentionPeriod
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
    if (topic !== 'tm_uhrp') return
    await this.storage.deleteRecord(txid, outputIndex)
  }

  /**
   * Notifies the lookup service that an output has been deleted
   * @param txid - The transaction ID of the deleted output
   * @param outputIndex - The index of the deleted output
   * @param topic - The topic associated with the deleted output
   */
  async outputDeleted?(txid: string, outputIndex: number, topic: string): Promise<void> {
    if (topic !== 'tm_uhrp') return
    await this.storage.deleteRecord(txid, outputIndex)
  }

  /**
   * Answers a lookup query
   * @param question - The lookup question to be answered
   * @returns A promise that resolves to a lookup answer or formula
   */
  async lookup(question: LookupQuestion): Promise<LookupAnswer | LookupFormula> {
    if (question.query === undefined || question.query === null) {
      throw new Error('A valid query must be provided!')
    }
    if (question.service !== 'ls_uhrp') {
      throw new Error('Lookup service not supported!')
    }

    if (question.query === 'findAll') {
      return await this.storage.findAll()
    } else {
      throw new Error('Unknown query type')
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

// Factory function
export default (db: Db): UHRPLookupService => {
  return new UHRPLookupService(new UHRPStorage(db))
}
