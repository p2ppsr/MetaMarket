import express, { Express, Request, response, Response } from 'express'
import bodyParser, { json } from 'body-parser'
import { middleware, authenticate } from 'authrite-express'
import dotenv from 'dotenv'
import PacketPay from '@packetpay/express'
import { createAction } from '@babbage/sdk-ts'
import bsv from 'babbage-bsv'
import { getPaymentAddress } from 'sendover'
import { SymmetricKey } from '@bsv/sdk'
import { getURLForHash } from 'uhrp-url'
import { resolve, download } from 'nanoseek'
import { MongoClient } from 'mongodb'
import pushdrop from 'pushdrop'
import base58check from 'base58check'
import axios from 'axios'
import { KeyStorage } from './KeyStorage.js'
import { Ninja } from 'ninja-base'
import { randomBytes } from 'crypto'
import e from 'express'

dotenv.config()

const PORT = process.env.PORT || 3000
const SERVER_PRIVATE_KEY = process.env.SERVER_PRIVATE_KEY as string
const SERVER_URL = process.env.SERVER_URL as string
const MONGO_URI = process.env.MONGO_URI as string
const DATABASE_NAME = process.env.DATABASE_NAME as string

const ninja = new Ninja({
    privateKey: SERVER_PRIVATE_KEY,
    config: { dojoURL: 'https://dojo.babbage.systems' }
})

// Let TypeScript know there is possibly an authrite prop on incoming requests
declare module 'express-serve-static-core' {
    interface Request {
        authrite?: {
            identityKey: string
        }
        certificates?: any
    }
}

const app: Express = express()
let dbClient: MongoClient
let keyStorage: KeyStorage

// Middleware
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

// CORS Headers
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Headers', '*')
    res.header('Access-Control-Allow-Methods', '*')
    res.header('Access-Control-Expose-Headers', '*')
    res.header('Access-Control-Allow-Private-Network', 'true')
    if (req.method === 'OPTIONS') {
        res.sendStatus(200)
    } else {
        next()
    }
})


app.use(
    middleware({
        serverPrivateKey: SERVER_PRIVATE_KEY,
        baseUrl: SERVER_URL
    })
)

app.use(
    PacketPay({
        serverPrivateKey: SERVER_PRIVATE_KEY,
        ninjaConfig: {
            dojoURL: 'https://dojo.babbage.systems'
        },
        calculateRequestPrice: async (req: Request) => {
            if (req.originalUrl.startsWith('/purchase/')) {
                const { fileHash } = req.body
                if (!fileHash) return 0

                const record = await keyStorage.findByQuery(fileHash)

                if (!record || record.length != 1) {
                    return 0
                }
                return record[0].satoshis
            }
            return 0
        }
    })
)

app.post('/submit', async (req: Request, res: Response) => {
    try {
        const { fileHash, encryptionKey, satoshis, publicKey } = req.body.body;

        if (!fileHash || !encryptionKey || !satoshis || !publicKey) {
            return res.status(400).json({ message: 'Missing required fields' })
        }

        // Checking if the file is on UHRP
        const { data: fileHashBuffer } = base58check.decode(fileHash);
        if (fileHashBuffer.length !== 33) {
            return res.status(400).json({ message: `Invalid file hash length: ${fileHashBuffer.length} (expected 33 bytes from Base58Check)` });
        }
        const actualFileHash = fileHashBuffer.slice(1);
        const url = getURLForHash(actualFileHash);
        const resolvedUrl = await resolve({ UHRPUrl: url })

        if (!resolvedUrl || resolvedUrl.length === 0) {
            return res.status(404).json({ message: 'File not found on UHRP', url });
        }

        // Checking the encryption
        const uhrpFile = await download({ UHRPUrl: url })
        const encryptedDataBuffer = uhrpFile.data
        const encryptedDataArray = Array.from(new Uint8Array(encryptedDataBuffer))
        console.log(uhrpFile.data)
        console.log(encryptedDataArray)
        if (!encryptedDataArray || encryptedDataArray.length === 0) {
            return res.status(400).json({ message: 'Downloaded file is empty' })
        }

        console.log('Encryption Key:', encryptionKey)
        console.log('Key Length:', encryptionKey.length)

        // Checking the decryption
        let decryptedFile
        try {
            const symmetricKey = new SymmetricKey(encryptionKey, 'hex')
            decryptedFile = symmetricKey.decrypt(encryptedDataArray)
        } catch (error) {
            return res.status(400).json({ message: 'Failed to decrypt file' })
        }

        // Checking to see if file is on backend database
        const check = await axios.post('http://localhost:8080/lookup', {
            service: 'ls_market',
            query: {
                type: 'hashCheck',
                value: { fileHash }
            }
        })
        if (check.data.result === false) return res.status(404).json({ message: 'File not found on backend server' })

        await keyStorage.storeRecord(fileHash, encryptionKey, satoshis, publicKey)

        return res.status(200).json({ message: 'File metadata saved successfully' })
    } catch (error) {
        console.error('Error submitting file data:', error)
        res.status(500).json({ message: 'Failed to save file metadata' })
    }
})

