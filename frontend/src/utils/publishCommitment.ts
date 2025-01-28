import { publishFile } from 'nanostore-publisher'
import pushdrop from 'pushdrop'
import { SymmetricKey, TaggedBEEF } from '@bsv/sdk'
import { createAction, EnvelopeEvidenceApi, toBEEFfromEnvelope } from '@babbage/sdk-ts'
import { HTTPSOverlayBroadcastFacilitator } from './tempSHIPBroadcaster'
import { AuthriteClient } from 'authrite-js'


export async function publishCommitment({
    file,
    name,
    description,
    satoshis,
    publicKey,
    expiration,
    coverImage
}: {
    file: File,
    name: string,
    description: string,
    satoshis: number,
    publicKey: string,
    expiration: number,
    coverImage: File
}): Promise<string> {
    try {
        const serverURL = 'https://nanostore.babbage.systems'
        
        // Encrypting STL File
        const symmetricKey = SymmetricKey.fromRandom()
        console.log(`Generated Symmetric Key: ${symmetricKey.toHex()}`)  // TODO

        const fileBuf = await file.arrayBuffer()
        const plaintext = new Uint8Array(fileBuf)
        const plaintextArray = Array.from(plaintext)

        const encryptedData = symmetricKey.encrypt(plaintextArray, 'hex') as string

        const blob = new Blob([Buffer.from(encryptedData)], {
            type: 'application/octet-stream'
        })
        const encryptedFile = new File([blob], 'encryptedSTL', {
            type: 'application/octet-stream'
        })
        

        // Storing the file on the UHRP host
        const retentionPeriod = expiration * 24 * 60

        const stl = await publishFile({
            file: encryptedFile,
            retentionPeriod
        })

        console.log(`STL Hash: ${stl.hash}, Url: ${stl.publicURL}`)

        // Storing the cover image on UHRP
        const cover = await publishFile({
            file: coverImage,
            retentionPeriod
        })

        console.log(`Cover Image Hash: ${cover.hash}, URL ${cover.publicURL}`)

        const expiryTime = Date.now() + (expiration * 60 * 60 * 24 * 1000)

        const lockingScript = await pushdrop.create({
            fields: [
                Buffer.from('1UHRPYnMHPuQ5Tgb3AF8JXqwKkmZVy5hG', 'utf8'),
                Buffer.from(stl.hash, 'utf8'),
                Buffer.from(name, 'utf8'),
                Buffer.from(description, 'utf8'),
                Buffer.from('' + satoshis, 'utf8'),
                Buffer.from(publicKey, 'utf8'),
                Buffer.from('' + file.size, 'utf8'),
                Buffer.from('' + expiryTime, 'utf8'),
                Buffer.from(cover.hash, 'utf8'),
            ]
        })

        console.log(`Script values:\n1UHRPYnMHPuQ5Tgb3AF8JXqwKkmZVy5hG\n${stl.hash}\n${name}\n${description}\n${satoshis}\n${publicKey}\n${file.size}\n${expiryTime}\n${cover.hash}`) // TODO REMOOOOOOOVE!!

        const newToken = await createAction({
            outputs: [{
                satoshis: 1,
                script: lockingScript
            }],
            description: 'publish UHRP token'
        })

        const beef = toBEEFfromEnvelope({
            rawTx: newToken.rawTx! as string,
            inputs: newToken.inputs! as Record<string, EnvelopeEvidenceApi>,
            txid: newToken.txid
        }).beef

        console.log(beef)
        const taggedBEEF: TaggedBEEF = {
            beef,
            topics: ['tm_uhrp']
        }

        // Temp Broadcasting!
        const broadcaster = new HTTPSOverlayBroadcastFacilitator()
        const backendResponse = broadcaster.send(`http://localhost:8080`, taggedBEEF)

        console.log('Backed server response:', backendResponse)

        // Uploading encryption key to key server
        const authrite = new AuthriteClient('http://localhost:3000')
        const body = {
            fileHash: stl.hash,
            encryptionKey: symmetricKey.toHex(),
            satoshis,
            publicKey
        }

        const keyServerResponse = await authrite.createSignedRequest('/submit', {
            method: 'POST',
            body,
            headers: {
              'Content-Type': 'application/json'
            }
          })
    
        
        console.log('Key server response:', keyServerResponse.data)
        
        return '' // TODO add something here or turn it void       

    } catch (error) {
        console.error('Error publishing commitment:', error)
        throw error
    }
}