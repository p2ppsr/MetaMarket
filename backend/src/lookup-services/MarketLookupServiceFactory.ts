import { AdmissionMode, LookupAnswer, LookupFormula, LookupQuestion, LookupService, OutputAdmittedByTopic, OutputSpent, SpendNotificationMode } from '@bsv/overlay'
import { PushDrop, Utils } from '@bsv/sdk'
import { Db } from 'mongodb'
import docs from './MarketLookupDocs.md.js'
import { MarketStorage } from './MarketStorage.js'

/**
 * Implements a Market lookup service
 *
 * @public
 */
class MarketLookupService implements LookupService {
  readonly admissionMode: AdmissionMode = 'locking-script'
  readonly spendNotificationMode: SpendNotificationMode = 'none'
  /**
   * Constructs a new MarketLookupService instance
   * @param storage - The storage instance to use for managing records
   */
  constructor(public storage: MarketStorage) { }

  /**
   * Invoked when a Topic Manager admits a new UTXO
   * @param payload - The output admitted by the topic manager
   * @returns 
   */
  async outputAdmittedByTopic(payload: OutputAdmittedByTopic): Promise<void> {
    if (payload.mode !== 'locking-script') throw new Error('Invalid mode')
    const { topic, lockingScript, txid, outputIndex } = payload
    if (topic !== 'tm_market') throw new Error(`Invalid topic "${topic}" for this service.`)
    try {
      const decodedScript = PushDrop.decode(lockingScript)
      const fields = decodedScript.fields

      const uhrpUrl = Utils.toUTF8(Utils.toArray(fields[0]))
      const name = Utils.toUTF8(Utils.toArray(fields[1]))
      const description = Utils.toUTF8(Utils.toArray(fields[2]))
      const satoshis = Number(Utils.toUTF8(Utils.toArray(fields[3])))
      const creatorPublicKey = Utils.toUTF8(Utils.toArray(fields[4]))
      const size = Number(Utils.toUTF8(Utils.toArray(fields[5])))
      const retentionPeriod = Number(Utils.toUTF8(Utils.toArray(fields[6])))
      const coverUrl = Utils.toUTF8(Utils.toArray(fields[7]))

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
   * Invoked when a previously-admitted UTXO is spent
   * @param payload - The output admitted by the topic manager
   */
  async outputSpent(payload: OutputSpent): Promise<void> {
    if (payload.mode !== 'none') throw new Error('Invalid mode')
    const { topic, txid, outputIndex } = payload
    if (topic !== 'tm_market') throw new Error(`Invalid topic "${topic}" for this service.`)
    await this.storage.deleteRecord(txid, outputIndex)
  }

  /**
   * 
   * @param txid - The transaction ID of the output to evict
   * @param outputIndex - The index of the output to evict
   */
  async outputEvicted(txid: string, outputIndex: number): Promise<void> {
    await this.storage.deleteRecord(txid, outputIndex)
  }

  /**
   * Answers a lookup query
   * @param question - The lookup question to be answered
   * @returns A promise that resolves to a lookup answer or formula
   */
  async lookup(question: LookupQuestion): Promise<LookupFormula> {
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
        return await this.storage.findStore();
      }

      if (isFindDetailsQuery(query)) {
        const { txid, outputIndex } = query.value
        console.log(txid, outputIndex)
        return [{ txid, outputIndex }]
      }

      if (isUrlCheckQuery(query)) {
        const { fileUrl } = query.value
        return await this.storage.isFileUrlInDatabase(fileUrl)
      }

      if (isUploaderFilesQuery(query)) {
        const { publicKey } = query.value
        return await this.storage.findByUploaderPublicKey(publicKey)
      }

      if (isUploaderFilesQueryExpired(query)) {
        const { publicKey } = query.value
        return await this.storage.findByUploaderPublicKeyExpired(publicKey)
      }

      if (isNameSearchQuery(query)) {
        const { name } = query.value
        return await this.storage.findByName(name)
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


function isUploaderFilesQueryExpired(query: any): query is { type: 'findUploaderFilesExpired', value: { publicKey: string } } {
  return (
    typeof query === 'object' &&
    query.type === 'findUploaderFilesExpired' &&
    query.value &&
    typeof query.value.publicKey === 'string'
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
