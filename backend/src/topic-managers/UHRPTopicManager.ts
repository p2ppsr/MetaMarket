import { AdmittanceInstructions, TopicManager } from '@bsv/overlay'
import { Transaction, ProtoWallet, Utils } from '@bsv/sdk'
import docs from './UHRPTopicDocs.md.js'
import pushdrop from 'pushdrop'

// const anyoneWallet = new ProtoWallet('anyone') MAYBE USE IN THE FUTURE(?)

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

          console.log(fields.toString())

          // TODO add functionality

          admissibleOutputs.push(index)
        } catch (error) {
          // Continue processing other outputs
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
