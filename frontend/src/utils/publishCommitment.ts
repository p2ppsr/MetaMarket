import { SymmetricKey, TaggedBEEF, StorageUploader, WalletClient, Utils, PushDrop, TopicBroadcaster, Transaction, AuthFetch, StorageUtils, StorageDownloader, LookupResolver } from '@bsv/sdk'
import constants from '../constants'

export async function publishCommitment({
    file,
    name,
    description,
    satoshis,
    publicKey,
    expiration,
    coverImage,
    setStatusText
}: {
    file: File,
    name: string,
    description: string,
    satoshis: number,
    publicKey: string,
    expiration: number,
    coverImage: File,
    setStatusText: (text: string) => void
}): Promise<string> {
    try {
        const storageURL = 'https://nanostore.babbage.systems'

        // Encrypting STL File
        const symmetricKey = SymmetricKey.fromRandom()

        const fileArray = Array.from(new Uint8Array(await file.arrayBuffer()))
        const encryptedFile = symmetricKey.encrypt(fileArray) as number[]

        const uploadableFile = {
            data: encryptedFile,
            type: file.type
        }

        if (!uploadableFile) {
            setStatusText('Error uploading STL file.')
            throw new Error('Could not prepare STL file.')
        }

        // Storing the file on the Market host
        const retentionPeriod = expiration * 24 * 60

        const wallet = new WalletClient('auto', 'localhost')
        const storageUploader = new StorageUploader({ storageURL, wallet })
        
        setStatusText('Uploading files to UHRP...')
        const stl = await storageUploader.publishFile({
            file: uploadableFile,
            retentionPeriod
        })
        console.log(`STL File Url: ${stl.uhrpURL}`)
        console.log(StorageUtils.isValidURL(stl.uhrpURL))

        const coverArray = Array.from(new Uint8Array(await coverImage.arrayBuffer()))
        const uploadableCover = {
            data: coverArray,
            type: coverImage.type
        }
        // Storing the cover image on Market
        const cover = await storageUploader.publishFile({
            file: uploadableCover,
            retentionPeriod
        })

        const expiryTime = Date.now() + (expiration * 60 * 60 * 24 * 1000)

        const fields = [
            Utils.toArray(stl.uhrpURL, 'utf8'),
            Utils.toArray(name, 'utf8'),
            Utils.toArray(description, 'utf8'),
            Utils.toArray('' + satoshis, 'utf8'),
            Utils.toArray(publicKey, 'utf8'),
            Utils.toArray('' + file.size, 'utf8'),
            Utils.toArray('' + expiryTime, 'utf8'),
            Utils.toArray(cover.uhrpURL, 'utf8'),
        ]
        const pushdrop = new PushDrop(wallet)
        const lockingScript = await pushdrop.lock(
            fields,
            [2, 'metamarket'],
            '1',
            'anyone',
            true
        )

        console.log(`${stl.uhrpURL}\n${name}\n${description}\n${satoshis}\n${publicKey}\n${file.size}\n${expiryTime}\n${cover.uhrpURL}`)
        const { txid, tx } = await wallet.createAction({
            outputs: [{
                lockingScript: lockingScript.toHex(),
                satoshis: 1,
                outputDescription: 'metamarket upload token'
            }],
            description: 'publish to metamarket UHRP'
        })
        if (!tx) {
            setStatusText('Error creating transcation data')
            throw new Error('Error creating action')
        }

        setStatusText('Broadcasting transcation')
        const broadcaster = new TopicBroadcaster(['tm_market'], {
            networkPreset: window.location.hostname === 'localhost' ? 'local' : 'mainnet'
        })
        const backendResponse = await broadcaster.broadcast(Transaction.fromAtomicBEEF(tx))
        console.log('Backed server response:', backendResponse)

        setStatusText('Registering with MetaMarket...')
        // Uploading encryption key to key server
        const authFetch = new AuthFetch(wallet)
        const body = {
            fileUrl: stl.uhrpURL,
            encryptionKey: symmetricKey.toHex(),
            satoshis,
            publicKey
        }

        try {
            const response = await authFetch.fetch(`${constants.keyServer}/submit`, {
                method: 'POST',
                body,
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            if (!response.ok) {
                throw new Error(response.statusText)
            }
        } catch (error) {
            setStatusText('Error uploading to MetaMarket')
            await new Promise((resolve) => setTimeout(resolve, 5000))
            const txidString = txid || ''
            
            const lookupResolver = new LookupResolver({ networkPreset: window.location.hostname === 'localhost' ? 'local' : 'mainnet' }) 
            const lookupResponse = await lookupResolver.query({
                service: 'ls_market',
                query: {
                    type: 'deleteFile',
                    value: { txid: txidString, outputIndex: 0 }

                }
            })
            if (lookupResponse.type != 'freeform') {
                throw new Error('Lookup answer must be an freeform list')
            }
            console.log(`Removed ${lookupResponse.result} file from backend server:`, txid)
            throw new Error('Key server registration failed.')
        }

        return 'Upload successful!!!'

    } catch (error) {
        setStatusText('')
        console.error('Error publishing commitment:', error)
        throw `Error publishing commitment: ${error}`
    }
}