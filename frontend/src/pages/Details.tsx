import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import { Container, Typography, Box, Button } from '@mui/material'
import Markdown from 'react-markdown'
import PacketPay from '@packetpay/js'
import { AuthriteClient } from 'authrite-js'
import { download } from 'nanoseek'
import { SymmetricKey } from '@bsv/sdk'
import { Img } from 'uhrp-react'

interface DetailsRecord {
  fileHash: string
  name: string
  description: string
  satoshis: number
  creatorPublicKey: string
  size: number
  txid: string
  outputIndex: number
  retentionPeriod: number
  coverHash: string
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
        const response = await axios.post('http://localhost:8080/lookup', {
          service: 'ls_market',
          query: {
            type: 'findDetails',
            value: {
              txid,
              outputIndex: parseInt(outputIndex || '0', 10),
            }
          }
        })

        const output = response.data.result[0]
        const data: DetailsRecord = {
          fileHash: output.fileHash,
          name: output.name,
          description: output.description,
          satoshis: output.satoshis,
          creatorPublicKey: output.creatorPublicKey,
          size: output.size,
          txid: output.txid,
          outputIndex: output.outputIndex,
          retentionPeriod: output.retentionPeriod,
          coverHash: output.coverHash,
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

      const fileHash = details.fileHash
      if (!fileHash) {
        console.error('No fileHash available to purchase!')
        return
      }
      
      console.log('File hash:', fileHash)

      const authrite = new AuthriteClient('http://localhost:3000')

      const keyUrl = `http://localhost:3000/purchase/${fileHash}`
      const payResponse = await PacketPay(
        keyUrl,
        {
          method: 'POST',
          body: JSON.stringify({ fileHash }),
          headers: { 'Content-Type': 'application/json' }
        },
        {
          description: 'Pay for file purchase'
        }
      )

      const purchaseResult = JSON.parse(Buffer.from(payResponse.body).toString('utf8'))
      console.log(purchaseResult)

      const encryptionKey = purchaseResult.encryptionKey
      if (!encryptionKey) {
        console.error('Purchase was successful, but no encryptionKey was returned.')
        return
      }

      const { data: encryptedDataBuffer, mimeType } = await download({
        UHRPUrl: fileHash
      })
      console.log('Downloaded file from UHRP, mimeType:', mimeType)
      
      // Decrypting the file
      const symmetricKey = new SymmetricKey(encryptionKey, 'hex')
      const encryptedBytes = Array.from(new Uint8Array(encryptedDataBuffer))
      const decryptedBytes = symmetricKey.decrypt(encryptedBytes) as number[]

      const blob = new Blob(
        [Uint8Array.from(decryptedBytes)],
        { type: 'model/stl' })
      const fileUrl = URL.createObjectURL(blob)
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
          src={`uhrp:${details.coverHash}`}
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