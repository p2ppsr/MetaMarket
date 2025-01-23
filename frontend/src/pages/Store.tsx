import { Container, Box, Grid, Paper, Typography } from '@mui/material'
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { Img } from 'uhrp-react'
import ReactMarkdown from 'react-markdown'

interface StoreRecord {
    name: string
    satoshis: number
    coverHash: string
    txid: string
    outputIndex: number
}

const Store: React.FC = () => {
    const [files, setFiles] = useState<StoreRecord[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchFiles = async () => {
            try {
                const response = await axios.post('http://localhost:8080/lookup', {
                    service: 'ls_uhrp',
                    query: 'findStore'
                })

                const outputs = response.data.result || []
                const fileData: StoreRecord[] = outputs.map((output: any) => ({
                  
                    name: output.name,
                    satoshis: output.satoshis,
                    coverHash: output.coverHash,
                    txid: output.txid,
                    outputIndex: output.outputIndex
                }))

                setFiles(fileData)

            } catch (error) {
                console.error('Error fetching files:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchFiles()
    }, [])

    if (loading) {
        return <Typography>Loading...</Typography>
    }

    return (
        <Container maxWidth="lg">
            <Typography variant="h5" gutterBottom>
                Browse Files
            </Typography>
            <Box mb={2}>
                <Typography variant="body1">
                    Explore the available files. Click on any file to view more details.
                </Typography>
            </Box>
            <Grid container spacing={3} justifyContent="center">
                {files.map((file) => (
                    <Grid item xs={12} sm={6} md={4} key={`${file.txid}.${file.outputIndex}`}>
                        <Paper
                            elevation={3}
                            style={{
                                padding: '1em',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                minHeight: '300px' // Ensure equal space for each item
                            }}
                        >
                            <Img
                                src={`uhrp:${file.coverHash}`}
                                style={{
                                    width: '100%',
                                    height: '150px',
                                    objectFit: 'contain',
                                    aspectRatio: '16/9',
                                    marginBottom: '1em'
                                }}
                            />
                            <Typography variant="h6" align="center">
                                {file.name}
                            </Typography>
                            <Typography variant="body2" color="primary" gutterBottom>
                                Cost: {file.satoshis} Satoshis
                            </Typography>
                            <Box mt={1}>
                                <Link
                                    to={`/${file.txid}/${file.outputIndex}`}
                                    style={{ textDecoration: 'none', color: '#1976d2' }}
                                    onClick={() => console.log(`Navigating to: /${file.txid}-${file.outputIndex}`)}
                                >
                                    View Details
                                </Link>
                            </Box>
                        </Paper>
                    </Grid>
                ))}
            </Grid>
        </Container>
    )
}

export default Store
