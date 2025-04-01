import React, { useEffect, useState } from 'react'
import { Container, Typography, Box, Button, Grid, Paper } from '@mui/material'
import { Img } from '@bsv/uhrp-react'
import { AtomicBEEF, AuthFetch, LookupResolver, Utils, WalletClient } from '@bsv/sdk'
import constants from '../constants'

interface UploadedFile {
    fileUrl: string
    name: string
    satoshis: number
    coverUrl: string
    txid: string
    outputIndex: number
    timesBought?: number
}

interface BalanceResponse {
    balance: number
}

interface WithdrawResponse {
    transaction: string
    derivationPrefix: string
    derivationSuffix: string
    amount: number
    senderIdentityKey: string
}

const Account: React.FC = () => {
    const [balance, setBalance] = useState<number>(0)
    const [files, setFiles] = useState<UploadedFile[]>([])
    const [loading, setLoading] = useState(false)

    const wallet = new WalletClient('auto', 'localhost')
    const authFetch = new AuthFetch(wallet)
    const lookupResolver = new LookupResolver({ networkPreset: window.location.hostname === 'localhost' ? 'local' : 'mainnet' }) 

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            try {
                let publicKey = (await wallet.getPublicKey({ identityKey: true }))
                const response = await authFetch.fetch(`${constants.keyServer}/balance`, {
                    method: 'POST',
                    body: JSON.stringify(publicKey),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })
          
                if (!response) {
                    throw new Error('Error fetching account balance')
                }
                const { balance }  = await response.json()

                setBalance(balance || 0)

                const filesResponse = await lookupResolver.query({ 
                    service: 'ls_market', 
                    query: {
                        type: 'findUploaderFiles',
                        value: {
                            publicKey: publicKey.publicKey.toString()
                        }
                    }
                })

                if (filesResponse.type !== 'freeform') {
                    throw new Error('Lookup answer must be an freeform list')
                }

                const results: UploadedFile[] = filesResponse.result as any || []           
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
            const publicKey = await wallet.getPublicKey({ identityKey: true })
            const response = await authFetch.fetch(`${constants.keyServer}/withdraw`, {
                method: 'POST',
                body: JSON.stringify(publicKey),
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            if (!response.ok) {
                console.error('Error parsing balance result')
                return
            }

            const paymentData = await response.json() as unknown as WithdrawResponse

            const processedTx = await wallet.internalizeAction({ 
                tx: Utils.toArray(paymentData.transaction, 'base64') as AtomicBEEF,
                outputs: [{
                    paymentRemittance: {
                        derivationPrefix: paymentData.derivationPrefix,
                        derivationSuffix: paymentData.derivationSuffix,
                        senderIdentityKey: paymentData.senderIdentityKey
                    },
                    outputIndex: 0,
                    protocol: 'wallet payment'
                }],
                description: `Withdraw from MetaMarket to ${(await wallet.getPublicKey({ identityKey: true })).publicKey}`
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
            const response = lookupResolver.query({
                service: 'ls_market',
                query: {
                    type: 'deleteFile',
                    value: { txid, outputIndex }
                }
            })
            console.log('Removed file:', txid)

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
                                src={`${file.coverUrl}`}
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