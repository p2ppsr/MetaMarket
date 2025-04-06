import { Container, Box, Typography, Button, Input, TextField, Paper, Collapse, Backdrop, CircularProgress, Grid } from "@mui/material"
import React, { useState, type FormEvent, ChangeEvent } from "react"
import { toast } from "react-toastify";
import { StlViewer } from "react-stl-viewer"
import { publishCommitment } from "../utils/publishCommitment"
import { WalletClient } from "@bsv/sdk"
import { useNavigate } from "react-router-dom";
const fetchPublicKey = async (): Promise<string> => {
  try {
    const client = new WalletClient()
    const publicKey = await client.getPublicKey({ identityKey: true });
    return publicKey.publicKey;
  } catch (error) {
    console.error("Error fetching public key:", error);
    throw new Error("MetaNet Identity is missing. Please ensure you have the MetaNet Client installed and properly configured.")
  }
}

const UploadFile = () => {
  const navigate = useNavigate()

  const [isLoading, setIsLoading] = useState(false)
  const [statusText, setStatusText] = useState("")
  const [showSuccess, setShowSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [coverImage, setCoverImage] = useState<File | null>(null)
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null)

  const [fields, setFields] = useState({
    name: { value: "", error: null as string | null },
    description: { value: "", error: null as string | null },
    satoshis: { value: "", error: null as string | null },
    expiration: { value: "7", error: null as string | null }
  })

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0] || null;

    if (!file) return

    if (!file.name.endsWith(".stl")) {
      setSelectedFile(null)
      setPreviewUrl(null)
      setErrorMessage("Please upload a valid `.stl` file.");
      return
    }

    setSelectedFile(file)
    setErrorMessage("")
    setPreviewUrl(URL.createObjectURL(file))
  }

  const handleCoverChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0] || null
    if (!file) return

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      setCoverImage(null)
      setErrorMessage("Please upload a valid image file (PNG, JPG, JPEG, or WebP).");
      return
    }

    if (file.size > 1000 * 1024) {
      setCoverImage(null)
      setErrorMessage("Cover image must not exceed 1MB.");
      return
    }

    setCoverImage(file)
    setCoverPreviewUrl(URL.createObjectURL(file))
    setErrorMessage("")
  }

  const handleChange = (field: string, value: string): void => {
    let error = null

    if (field === "satoshis" && !/^\d*$/.test(value) || parseInt(value) <= 0) {
      error = "Only positive integers are allowed."
    }
    if (field === "expiration" && (!/^\d*$/.test(value) || parseInt(value) <= 0)) {
      error = "Expiration must be a positive integer."
    }
    setFields((prevFields) => ({
      ...prevFields,
      [field]: { value, error }
    }))
  }

  const handleCreateSubmit = async (
    e: FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();

    if (!selectedFile) {
      setErrorMessage("An STL file is required.")
      return
    }

    if (!coverImage) {
      setErrorMessage("A cover image is required.")
      return
    }

    try {
      setIsLoading(true)
      setErrorMessage("")

      // Get the uploader's public key
      const publicKey = await fetchPublicKey()

      const filehosting = {
        file: selectedFile,
        name: fields.name.value,
        description: fields.description.value,
        satoshis: Number(fields.satoshis.value),
        publicKey,
        expiration: Number(fields.expiration.value),
        coverImage,
        setStatusText
      }

      console.log(filehosting)
      const result = await publishCommitment(filehosting)

      setShowSuccess(true)
      await new Promise((resolve) => setTimeout(resolve, 5000))
      navigate("/")
    } catch (e) {
      toast.error((e as Error).message);
      setErrorMessage("Error uploading file, please try again")
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }
  return (
    <Container maxWidth="lg">
      <Typography variant="h5" gutterBottom>
        Upload an STL File
      </Typography>
      <form onSubmit={handleCreateSubmit}>
        <Grid container spacing={3}>
          {/** LEFT COLLUMN */}
          <Grid item xs={12} md={6} order={{ xs: 2, md: 1 }}>
            <Paper elevation={3} sx={{ p: 3, border: "1px solid #ccc" }}>
              <Typography variant="h5" gutterBottom>
                File Info
              </Typography>

              <Box mb={2}>
                <TextField
                  fullWidth
                  label="Name"
                  value={fields.name.value}
                  onChange={(e) => handleChange("name", e.target.value)}
                  variant="standard"
                  required
                />
              </Box>

              <Box mb={2}>
                <TextField
                  fullWidth
                  label="Description"
                  value={fields.description.value}
                  onChange={(e) => handleChange("description", e.target.value)}
                  multiline
                  minRows={3}
                  variant="standard"
                />
              </Box>

              <Box mb={2}>
                <TextField
                  fullWidth
                  label="Satoshis"
                  value={fields.satoshis.value}
                  onChange={(e) => handleChange("satoshis", e.target.value)}
                  inputProps={{ inputMode: "numeric" }}
                  variant="standard"
                  required
                  error={!!fields.satoshis.error}
                  helperText={fields.satoshis.error}
                />
              </Box>

              <Box mb={2}>
                <Button
                  variant="outlined"
                  onClick={() => setShowAdvancedConfig((prev) => !prev)}
                >
                  {showAdvancedConfig ? "Hide Advanced Config" : "Show Advanced Config"}
                </Button>
                <Collapse in={showAdvancedConfig}>
                  <Paper elevation={2} sx={{ mt: 2, p: 2, border: "1px solid #ccc" }}>
                    <Typography variant="h6" gutterBottom>
                      Advanced Config
                    </Typography>
                    <TextField
                      label="Expiration Time (Days)"
                      value={fields.expiration.value}
                      onChange={(e) => handleChange("expiration", e.target.value)}
                      inputProps={{ inputMode: "numeric" }}
                      variant="standard"
                      error={!!fields.expiration.error}
                      helperText={fields.expiration.error}
                    />
                  </Paper>
                </Collapse>
              </Box>
            </Paper>
            {/* Submit Button */}
            <Box mt={3}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={
                  isLoading ||
                  !selectedFile ||
                  !coverImage ||
                  Object.entries(fields).some(
                    ([key, field]) => key !== "description" && (field.error || !field.value)
                  )
                }
              >
                {isLoading ? "Uploading..." : "Upload"}
              </Button>
              {errorMessage && (
                <Typography color="error" variant="body2" mt={2}>
                  {errorMessage}
                </Typography>
              )}
            </Box>
          </Grid>
          <Grid item xs={12} md={6} order={{ xs: 1, md: 2 }}>
            {/** STL FILE BOX */}
            <Box
              mb={3}
              sx={{
                position: "relative",
                border: "2px dashed #ccc",
                borderRadius: 2,
                padding: 2,
                textAlign: "center",
                cursor: previewUrl ? "default" : "pointer",
                '&:hover': { backgroundColor: previewUrl ? "inherit" : "#f9f9f9" }
              }}
              onClick={!previewUrl ? () => document.getElementById("stl-file-input")?.click() : undefined}
            >
              <input
                type="file"
                accept=".stl"
                onChange={handleFileChange}
                style={{ display: "none" }}
                id="stl-file-input"
              />

              {previewUrl ? (
                <>
                  <Button
                    variant="outlined"
                    size="small"
                    sx={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      zIndex: 1
                    }}
                    onClick={() => document.getElementById("stl-file-input")?.click()}
                  >
                    Change
                  </Button>
                  <Typography variant="h6" gutterBottom>STL Preview:</Typography>
                  <StlViewer
                    url={previewUrl}
                    style={{ width: '100%', height: '300px' }}
                    orbitControls
                  />
                </>
              ) : (
                <Typography variant="body1" color="textSecondary">
                  Click here to upload an STL file
                </Typography>
              )}
            </Box>

            {/** COVER IMAGE BOX */}
            <Box
              mb={3}
              sx={{
                position: "relative",
                border: "2px dashed #ccc",
                borderRadius: 2,
                padding: 2,
                textAlign: "center",
                cursor: coverPreviewUrl ? "default" : "pointer",
                '&:hover': { backgroundColor: coverPreviewUrl ? "inherit" : "#f9f9f9" }
              }}
              onClick={!coverPreviewUrl ? () => document.getElementById("cover-image-input")?.click() : undefined}
            >
              <input
                type="file"
                accept="image/png, image/jpg, image/jpeg, image/webp"
                onChange={handleCoverChange}
                style={{ display: "none" }}
                id="cover-image-input"
              />

              {coverPreviewUrl ? (
                <>
                  <Button
                    variant="outlined"
                    size="small"
                    sx={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      zIndex: 1
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      document.getElementById("cover-image-input")?.click()
                    }}
                  >
                    Change
                  </Button>
                  <Typography variant="h6" gutterBottom>Cover Preview:</Typography>
                  <img
                    src={coverPreviewUrl}
                    alt="Cover Preview"
                    style={{ maxWidth: "100%", maxHeight: "300px", borderRadius: 4 }}
                  />
                </>
              ) : (
                <Typography variant="body1" color="textSecondary">
                  Click here to upload a cover image
                </Typography>
              )}
            </Box>
          </Grid>
        </Grid>
      </form>
      <Backdrop open={isLoading && !showSuccess} sx={{ zIndex: 1301, color: '#fff' }}>
        <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
          <CircularProgress color="inherit" />
          <Typography variant="h6">{statusText || "Processing..."}</Typography>
        </Box>
      </Backdrop>
      <Backdrop open={showSuccess} sx={{ zIndex: 1302, color: '#fff' }}>
        <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
          <Typography variant="h4" fontWeight={600}>
            Upload Successful!
          </Typography>
          <Typography variant="body1">
            Redirecting to home in 5 seconds...
          </Typography>
        </Box>
      </Backdrop>
    </Container>
  )
}

export default UploadFile