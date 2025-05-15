import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Container, Typography, Box, Button, Paper, Grid, Backdrop, CircularProgress } from '@mui/material'
import Markdown from 'react-markdown'
import { AuthFetch, SymmetricKey, WalletClient, StorageDownloader, LookupResolver } from '@bsv/sdk'
import { Img } from '@bsv/uhrp-react'
import constants from '../constants'
import { decodeOutputs, DecodedOutput } from '../utils/decodeOutputs'

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

const fields: (keyof DecodedOutput)[] = [
  'fileUrl',
  'name',
  'description',
  'satoshis',
  'creatorPublicKey',
  'size',
  'txid',
  'outputIndex',
  'retentionPeriod',
  'coverUrl',
  'createdAt'
]

const Details: React.FC = () => {
  const { txid, outputIndex } = useParams<{ txid: string; outputIndex: string }>()
  const [details, setDetails] = useState<DetailsRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [decryptedFileURL, setDecryptedFileURL] = useState<string | null>(null)
  const lookupResolver = new LookupResolver({ networkPreset: window.location.hostname === 'localhost' ? 'local' : 'mainnet' })

  useEffect(() => {
    const fetchDetails = async () => {
      try {
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
        if (response.type !== 'output-list') throw new Error('Lookup answer must be an output-list')

        const fileData = await decodeOutputs(response.outputs, fields)
        setDetails(fileData[0] as DetailsRecord)
      } catch (error) {
        throw new Error(`Error fetching details: ${error}`)
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
        throw new Error('No fileUrl available to purchase!')
      }

      console.log('File url:', fileUrl)

      const wallet = new WalletClient('auto', 'localohst')
      const authFetch = new AuthFetch(wallet)

      const keyUrl = `${constants.keyServer}/purchase/${fileUrl}`
      debugger
      let payResponse
      try {
        payResponse = await authFetch.fetch(
          keyUrl,
          {
            method: 'POST',
            body: JSON.stringify({ fileUrl }),
            headers: {
              'Content-Type': 'application/json'
            }
          }
        )
      } catch (error) {
        throw new Error(`Failed to complete purchase: ${error}`)
      }
      if (!payResponse) throw new Error('Failed to complete purchase')

      const purchaseResult = await payResponse.json()
      const encryptionKey = purchaseResult.encryptionKey
      if (!encryptionKey) {
        if (!purchaseResult.description) {
          throw new Error('Purchase was successful, but no encryptionKey was returned.')
        }
        else {
          throw new Error(purchaseResult.description)
        }
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
      setDecryptedFileURL(url)
    } catch (error) {
      console.error('Error during purchase:', error)
    } finally {
      setIsLoading(false)
    }
  }
  if (isLoading) {
    return (
      <Box textAlign="center" mt={8}>
        <CircularProgress />
        <Typography mt={2}>Loading...</Typography>
      </Box>
    )
  }
  if (!details) {
    return (
      <Typography variant="h6" color="error" textAlign="center" mt={8}>
        Unable to load details. Please try again.
      </Typography>
    )
  }

  // Helper to truncate the uploader key
  const uploaderShort = `${details.creatorPublicKey.slice(0, 8)}…${details.creatorPublicKey.slice(-8)}`

  return (
    <Container sx={{ mt: 4, mb: 4 }}>
      {/* Single big box */}
      <Paper variant="outlined" sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={3} columns={{ xs: 1, md: 12 }}>

          {/* Image */}
          <Grid size={{ xs: 1, md: 5 }}>
            <Box
              sx={{
                width: '100%',
                aspectRatio: '4/3',
                overflow: 'hidden',
                borderRadius: 1
              }}
            >
              <Img
                src={details.coverUrl}
                alt={details.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </Box>
          </Grid>

          {/* Name & Stats */}
          <Grid size={{ xs: 1, md: 7 }}>
            <Typography variant="h4">
              {details.name}
            </Typography>
            <Typography variant="body2" sx={{ mb: 4 }} gutterBottom>
              <strong>Uploader</strong> {details.creatorPublicKey}
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 1, sm: 6 }}>
                <Typography>
                  <strong>Cost:</strong> {details.satoshis} sat
                </Typography>
                <Typography>
                  <strong>Size:</strong> {details.size} bytes
                </Typography>
                <Typography>
                  <strong>Purchases:</strong> 0
                </Typography>
              </Grid>
              <Grid size={{ xs: 1, sm: 6 }}>
                <Typography>
                  <strong>Uploaded:</strong>{' '}
                  {new Date(details.createdAt).toLocaleString()}
                </Typography>
                <Typography>
                  <strong>Expires:</strong>{' '}
                  {new Date(details.retentionPeriod).toLocaleString()}
                </Typography>
              </Grid>
            </Grid>
          </Grid>

          {/* Description */}
          <Grid size={{ xs: 1, md: 8 }}>
            <Paper variant="outlined" sx={{ p: 2, mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Description
              </Typography>
              <Box maxHeight={200} overflow="auto">
                <Markdown>{details.description}</Markdown>
              </Box>
            </Paper>
          </Grid>

          {/* Purchase Area */}
          <Grid size={{ xs: 1, md: 4 }}>
            <Box sx={{ textAlign: 'center', mt: 3 }}>
              <Button
                variant="contained"
                size="large"
                onClick={handlePurchase}
                disabled={isLoading}
              >
                {isLoading ? 'Purchasing...' : 'Purchase File'}
              </Button>
              {decryptedFileURL && (
                <Button
                  variant="outlined"
                  sx={{ mt: 2 }}
                  onClick={() => {
                    const a = document.createElement('a')
                    a.href = decryptedFileURL
                    a.download = `${details.name}.stl`
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                  }}
                >
                  Download File
                </Button>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Purchase Backdrop */}
      <Backdrop open={isLoading} sx={{ zIndex: 1300, color: '#fff' }}>
        <Box textAlign="center">
          <CircularProgress color="inherit" />
          <Typography mt={2}>Processing purchase...</Typography>
        </Box>
      </Backdrop>
    </Container>
  )
}

export default Details
