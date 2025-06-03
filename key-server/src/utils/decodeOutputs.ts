import { PushDrop, Transaction, Utils } from '@bsv/sdk'
import { DecodedOutput } from 'src/types.js'

type FieldKey = keyof DecodedOutput

export async function decodeOutput(
  beef: number[],
  outputIndex: number,
  fields: FieldKey[]
): Promise<DecodedOutput> {
  const decodedTx = Transaction.fromBEEF(beef)
  const outputs = decodedTx.outputs[outputIndex]
  const decoded = PushDrop.decode(outputs.lockingScript)
  const data = decoded.fields

  const record: DecodedOutput = {
    txid: decodedTx.id('hex'),
    outputIndex,
  }

  for (const key of fields) {
    switch (key) {
      case 'fileUrl':
        record.fileUrl = Utils.toUTF8(Utils.toArray(data[0]))
        break
      case 'name':
        record.name = Utils.toUTF8(Utils.toArray(data[1]))
        break
      case 'description':
        record.description = Utils.toUTF8(Utils.toArray(data[2]))
        break
      case 'satoshis':
        record.satoshis = parseInt(data[3].toString(), 10)
        break
      case 'creatorPublicKey':
        record.creatorPublicKey = Utils.toUTF8(Utils.toArray(data[4]))
        break
      case 'size':
        record.size = parseInt(data[5].toString(), 10)
        break
      case 'retentionPeriod':
        record.retentionPeriod = parseInt(
          Utils.toUTF8(Utils.toArray(data[6])),
          10
        )
        break
      case 'coverUrl':
        record.coverUrl = Utils.toUTF8(Utils.toArray(data[7]))
        break
      case 'txid':
      case 'outputIndex':
      default:
        break
    }
  }
  return record
}

export async function decodeOutputs(
  outputs: Array<{ beef: number[]; outputIndex: number }>,
  fields: FieldKey[]
): Promise<DecodedOutput[]> {
  return Promise.all(
    outputs.map(({ beef, outputIndex }) =>
      decodeOutput(beef, outputIndex, fields)
    )
  )
}
