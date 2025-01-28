import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import { Container, Typography, Box, Button } from '@mui/material'
import Markdown from 'react-markdown'
import { purchaseFile } from '../utils/purchaseFile'

// FOR TESTING PURPOSES ONLY
import { AuthriteClient } from 'authrite-js'


interface DetailsRecord {
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


  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const response = await axios.post('http://localhost:8080/lookup', {
          service: 'ls_uhrp',
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
      setIsLoading(true)

      console.log(purchaseFile({ test: 'uwu' }))
    } catch (error) {
      console.error('Error during purchase:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const TESTINGHandleLookup = async () => {
    try {
      setIsLoading(true)

      const authrite = new AuthriteClient('http://localhost:3000')

      // Testing stuff here:
      const body = { fileHash: 'yippee' }

      const signedResponse = await authrite.createSignedRequest('/lookup', {
        method: 'POST',
        body,
        headers: {
          'Content-Type': 'application/json'
        }
      })

      console.log('Lookup response:', signedResponse)

    } catch (error) {
      console.error('Error during lookup:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const TESTINGHandleDeleteAll = async () => {
    try {
      setIsLoading(true)

      const authrite = new AuthriteClient('http://localhost:3000')

      const body = { fileHash: 'yippee'}

      const Testing = await authrite.createSignedRequest('/delete', {
        method: 'POST',
        body,
        headers: {
          'Content-Type': 'application/json'
        }
      })
      console.log('Delete response:', Testing)
    } catch (error) {
      console.error('Error during delete all:', error)
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
        {isLoading ? "Purchasing..." : "Purchase"}
      </Button>


      {/** TESTING BUTTONS */}
      <Button
        type="submit"
        variant="contained"
        color="primary"
        disabled={isLoading}
        onClick={TESTINGHandleLookup}
      >
        {isLoading ? "TESTICLING..." : "TESTICLE"}
      </Button>

      <Button
        type="submit"
        variant="contained"
        color="primary"
        disabled={isLoading}
        onClick={TESTINGHandleDeleteAll}
      >
        {isLoading ? "DeLeTiNg..." : "DELETE!!!"}
      </Button>
    </Container>
  )
}

export default Details
