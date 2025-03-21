import React, { useEffect, useState } from 'react'
import { Container, Typography, Box, Button, Grid, Paper } from '@mui/material'
import axios from 'axios'
import { Img } from '@bsv/uhrp-react' // this is okay, it's a part of the new stuff
import { getPublicKey, submitDirectTransaction } from '@babbage/sdk-ts' // REMOVE!
import { AuthFetch, WalletClient } from '@bsv/sdk'

interface UploadedFile {
    fileHash: string
    name: string
    satoshis: number
    coverHash: string
    txid: string
    outputIndex: number
    timesBought?: number
}

const Account: React.FC = () => {
    const [balance, setBalance] = useState<number>(0)
    const [files, setFiles] = useState<UploadedFile[]>([])
    const [loading, setLoading] = useState(false)

    const wallet = new WalletClient('auto', 'localhost')
    const authFetch = new AuthFetch(wallet)

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            try {
                const publicKey = await getPublicKey({ identityKey: true }) // update!!!

                const signedResponse = await authFetch.fetch('/balance', {
                    method: 'POST',
                    publicKey,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })


                setBalance(signedResponse.balance || 0) // Property 'balance' does not exist on type 'Response'.ts(2339)

                console.log(publicKey)

                const filesResponse = await axios.post('http://localhost:8080/lookup', {
                    service: 'ls_market',
                    query: {
                        type: 'findUploaderFiles',
                        value: {
                            publicKey
                        }
                    }
                })
                
                console.log(filesResponse)
                
                const results: UploadedFile[] = filesResponse.data.result || []
                
                console.log('results:', results)
                
                setFiles(results)
            } catch (err) {
                console.error('Error fetching account data:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    const handleWithdraw = async () => {
        setLoading(true)
        try {
            const publicKey = await getPublicKey({ identityKey: true }) // update!

            const response = await authrite.createSignedRequest('/withdraw', { // update please!
                method: 'POST',
                publicKey,
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            if (response.status === 'error') {
                console.error('Error parsing balance result')
                return
            }

            const processedTx = await submitDirectTransaction({
                protocol: "3241645161d8",
                transaction: {
                    ...response.transaction,
                    outputs: [
                        {
                            vout: 0,
                            satoshis: response.amount,
                            derivationSuffix: response.derivationSuffix
                        }
                    ]
                },
                senderIdentityKey: response.senderIdentityKey,
                note: "Payment for withdrawal",
                derivationPrefix: response.derivationPrefix,
                amount: response.amount
            })
            
            console.log('Withdraw successful!', processedTx)

            
            setBalance(0)
        } catch (err) {
            console.error('Error when withdrawing:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteFile = async (txid: string, outputIndex: number) => {
        setLoading(true)
        try {
            await axios.post('http://localhost:8080/lookup', {
                service: 'ls_market',
                query: {
                    type: 'deleteFile',
                    value: { txid, outputIndex }
                }
            })

            console.log("Queried:", )
            
            // Delete
            setFiles(prev => prev.filter(f => !(f.txid === txid && f.outputIndex === outputIndex)))
        } catch (err) {
            console.error('Delete file error:', err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Container>
            <Typography variant="h5" gutterBottom>
                Your Account
            </Typography>
            <Box mb={2}>
                <Typography variant="body1">
                    Balance: {balance} satoshis
                </Typography>
                <Button
                    variant="contained"
                    color="primary"
                    disabled={loading || balance <= 0}
                    onClick={handleWithdraw}
                >
                    Withdraw Satoshis
                </Button>
            </Box>

            <Typography variant="h6">Your Uploaded Files</Typography>
            <Grid container spacing={3} justifyContent="flex-start">
                {files.map((file) => (
                    <Grid item xs={12} sm={6} md={4} key={`${file.txid}.${file.outputIndex}`}>
                        <Paper
                            elevation={3}
                            style={{ padding: '1em', minHeight: '300px' }}
                        >
                            <Img
                                src={`uhrp:${file.coverHash}`}
                                style={{ width: '100%', height: '150px', objectFit: 'contain' }}
                            />
                            <Typography variant="subtitle1">
                                {file.name}
                            </Typography>
                            <Typography variant="body2">
                                Cost: {file.satoshis} sat
                            </Typography>
                            {file.timesBought !== undefined && (
                                <Typography variant="body2">
                                    Purchases: {file.timesBought}
                                </Typography>
                            )}
                            <Box mt={1}>
                                <Button
                                    variant="contained"
                                    color="secondary"
                                    disabled={loading}
                                    onClick={() => handleDeleteFile(file.txid, file.outputIndex)}
                                >
                                    Remove File
                                </Button>
                            </Box>
                        </Paper>
                    </Grid>
                ))}
            </Grid>
        </Container>
    )
}

export default Account