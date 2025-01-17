import { OverlayBroadcastFacilitator, TaggedBEEF, STEAK } from "@bsv/sdk"

export class HTTPSOverlayBroadcastFacilitator implements OverlayBroadcastFacilitator {
    httpClient: typeof fetch

    constructor(httpClient = fetch) {
        this.httpClient = httpClient
    }

    async send(url: string, taggedBEEF: TaggedBEEF): Promise<STEAK> {
        /*
        if (!url.startsWith('https:')) {
            throw new Error('HTTPS facilitator can only use URLs that start with "https:"')
        }
        */
        const response = await fetch(`${url}/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/octet-stream',
                'X-Topics': JSON.stringify(taggedBEEF.topics)
            },
            body: new Uint8Array(taggedBEEF.beef)
        })
        if (response.ok) {
            return await response.json()
        } else {
            throw new Error('Failed to facilitate broadcast')
        }
    }
}
