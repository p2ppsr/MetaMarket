import { AdmittanceInstructions, TopicManager } from '@bsv/overlay'
import { Transaction, ProtoWallet, Utils, PublicKey } from '@bsv/sdk'
import docs from './UHRPTopicDocs.md.js'
import pushdrop from 'pushdrop'

export default class UHRPTopicManager implements TopicManager {
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
          const decodedScript = await pushdrop.decode({script: output.lockingScript.toHex(), fieldFormat: "buffer"})
          const fields = decodedScript.fields

          //console.log("Topic manager fields:", fields.toString())

          // Protocol ID
          if (fields[0].toString() !== '1UHRPYnMHPuQ5Tgb3AF8JXqwKkmZVy5hG') {
            console.log('Invalid protocol ID.')
            continue
          }

          // File Hash
          if (fields[1].length !== 52) {
            console.log('Invalid file hash length.')
            continue
          }
          
          // File URL
          if (!fields[2] || fields[2].length === 0 || !fields[2].toString('utf8')) {
            console.log('Invalid or missing file URL.')
            continue
          }

          // Name
          if (fields[3].length === 0) {
            console.log('Name field is empty.')
            continue
          }

          // Description
          // (Optional validation can be added here if needed)

          // Satoshis
          const satoshis = parseInt(fields[5].toString(), 10)
          if (isNaN(satoshis) || satoshis <= 0) {
            console.log('Invalid satoshis value.')
            continue
          }

          // Public Key
          if (!fields[6] || fields[6].length === 0) {
            console.log('Public key is missing.')
            continue
          }
          try {
            PublicKey.fromString(fields[6].toString('utf8'))
          } catch {
            console.log('Invalid public key format.')
            continue
          }

          // File Size
          const fileSize = parseInt(fields[7].toString(), 10)
          if (isNaN(fileSize) || fileSize <= 0) {
            console.log('Invalid file size.')
            continue
          }

          // Expiry Time
          const expiryTime = parseInt(fields[8].toString(), 10)
          if (isNaN(expiryTime) || expiryTime <= Date.now()) {
            console.log('Invalid expiry time.')
            continue
          }

          // Cover Image Hash
          if (fields[9].length !== 52) {
            console.log('Invalid cover image hash length.')
            continue
          }

          // Cover Image URL
          if (!fields[10] || fields[10].length === 0 || !fields[10].toString('utf8').startsWith('https://')) {
            console.log('Invalid or missing cover image URL.')
            continue
          }

          console.log('OUTPUT ADMISSED WOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOT UWU!!!!!!    ', fields[3].toString('utf8'))

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
