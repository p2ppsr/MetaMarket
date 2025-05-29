import React, { useEffect, useState } from 'react'
import { Container, Typography, Box, Button, Grid, Paper, CardActions, Card, CardContent, LinearProgress } from '@mui/material'
import { Img } from '@bsv/uhrp-react'
import { AtomicBEEF, AuthFetch, LookupResolver, PushDrop, Transaction, Utils, WalletClient } from '@bsv/sdk'
import constants from '../constants'
import { decodeOutputs, DecodedOutput } from '../utils/decodeOutputs'

interface UploadedFile {
    fileUrl: string
    name: string
    satoshis: number
    coverUrl: string
    txid: string
    outputIndex: number
    retentionPeriod: number
    timesBought?: number
}

interface ExpiredFile {
    name: string
    satoshis: number
    txid: string
    outputIndex: number
    retentionPeriod: number
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

const fields: (keyof DecodedOutput)[] = [
    'fileUrl',
    'name',
    'satoshis',
    'coverUrl',
    'txid',
    'outputIndex',
    'retentionPeriod',
]

const expiredFields: (keyof DecodedOutput)[] = [
    'name',
    'satoshis',
    'txid',
    'outputIndex',
    'retentionPeriod',
]

const spendFields: (keyof DecodedOutput)[] = [
    'txid',
    'outputIndex'
]

const Account: React.FC = () => {
    const [balance, setBalance] = useState<number>(0)
    const [files, setFiles] = useState<UploadedFile[]>([])
    const [expiredFiles, setExpiredFiles] = useState<ExpiredFile[]>([])
    const [loading, setLoading] = useState(false)

    const wallet = new WalletClient('auto', 'localhost')
    const authFetch = new AuthFetch(wallet)
    const pushdrop = new PushDrop(wallet)
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
                const { balance } = await response.json()

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
                if (filesResponse.type !== 'output-list') throw new Error('Lookup answer must be a output-list')

                const expiredResponse = await lookupResolver.query({
                    service: 'ls_market',
                    query: {
                        type: 'findUploaderFilesExpired',
                        value: {
                            publicKey: publicKey.publicKey.toString()
                        }
                    }
                })
                if (expiredResponse.type !== 'output-list') throw new Error('Lookup answer must be a output-list')

                const filesData = await decodeOutputs(filesResponse.outputs, fields)
                const expiredData = await decodeOutputs(expiredResponse.outputs, expiredFields)

                console.log(filesData)

                setFiles(filesData as UploadedFile[])
                setExpiredFiles(expiredData as ExpiredFile[])
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

    const handleRemoveFile = async (txid: string, outputIndex: number) => {
        setLoading(true)
        try {
            // Redeeming the PushDrop token and marking it as spent
            const response = await lookupResolver.query({
                service: 'ls_market',
                query: {
                    type: 'findDetails',
                    value: {
                        txid,
                        outputIndex: outputIndex
                    }
                }
            })
            if (response.type !== 'output-list') throw new Error('Lookup answer must be an output-list')
            if (response.outputs.length != 1) throw new Error('Must be a single existing UTXO')

            const inputBEEF = response.outputs[0].beef
            const outpoint = `${txid}.${outputIndex}`

            const { signableTransaction } = await wallet.createAction({
                inputBEEF,
                inputs: [{
                    outpoint,
                    unlockingScriptLength: 74, // PushDrop scripts tend to be around 74
                    inputDescription: 'metamarket upload token',
                }],
                description: 'spending token from metamarket UHRP'
            })
            if (!signableTransaction) throw new Error('Token must be spendable')

            const unlocker = pushdrop.unlock([0, 'signing'], '1', 'anyone', undefined, true)
            const partialTx = Transaction.fromAtomicBEEF(signableTransaction.tx)
            const unlockingScript = await unlocker.sign(partialTx, 0)

            const action = await wallet.signAction({
                reference: signableTransaction.reference,
                spends: {
                    0: {
                        unlockingScript: unlockingScript.toHex()
                    }
                }
            });

            console.log(action)

            // Removing the file from the backend database
            const deleteResponse = await lookupResolver.query({
                service: 'ls_market',
                query: {
                    type: 'deleteFile',
                    value: { txid, outputIndex }
                }
            })
            if (response.type != 'output-list') throw new Error('Lookup answer must be an output-list')
            console.log('Removed file:', txid)

            setFiles(prev => prev.filter(f => !(f.txid === txid && f.outputIndex === outputIndex)))
            setExpiredFiles(prev => prev.filter(f => !(f.txid === txid && f.outputIndex === outputIndex)))
        } catch (err) {
            console.error('Delete file error:', err)
        } finally {
            setLoading(false)
        }
    }

    const FileCard: React.FC<{
        name: string
        satoshis: number
        txid: string
        outputIndex: number
        retentionPeriod: number
        coverUrl?: string
        timesBought?: number
    }> = ({
        name,
        satoshis,
        txid,
        outputIndex,
        retentionPeriod,
        coverUrl,
        timesBought
    }) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Card sx={{ p: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
                    {coverUrl && (
                        <Img
                            src={coverUrl}
                            alt={name}
                            style={{
                                width: '100%',
                                aspectRatio: '4/3',
                                objectFit: 'cover',
                                borderRadius: 4
                            }}
                        />
                    )}
                    <CardContent sx={{ flexGrow: 1, pt: coverUrl ? 2 : 0 }}>
                        <Typography variant="h6" noWrap gutterBottom>
                            {name}
                        </Typography>
                        <Typography variant="body2">Cost: {satoshis} sats</Typography>
                        <Typography variant="body2">
                            Expires: {new Date(retentionPeriod).toLocaleString()}
                        </Typography>
                    </CardContent>
                    <CardActions>
                        <Button
                            size="small"
                            onClick={() => handleRemoveFile(txid, outputIndex)}
                            disabled={loading}
                        >
                            Remove
                        </Button>
                    </CardActions>
                </Card>
            </Grid>
        )
    return (
        <Container sx={{ mt: 4 }}>
            <Typography variant="h4" gutterBottom>
                Your Account
            </Typography>
            {loading && <LinearProgress sx={{ mb: 2 }} />}

            <Paper
                variant="outlined"
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 2,
                    mb: 4
                }}
            >
                <Box>
                    <Typography variant="subtitle2">Balance</Typography>
                    <Typography variant="h3">{balance} sats</Typography>
                </Box>
                <Button
                    variant="contained"
                    disabled={loading || balance <= 0}
                    onClick={handleWithdraw}
                >
                    Withdraw
                </Button>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, mb: 4 }}>
                <Typography variant="h6" gutterBottom>
                    Expired Files
                </Typography>
                {expiredFiles.length ? (
                    <Grid container spacing={2}>
                        {expiredFiles.map((f) => (
                            <FileCard
                                key={`${f.txid}.${f.outputIndex}`}
                                {...f}
                            />
                        ))}
                    </Grid>
                ) : (
                    <Typography color="text.secondary">
                        You have no expired files.
                    </Typography>
                )}
            </Paper>

            <Typography variant="h6" gutterBottom>
                Your Uploaded Files
            </Typography>
            <Grid container spacing={3}>
                {files.map((f) => (
                    <FileCard key={`${f.txid}.${f.outputIndex}`} {...f} />
                ))}
            </Grid>
        </Container>
    )
}

export default Account
