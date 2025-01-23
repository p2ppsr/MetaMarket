import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import { Container, Typography, Box } from '@mui/material'

const Details: React.FC = () => {
    const { txid, outputIndex } = useParams<{ txid: string; outputIndex: string }>()
    console.log('Params:', { txid, outputIndex }) // Add this line

    const [details, setDetails] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    // add typing and yippeeeeeeeee hopefully!


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

                setDetails(response.data.result)
            } catch (error) {
                console.error('Error fetching details:', error)
            } finally {
                setLoading(false)
            }
        }

        if (txid && outputIndex) fetchDetails()
    }, [txid, outputIndex])

    if (loading) {
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
            <Typography variant="body1" gutterBottom>
                {details.description}
            </Typography>
            <Box mt={3}>
                <Typography variant="body2" color="primary">
                    Cost: {details.satoshis} Satoshis
                </Typography>
            </Box>
        </Container>
    )
}

export default Details
 