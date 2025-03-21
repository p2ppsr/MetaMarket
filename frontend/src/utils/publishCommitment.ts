import { SymmetricKey, TaggedBEEF, StorageUploader, WalletClient, Utils, PushDrop, TopicBroadcaster, Transaction, AuthFetch } from '@bsv/sdk'

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
            throw new Error('Error uploading STL file')
        }

        // Storing the file on the Market host
        const retentionPeriod = expiration * 24 * 60

        const wallet = new WalletClient('auto', 'localhost')
        const storageUploader = new StorageUploader({ storageURL, wallet })

        const stl = await storageUploader.publishFile({
            file: uploadableFile,
            retentionPeriod
        })
        console.log(`STL File Url: ${stl.uhrpURL}`)

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

        console.log(`Cover Image URL ${cover.uhrpURL}`)

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

        console.log(`Script values:\nUHRPYnMHPuQ5Tgb3AF8JXqwKkmZVy5hG\n${stl.uhrpURL}\n${name}\n${description}\n${satoshis}\n${publicKey}\n${file.size}\n${expiryTime}\n${cover.uhrpURL}`) // TODO REMOOOOOOOVE!!

        const { tx } = await wallet.createAction({
            outputs: [{
                lockingScript: lockingScript.toHex(),
                satoshis: 1,
                outputDescription: 'metamarket upload token'
            }],
            description: 'publish to metamarket UHRP'
        })
        if (!tx) {
            throw new Error('Error creating action')
        }

        const broadcaster = new TopicBroadcaster(['tm_market'], {
            networkPreset: window.location.hostname === 'localhost' ? 'local' : 'mainnet'
        })
        const backendResponse = broadcaster.broadcast(Transaction.fromAtomicBEEF(tx))
        console.log('Backed server response:', backendResponse)

        // Uploading encryption key to key server
        const authFetch = new AuthFetch(wallet)
        const body = {
            fileHash: stl.uhrpURL,
            encryptionKey: symmetricKey.toHex(),
            satoshis,
            publicKey
        }

        const keyServerResponse = await authFetch.fetch('/submit', {
            method: 'POST',
            body,
            headers: {
                'Content-Type': 'application/json'
            }
        })

        console.log('Key server response:', await keyServerResponse.json())

        return ''        // TODO add something here or turn it void       

    } catch (error) {
        console.error('Error publishing commitment:', error)
        throw error
    }
}