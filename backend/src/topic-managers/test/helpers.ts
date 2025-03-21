/*
import pushdrop from 'pushdrop';
import { createAction, toBEEFfromEnvelope, EnvelopeEvidenceApi } from '@babbage/sdk-ts';

export async function createMockBEEF({
  protocolAddress = '1UHRPYnMHPuQ5Tgb3AF8JXqwKkmZVy5hG',
  fileHash = 'XUUnj6fULHkwahpKqPAef4yR8maL9rrrUEhY5ETCRSVZ5HEW7yfj',
  fileURL = 'https://nanostore.babbage.systems/cdn/42ennJpL4L6qtD6fH6p8bm',
  name = 'Test File',
  description = 'This is a test!',
  satoshis = 50,
  publicKey = '037d7b5697323196b16ad33224ed41af2899ec16f4914ebea5da97e047763941f6',
  size = 1024,
  expiryTime = Date.now() + 600000,
  coverHash = 'XUTHUX5rtZmqmjgFDVLtTQ4r7U5SrL6B6xfS2hYA3qmuHeShn216',
  coverURL = 'https://nanostore.babbage.systems/cdn/QShzUFHUwnLqycHomnxZVe',
} = {}) {
  const lockingScript = await pushdrop.create({
    fields: [
      Buffer.from(protocolAddress, 'utf8'),
      Buffer.from(fileHash, 'utf8'),
      Buffer.from(fileURL, 'utf8'),
      Buffer.from(name, 'utf8'),
      Buffer.from(description, 'utf8'),
      Buffer.from(String(satoshis), 'utf8'),
      Buffer.from(publicKey, 'utf8'),
      Buffer.from(String(size), 'utf8'),
      Buffer.from(String(expiryTime), 'utf8'),
      Buffer.from(coverHash, 'utf8'),
      Buffer.from(coverURL, 'utf8'),
    ],
  });

  const newToken = await createAction({
    outputs: [
      {
        satoshis: 50,
        script: lockingScript,
      },
    ],
    description: 'Publish UHRP token',
  });

  const beef = toBEEFfromEnvelope({
    rawTx: newToken.rawTx! as string,
    inputs: newToken.inputs! as Record<string, EnvelopeEvidenceApi>,
    txid: newToken.txid,
  }).beef;

  return beef;
}
*/