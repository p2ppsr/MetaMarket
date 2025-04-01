import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Container, Typography, Box, Button } from '@mui/material'
import Markdown from 'react-markdown'
import { AuthFetch, SymmetricKey, WalletClient, StorageDownloader, LookupResolver } from '@bsv/sdk'
import { Img } from '@bsv/uhrp-react'
import constants from '../constants'

interface DetailsRecord {
  fileUrl: string
  name: string
  description: string
  satoshis: number
  creatorPublicKey: string
  size: number
  txid: string
  outputIndex: number
  retentionPeriod: number
  coverUrl: string
  createdAt: Date
}

const Details: React.FC = () => {
  const { txid, outputIndex } = useParams<{ txid: string; outputIndex: string }>()

  const [details, setDetails] = useState<DetailsRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [decryptedFileURL, setDecryptedFileURL] = useState<string | null>(null)

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const wallet = new WalletClient('auto', 'localhost')
        const authFetch = new AuthFetch(wallet)

        const lookupResolver = new LookupResolver({ networkPreset: window.location.hostname === 'localhost' ? 'local' : 'mainnet' })

        // const response = await lookupResolver.query({ service: 'ls_market', query: 'findStore' })

        const response = await lookupResolver.query({
          service: 'ls_market',
          query: {
            type: 'findDetails',
            value: {
              txid,
              outputIndex: parseInt(outputIndex || '0', 10)
            }
          }
        })


        if (response.type !== 'freeform') {
          throw new Error('Lookup answer must be an freeform list')
        }
         
        const output = (response.result as any)[0]
        const data: DetailsRecord = {
          fileUrl: output.fileUrl,
          name: output.name,
          description: output.description,
          satoshis: output.satoshis,
          creatorPublicKey: output.creatorPublicKey,
          size: output.size,
          txid: output.txid,
          outputIndex: output.outputIndex,
          retentionPeriod: output.retentionPeriod,
          coverUrl: output.coverUrl,
          createdAt: output.createdAt
        }

        setDetails(data)
      } catch (error) {
        console.error('Error fetching details:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (txid && outputIndex) fetchDetails()
  }, [txid, outputIndex])

  const handlePurchase = async () => {
    try {
      if (!details) return
      setIsLoading(true)

      const fileUrl = details.fileUrl
      if (!fileUrl) {
        console.error('No fileUrl available to purchase!')
        return
      }

      console.log('File url:', fileUrl)

      const wallet = new WalletClient('auto', 'localohst')
      const authFetch = new AuthFetch(wallet)

      console.log('wip')
      const keyUrl = `${constants.keyServer}/purchase/${fileUrl}`
      let payResponse
      try {
        payResponse = await authFetch.fetch(
          keyUrl,
          {
            method: 'POST',
            body: JSON.stringify({ fileUrl }),
            headers: { 'Content-Type': 'application/json' }
          }
        )
      } catch (error) {
        console.log(error)
      }

      if (!payResponse?.ok) {
        console.error('Failed to complete purchase:', await payResponse?.text())
      }

      const purchaseResult = await payResponse?.json()

      const encryptionKey = purchaseResult.encryptionKey
      if (!encryptionKey) {
        console.error('Purchase was successful, but no encryptionKey was returned.')
        return
      }

      const storageDownloader = new StorageDownloader()
      const { data: encryptedBytes, mimeType } = await storageDownloader.download(fileUrl)
      console.log('Downloaded file from UHRP, mimeType:', mimeType)

      // Decrypting the file
      const symmetricKey = new SymmetricKey(encryptionKey, 'hex')
      const decryptedBytes = symmetricKey.decrypt(encryptedBytes) as number[] // test

      const blob = new Blob(
        [Uint8Array.from(decryptedBytes)],
        { type: 'model/stl' })
      const url = URL.createObjectURL(blob)
      setDecryptedFileURL(fileUrl)
    } catch (error) {
      console.error('Error during purchase:', error)
    } finally {
      setIsLoading(false)
    }
  }
  if (isLoading) {
    return <Typography>Loading...</Typography>
  }
  if (!details) {
    return (
      <Typography variant="h6" color="error">
        Unable to load details. Please try again.
      </Typography>
    )
  }
  return (
    <Container>
      {/* The cover image using your existing pattern (uhrp-react Img) */}
      <Box mb={2}>
        <Img
          src={`${details.coverUrl}`}
          style={{
            width: '100%',
            maxHeight: '300px',
            objectFit: 'contain'
          }}
        />
      </Box>

      <Typography variant="h4" gutterBottom>
        {details.name}
      </Typography>

      <Box mt={2} mb={3}>
        <Markdown>{details.description}</Markdown>
      </Box>

      <Box mt={3}>
        <Typography variant="body2" color="primary">
          Cost: {details.satoshis} Satoshis
        </Typography>
      </Box>

      <Button
        type="submit"
        variant="contained"
        color="primary"
        disabled={isLoading}
        onClick={handlePurchase}
      >
        {isLoading ? 'Purchasing...' : 'Purchase File'}
      </Button>

      {decryptedFileURL && (
        <Box mt={4}>
          <Typography variant="body1">Decrypted file ready for download:</Typography>
          <a href={decryptedFileURL} download={`${details.name || 'download'}.stl`}>
            Download Decrypted File
          </a>
        </Box>
      )}
    </Container>
  )
}

export default Details