import React from 'react'
import { AuthriteClient } from 'authrite-js'
import PacketPay from '@packetpay/express'

export async function purchaseFile({
    test
}: {
    test: string
}): Promise<string> {
    try {

        const authrite = new AuthriteClient('http://localhost:3000')
                
        // Testing stuff here:
        const body = {
            file: "wtertrewtwertertr",
            encryptionKey: "some-encryption-key",
            satoshis: 1000,
            fileHash: "example-hash"
        }

        const signedResponse = await authrite.createSignedRequest('/submit', {
            method: 'POST',
            body,
            headers: {
                'Content-Type': 'application/json'
            }
        })

        console.log(signedResponse)
        
        
        return test
    } catch (error) {
        console.log('Error purchasing file:', error)
        throw error
    }
}