app.post('/purchase/:fileHash', async (req: Request, res: Response) => {
    try {
        const { fileHash } = req.body
        if (!fileHash) return res.status(400).json({ error: 'No fileHash provided' })

        console.log(fileHash)

        const record = await keyStorage.findByQuery(fileHash)

        if (!record || record.length != 1) return res.status(404).json({ error: 'File not found on key storage' })

        const { satoshis, publicKey } = record[0]
        await keyStorage.incrementBalance(publicKey, satoshis)

        const encryptionKey = record[0].encryptionKey

        console.log('Encryption key:', encryptionKey)

        return res.status(200).json({
            success: true,
            message: `Uploader balance updated. +${satoshis} sats for ${publicKey}`,
            encryptionKey
        })
    } catch (error) {
        console.error('Error processing purchase:', error)
        return res.status(500).json({ error: (error as Error).message })
    }
})

// Lookup
app.post('/lookup', async (req: Request, res: Response) => {
    try {
        const results = await keyStorage.findAll()
        res.status(200).json(results)
    } catch (error) {
        console.error('Error finding all')
        return res.status(400).json({
            status: 'error',
            message: error instanceof Error ? error.message : 'An unknown error occurred'
        })
    }
})

app.post('/balance', async (req: Request, res: Response) => {
    try {
        const { publicKey } = req.body

        if (!publicKey) return res.status(400).json({ error: 'Missing publicKey in body' })

        const balance = await keyStorage.getBalance(publicKey)
        return res.json({ balance })
    } catch (error) {
        console.error('Error retrieving balance:', error)
    }
})

app.post('/withdraw', async (req: Request, res: Response) => {
    try {
        const { publicKey } = req.body

        if (!publicKey || publicKey !== req.authrite?.identityKey) return res.status(400).json({ error: 'Missing publicKey in body' })

        const balance = await keyStorage.getBalance(publicKey)
        if (balance <= 0) {
            return res.status(200).json({
              status: 'No funds to withdraw.'
            })
        }
        
        const derivationPrefix = randomBytes(10).toString('base64');
        const derivationSuffix = randomBytes(10).toString('base64');
        
        const derivedPublicKey = getPaymentAddress({
            senderPrivateKey: SERVER_PRIVATE_KEY,
            recipientPublicKey: publicKey,
            invoiceNumber: `2-3241645161d8-${derivationPrefix} ${derivationSuffix}`,
            returnType: 'publicKey'
        })

        const script = new bsv.Script(
            bsv.Script.fromAddress(bsv.Address.fromPublicKey(
                bsv.PublicKey.fromString(derivedPublicKey)
            ))
        ).toHex()
        
        const outputs = [{
            script,
            satoshis: balance
          }]

        const partialTx = await ninja.getTransactionWithOutputs({
            outputs,
            note: 'Withdrawal for user'
        })
    
        await keyStorage.setBalance(publicKey, 0) 

        return res.status(200).json({
            status: 'Withdraw partial tx created!',
            transaction: partialTx,
            derivationPrefix,
            derivationSuffix,
            amount: balance,
            senderIdentityKey: bsv.PrivateKey.fromHex(process.env.SERVER_PRIVATE_KEY).publicKey.toString()
        })
    } catch (error) {
        console.error('Error withdrawing balance:', error)
    }
})

// TODO This is a testing thing!
app.post('/delete', async (req: Request, res: Response) => {
    try {
        const { fileHash } = req.body.body

        console.log('Parsed body:', { fileHash })

        const results = await keyStorage.deleteAll()
        return res.status(200).json(results)
    } catch (error) {
        console.error('Error deleting file:', error)
        return res.status(400).json({
            status: 'error',
            message: 'Failed to delete selected file'
        })
    }
})

app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`)

    try {
        dbClient = new MongoClient(MONGO_URI)
        await dbClient.connect()
        console.log('Connected to MongoDB')

        const db = dbClient.db(DATABASE_NAME)
        keyStorage = new KeyStorage(db)
    } catch (error) {
        console.error('Failed to connect to MongoDB:', error)
        process.exit(1)
    }
})