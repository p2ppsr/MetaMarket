import { getHashFromURL, getURLForFile } from "uhrp-url"
import pushdrop from "pushdrop"
import { TaggedBEEF } from "@bsv/sdk"
import { createAction, EnvelopeEvidenceApi, toBEEFfromEnvelope } from "@babbage/sdk-ts"
import { HTTPSOverlayBroadcastFacilitator } from "./tempSHIPBroadcaster"

export async function publishCommitment({
    file,
    name,
    description,
    satoshis,
    publicKey,
    expiration
}: {
    file: File,
    name: string,
    description: string,
    satoshis: number,
    publicKey: string,
    expiration: number
}): Promise<string> {
    try {
        // Storing the file on the UHRP host
        const fileBlob = new Blob([file], { type: file.type })
        const arrayBuffer = await fileBlob.arrayBuffer()
        const fileBuf = Buffer.from(arrayBuffer)
        const uhrpURL = getURLForFile(fileBuf)
        const hash = getHashFromURL(uhrpURL)
        
        const expiryTime = Date.now() + (expiration * 60 * 60 * 24 * 1000)
        
        const lockingScript = await pushdrop.create({
            fields: [
                Buffer.from('1UHRPYnMHPuQ5Tgb3AF8JXqwKkmZVy5hG', 'utf8'),
                Buffer.from(hash),
                Buffer.from(name, 'utf8'),
                Buffer.from(description, 'utf8'),
                Buffer.from('' + satoshis, 'utf8'),
                Buffer.from(publicKey, 'utf8'),
                Buffer.from('' + fileBlob.size, 'utf8'),
                Buffer.from('' + expiryTime, 'utf8'),
            ]
        })

        console.log(`Script values:\n1UHRPYnMHPuQ5Tgb3AF8JXqwKkmZVy5hG\n${hash}\n${name}\n${description}\n${satoshis}\n${publicKey}\n${fileBlob.size}\n${expiryTime}`) // TODO REMOOOOOOOVE!!

        const newToken = await createAction({
            outputs:[{
                satoshis: 50, // TODO,
                script: lockingScript
            }],
            description:'publish UHRP token'
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
        
        const submitResponse = broadcaster.send(`http://localhost:8080`, taggedBEEF)

        /*
        const submitResponse = await fetch(`http://localhost:8080/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Topics': JSON.stringify(['tm_uhrp']),
            },
            body: JSON.stringify({ beef: beef }),
        });

       
        if (!submitResponse.ok) {
            throw new Error(`Failed to submit beef data. Status: ${submitResponse.status}`)
        }

        const submitResult = await submitResponse.json()
        return submitResult.uhrpURL
        */
       return '' // TODO add something here or turn it void
    } catch (error) {
        console.error("Error publishing commitment:", error)
        throw error
    }   
}