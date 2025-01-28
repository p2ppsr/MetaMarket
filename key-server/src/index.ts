import express, { Express, Request, Response } from 'express'
import bodyParser from 'body-parser'
import { middleware, authenticate } from 'authrite-express'
import dotenv from 'dotenv'
import PacketPay from '@packetpay/express'
import { MongoClient } from 'mongodb'
import { KeyStorage } from './KeyStorage.js'

dotenv.config()

const PORT = process.env.PORT || 3000
const SERVER_PRIVATE_KEY = process.env.SERVER_PRIVATE_KEY as string
const SERVER_URL = process.env.SERVER_URL as string
const MONGO_URI = process.env.MONGO_URI as string
const DATABASE_NAME = process.env.DATABASE_NAME as string

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


// PacketPay middleware
app.use(
    PacketPay({
        serverPrivateKey: SERVER_PRIVATE_KEY,
        ninjaConfig: {
            dojoURL: 'https://dojo.babbage.systems'
        },
        calculateRequestPrice: (req: Request) => {
            if (req.originalUrl.startsWith('/purchase')) {
                return 1000
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

        await keyStorage.storeRecord(fileHash, encryptionKey, satoshis, publicKey)

        res.status(200).json({ message: 'File metadata saved successfully' })
    } catch (error) {
        console.error('Error submitting file data:', error)
        res.status(500).json({ message: 'Failed to save file metadata' })
    }
})

// TODO: add purchasing stuff...

// Lookup
app.post('/lookup', async (req: Request, res: Response) => {
    try { 
        const results = await keyStorage.findAll()
        res.status(200).json(results)
    } catch (error) {
        console.error('Error finding all')
        return res.status(400).json({
            status:'error',
            message: error instanceof Error ? error.message : 'An unknown error occurred'
        })
    }
})

app.post('/delete', async (req: Request, res: Response) => {
    try {
        const { fileHash } = req.body.body

        console.log('Parsed body:', {fileHash})

        const results = await keyStorage.deleteAll()
        return res.status(200).json(results)
    } catch (error) {
        console.error('Error deleting file:', error)
        return res.status(400).json({
            status:'error',
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