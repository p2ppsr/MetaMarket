import { AdmittanceInstructions, TopicManager } from '@bsv/overlay'
import { Transaction, PublicKey, PushDrop, WalletClient} from '@bsv/sdk'
import docs from './MarketTopicDocs.md.js'

export default class MarketTopicManager implements TopicManager {
  /**
   * Identify if the outputs are admissible depending on the particular protocol requirements
   * @param beef - The transaction data in BEEF format
   * @param previousCoins - The previous coins to consider
   * @returns A promise that resolves with the admittance instructions
   */
  async identifyAdmissibleOutputs(beef: number[], previousCoins: number[]): Promise<AdmittanceInstructions> {
    const admissibleOutputs: number[] = [];

    try {
      const decodedTx = Transaction.fromBEEF(beef)
      const outputs = decodedTx.outputs

      // Try to decode and validate transaction outputs
      for (const [index, output] of outputs.entries()) {
        try {
          const decodedScript = await PushDrop.decode(output.lockingScript)
          const fields = decodedScript.fields

          //console.log("Topic manager fields:", fields.toString())
          // UHRP Url
          if (fields[0].length !== 52) {
            console.log('Invalid UHRP url length.')
            continue
          }

          // Name
          if (fields[1].length === 0) {
            console.log('Name field is empty.')
            continue
          }

          // Description
          // (Optional validation can be added here if needed)

          // Satoshis
          const satoshis = parseInt(fields[3].toString(), 10)
          if (isNaN(satoshis) || satoshis <= 0) {
            console.log('Invalid satoshis value.')
            continue
          }

          // Public Key
          if (!fields[4] || fields[4].length === 0) {
            console.log('Public key is missing.')
            continue
          }
          try {
            PublicKey.fromString(fields[4].toString())
          } catch {
            console.log('Invalid public key format.')
            continue
          }

          // File Size
          const fileSize = parseInt(fields[5].toString(), 10)
          if (isNaN(fileSize) || fileSize <= 0) {
            console.log('Invalid file size.')
            continue
          }

          // Expiry Time
          const expiryTime = parseInt(fields[6].toString(), 10)
          if (isNaN(expiryTime) || expiryTime <= Date.now()) {
            console.log('Invalid expiry time.')
            continue
          }

          // Cover Image UHRP Url
          if (fields[7].length !== 52) {
            console.log('Invalid cover image UHRP url/ length.')
            continue
          }

          admissibleOutputs.push(index)
        } catch (error) {
          continue
        }
      }
      if (admissibleOutputs.length === 0) {
        console.warn('No outputs admitted!')
      }
    } catch (error) {
      console.error('Error identifying admissible outputs:', error)
    }

    return {
      outputsToAdmit: admissibleOutputs,
      coinsToRetain: previousCoins
    }
  }

  /**
   * Get the documentation associated with this topic manager
   * @returns A promise that resolves to a string containing the documentation
   */
  async getDocumentation(): Promise<string> {
    return docs
  }

  /**
   * Get metadata about the topic manager
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
      name: 'MetaMarket Topic Manager',
      shortDescription: 'MetaMarket.'
    }
  }
}
