import { LookupResolver } from '@bsv/sdk'
import { Img } from '@bsv/uhrp-react'
import SearchIcon from '@mui/icons-material/Search'
import { Box, Button, Card, CardActionArea, CardContent, Container, Grid, MenuItem, Paper, TextField, Typography } from '@mui/material'
import { AmountDisplay } from 'amountinator-react'
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { DecodedOutput, decodeOutputs } from '../utils/decodeOutputs'
import constants from '../constants'

interface StoreRecord {
  name: string
  satoshis: number
  coverUrl: string
  txid: string
  outputIndex: number
  retentionPeriod: number
}

const fields: (keyof DecodedOutput)[] = [
  'name',
  'satoshis',
  'coverUrl',
  'txid',
  'outputIndex',
  'retentionPeriod'
]

const filterOptions = [
  { value: 'name' as const, label: 'Name' }
]
type FilterKey = typeof filterOptions[number]['value']

const Store: React.FC = () => {
  const [files, setFiles] = useState<StoreRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<FilterKey>('name')
  const lookupResolver = new LookupResolver({ networkPreset: constants.preset  })

  const fetchFiles = async (query?: string) => {
    setLoading(true)
    try {
      let response = null
      if (query && filter === 'name') {
        response = await lookupResolver.query({
          service: 'ls_metamarket',
          query: {
            type: 'findByName',
            value: { name: searchTerm }
          }
        })
      } else {
        response = await lookupResolver.query({
          service: 'ls_metamarket',
          query: 'findStore'
        })
      }
      if (response.type !== 'output-list') throw new Error('Lookup answer must be an output-list')

      const fileData = await decodeOutputs(response.outputs, fields)
      setFiles(fileData as StoreRecord[])
    } catch (error) {
      console.error('Error fetching files:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFiles()
  }, [filter])

  const handleSearch = async () => {
    fetchFiles(searchTerm.trim())
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Typography component={'span'} variant="h4" gutterBottom>
        Browse Files
      </Typography>
      {/* Search Bar */}
      <Paper
        variant="outlined"
        sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 2, mb: 3 }}
      >
        <SearchIcon color="action" />
        <TextField
          select
          label="Filter by"
          size="small"
          value={filter}
          onChange={(e) => setFilter(e.target.value as FilterKey)}
          sx={{ minWidth: 120 }}
        >
          {filterOptions.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          placeholder="Search files…"
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          fullWidth
        />
        <Button variant="contained" onClick={handleSearch}>
          Search
        </Button>
      </Paper>

      {/* 5-column Listing Grid */}
      <Grid container spacing={3} columns={{ xs: 1, sm: 2, md: 5 }}>
        {files.map((file) => (
          <Grid size={{ xs: 1, sm: 1, md: 1 }} key={`${file.txid}.${file.outputIndex}`}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 1, '&:hover': { boxShadow: 6 } }}>
              <CardActionArea component={Link} to={`/${file.txid}/${file.outputIndex}`} sx={{ flexGrow: 1 }}>
                <Img
                  src={file.coverUrl}
                  alt={file.name}
                  style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: '4px' }}
                />
                <CardContent>
                  <Typography component="span"
                    variant="h6"
                    noWrap
                    gutterBottom
                    sx={{ fontWeight: 'bold' }}
                  >
                    {file.name}
                  </Typography>
                  <Typography
                    component={"div"}
                    variant="body1"
                    sx={{ display: 'flex', alignItems: 'center', mt: 1 }}
                  >
                    Price:&nbsp;
                    <Box
                      component="span"
                      sx={{ fontWeight: 'medium', display: 'inline-block' }}
                    >
                      <AmountDisplay
                        paymentAmount={file.satoshis}
                        formatOptions={{ decimalPlaces: 2 }}
                      />
                    </Box>
                  </Typography>
                  <Typography
                    component={'span'}
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.5 }}
                  >
                    Expires:{' '}
                    {new Date(file.retentionPeriod).toLocaleDateString()}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  )
}

export default Store
