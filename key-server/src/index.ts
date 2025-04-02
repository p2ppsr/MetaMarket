import express, { Express, Request, Response, NextFunction } from 'express'
import bodyParser, { json } from 'body-parser'
import prettyjson from 'prettyjson'
import dotenv from 'dotenv'
import { SymmetricKey, Utils, StorageUtils, StorageDownloader, Script, P2PKH, PublicKey, PrivateKey, LookupResolver, LookupResolverConfig } from '@bsv/sdk'
import { createAuthMiddleware } from '@bsv/auth-express-middleware'
import { createPaymentMiddleware } from '@bsv/payment-express-middleware'
import { getWallet } from './utils/walletSingleton.js'
import { MongoClient } from 'mongodb'
import { KeyStorage } from './KeyStorage.js'
import crypto, { randomBytes } from 'crypto'

(global.self as any) = { crypto }

dotenv.config()

const PORT = process.env.PORT || 3000
const SERVER_PRIVATE_KEY = process.env.SERVER_PRIVATE_KEY as string
const MONGO_URI = process.env.MONGO_URI as string
const DATABASE_NAME = process.env.DATABASE_NAME as string
const BSV_NETWORK = process.env.BSV_NETWORK as 'mainnet' | 'testnet' | 'local'

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
app.use((req, res, next: NextFunction) => {
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

// Logging
app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[${req.method}] <- ${req.url}`);
    const logObject = { ...req.body }
    console.log(prettyjson.render(logObject, { keysColor: 'blue' }))
    const originalJson = res.json.bind(res)
    res.json = (json: any) => {
        console.log(`[${req.method}] -> ${req.url}`)
        console.log(prettyjson.render(json, { keysColor: 'green' }))
        return originalJson(json)
    }
    next()
})


app.use(express.static('public'))

const wallet = await getWallet()

const authMiddleware = createAuthMiddleware({
    wallet,
    allowUnauthenticated: false
})

const paymentMiddleware = createPaymentMiddleware({

    wallet,
    calculateRequestPrice: async (req) => {
        if (!req.url.includes('/purchase')) {
            return 0
        }
        const { fileUrl } = (req.body as any) || {}
        try {
            if (!fileUrl) return 0
            const record = await keyStorage.findByQuery(fileUrl)
            if (!record || record.length != 1) {
                return 0
            }
            console.log(record[0].satoshis)
            return record[0].satoshis
        } catch (e) {
            return 0
        }
    }
})

app.use(authMiddleware)
app.use(paymentMiddleware)

app.post('/submit', async (req: Request, res: Response) => {
    try {
        const { fileUrl, encryptionKey, satoshis, publicKey } = req.body;

        if (!fileUrl || !encryptionKey || !satoshis || !publicKey) {
            return res.status(400).json({ message: 'Missing required fields' })
        }

        console.log(`File URL: ${fileUrl}`)
        // Checking if the file is on UHRP
        if (!StorageUtils.isValidURL(fileUrl)) {
            return res.status(400).json({ message: `Invalid file Url: ${fileUrl}` });
        }

        const storageDownloader = new StorageDownloader()

        let resolvedUrl
        for (let attempt = 1; attempt <= 6; attempt++) {
            try {
                resolvedUrl = await storageDownloader.resolve(fileUrl)
                if (resolvedUrl) {
                    break
                }
            } catch (error) {
                console.log(`Download attempt ${attempt} failed:`, error)
                if (attempt < 12) {
                    await new Promise((resolve) => setTimeout(resolve, 5000))
                } else {
                    throw new Error(`Download failed after ${attempt} attempts`)
                }
            }
        }

        if (!resolvedUrl || resolvedUrl.length === 0) {
            return res.status(404).json({ message: 'File not found on UHRP', fileUrl });
        }

        // Checking the encryption
        const uhrpFile = await storageDownloader.download(fileUrl)
        const encryptedDataArray = uhrpFile.data
        if (!encryptedDataArray || encryptedDataArray.length === 0) {
            return res.status(400).json({ message: 'Downloaded file is empty' })
        }

        console.log('Encryption Key:', encryptionKey)
        console.log('Key Length:', encryptionKey.length)

        // Checking the decryption
        console.log('Encryption Key:', encryptionKey)
        try {
            const symmetricKey = new SymmetricKey(encryptionKey, 'hex')
            const decryptedFile = symmetricKey.decrypt(encryptedDataArray)
            console.log('File decrypted successfully, length:', decryptedFile.length)
        } catch (error) {
            console.error('Decryption error:', error)
            return res.status(400).json({ message: 'Failed to decrypt file' })
        }

        const lookupResolver = new LookupResolver({ networkPreset: BSV_NETWORK}) 
        const check = await lookupResolver.query({
            service: 'ls_market',
            query: {
                type: 'urlCheck',
                value: { fileUrl }
            }
        })
        if (check.type !== 'freeform') {
            throw new Error('Lookup answer must be an freeform list')
        }

        if (!check.result as boolean) {
            return res.status(404).json({ message: 'File not found on backend server' })
        }

        await keyStorage.storeRecord(fileUrl, encryptionKey, satoshis, publicKey)

        return res.status(200).json({ message: 'File metadata saved successfully' })
    } catch (error) {
        console.error('Error submitting file data:', error)
        res.status(500).json({ message: 'Failed to save file metadata' })
    }
})

app.post('/purchase/:fileUrl', async (req: Request, res: Response) => {
    try {
        const { fileUrl } = req.body
        if (!fileUrl) return res.status(400).json({ error: 'No fileUrl provided' })
        const record = await keyStorage.findByQuery(fileUrl)

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
        console.log('USER BALANCE:', balance)
        return res.status(200).json({
            success: true,
            balance 
        })
    } catch (error) {
        console.error('Error retrieving balance:', error)
    }
})

app.post('/withdraw', async (req: Request, res: Response) => {
    try {
        const { publicKey } = req.body
        if (!publicKey || publicKey !== (req as any).auth?.identityKey) return res.status(400).json({ error: 'Missing publicKey in body' })

        const senderIdentityKey = PrivateKey.fromHex(SERVER_PRIVATE_KEY).toPublicKey().toString()

        const wallet = await getWallet()

        const balance = await keyStorage.getBalance(publicKey)
        if (balance <= 0) {
            return res.status(200).json({
                status: 'No funds to withdraw.'
            })
        }

        const derivationPrefix = randomBytes(10).toString('base64');
        const derivationSuffix = randomBytes(10).toString('base64');

        const { publicKey: derivedPublicKey } = await wallet.getPublicKey({
            protocolID: [2, '3241645161d8'],
            keyID: `${derivationPrefix} ${derivationSuffix}`,
            counterparty: publicKey
        })

        const lockingScript = new P2PKH().lock(PublicKey.fromString(derivedPublicKey).toAddress()).toHex()

        const { tx } = await wallet.createAction({
            description: `MetaMarket wihdrawal from user: ${wallet.getPublicKey.toString()}`,
            outputs: [{
                satoshis: balance,
                lockingScript,
                customInstructions: JSON.stringify({ derivationPrefix, derivationSuffix, payee: senderIdentityKey }),
                outputDescription: 'MetaMarket account withdraw'
            }],
            options: {
                randomizeOutputs: false
            }
        })

        if (!tx) {
            throw new Error('Error creating action')
        }

        await keyStorage.setBalance(publicKey, 0)

        return res.status(200).json({
            status: 'Withdraw partial tx created!',
            transaction: Utils.toArray(tx, 'base64'),
            derivationPrefix,
            derivationSuffix,
            amount: balance,
            senderIdentityKey
        })
    } catch (error) {
        console.error('Error withdrawing balance:', error)
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

