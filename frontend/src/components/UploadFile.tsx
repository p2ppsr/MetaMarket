import { Container, Box, Typography, Button, Input, TextField, Paper, Collapse } from "@mui/material"
import React, { useState, type FormEvent, ChangeEvent } from "react"
import { toast } from "react-toastify";
import { publishCommitment } from "../utils/publishCommitment"
import { getPublicKey } from "@babbage/sdk-ts";
import { useNavigate } from "react-router-dom";
const fetchPublicKey = async (): Promise<string> => {
  try {
    const publicKey = await getPublicKey({ identityKey: true });
    return publicKey;
  } catch (error) {
    console.error("Error fetching public key:", error);
    throw new Error("MetaNet Identity is missing. Please ensure you have the MetaNet Client installed and properly configured.")
  }
};

const UploadFile = () => {
  const navigate = useNavigate()

  const [isLoading, setIsLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileErrorMessage, setFileErrorMessage] = useState<string | null>(null)
  const [coverImage, setCoverImage] = useState<File | null>(null)
  const [coverErrorMessage, setCoverErrorMessage] = useState<string | null>(null)
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false)

  const [fields, setFields] = useState({
    name: { value: "", error: null as string | null },
    description: { value: "", error: null as string | null },
    satoshis: { value: "", error: null as string | null },
    expiration: { value: "7", error: null as string | null }
  })

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0] || null;

    if (file) {
      if (file.name.endsWith(".stl")) {
        setSelectedFile(file)
        setFileErrorMessage(null)
      } else {
        setFileErrorMessage("Please upload a valid STL file.")
        setSelectedFile(null)
      }
    }
  }

  const handleCoverChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0] || null

    if (file) {
      const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"]
      if (!allowedTypes.includes(file.type)) {
        setCoverImage(null)
        setCoverErrorMessage("Please upload a valid image file (PNG, JPG, JPEG, or WebP.")
        return
      }

      if (file.size > 1000 * 1024) {
        setCoverImage(null)
        setCoverErrorMessage("The cover image size must not exceed 1 MB.")
        return
      }

      setCoverImage(file)
      setCoverErrorMessage(null)
    }
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
      setFileErrorMessage("An STL file is required.")
      return
    }

    if (!coverImage) {
      setCoverErrorMessage("A cover image is required.")
      return
    }

    try {
      setIsLoading(true)

      // Get the uploader's public key
      const publicKey = await fetchPublicKey()

      const filehosting = {
        file: selectedFile,
        name: fields.name.value,
        description: fields.description.value,
        satoshis: Number(fields.satoshis.value),
        publicKey,
        expiration: Number(fields.expiration.value),
        coverImage
      }

      console.log(filehosting)
      await publishCommitment(filehosting)
      navigate("/")
    } catch (e) {
      toast.error((e as Error).message);
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
        {/* File submit box */}
        <Box mb={2} display="flex" alignItems="center">
          <input
            type="file"
            accept=".stl"
            onChange={handleFileChange}
            style={{ display: "none" }}
            id="stl-file-input"
          />
          <label htmlFor="stl-file-input">
            <Button variant="contained" component="span">
              Choose File
            </Button>
          </label>
          <Box ml={2}>
            {selectedFile && <Typography variant="body2">{selectedFile.name}</Typography>}
            {fileErrorMessage && (
              <Typography color="error" variant="body2">
                {fileErrorMessage}
              </Typography>
            )}
          </Box>
        </Box>
        <Paper
          elevation={3}
          style={{
            padding: "1.5em",
            marginBottom: "1.5em",
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            border: "1px solid #ccc"
          }}
        >
          <Typography variant="h5">
            File Info
          </Typography>
          {/* Name box */}
          <Box mb={0.5} display="flex" alignItems="center">
            <TextField
              label="Name"
              value={fields.name.value}
              onChange={(e) => handleChange("name", e.target.value)}
              variant="standard"
              style={{ width: 600 }}
              required
            />
          </Box>
          {/* Description box */}
          <Box mb={0.5} display="flex" alignItems="center">
            <TextField
              label="Description"
              value={fields.description.value}
              onChange={(e) => handleChange("description", e.target.value)}
              multiline
              minRows={3}
              maxRows={6}
              variant="standard"
              style={{ width: 600 }}
            />
          </Box>
          {/* Satoshi box */}
          <Box mb={2} display="flex" alignItems="center">
            <TextField
              label="Satoshis"
              value={fields.satoshis.value}
              onChange={(e) => handleChange("satoshis", e.target.value)}
              inputProps={{ inputMode: "numeric" }}
              variant="standard"
              style={{ width: 600 }}
              required
            />
          </Box>
          {fields.satoshis.error && (
            <Typography color="error" variant="body2">
              {fields.satoshis.error}
            </Typography>
          )}
        </Paper>
        {/* Cover Picture submit box */}
        <Box mb={2} display="flex" alignItems="center">
          <input
            type="file"
            accept="image/png, image/jpg, image/jpg, image/webp"
            onChange={handleCoverChange}
            style={{ display: "none" }}
            id="cover-image-input"
          />
          <label htmlFor="cover-image-input">
            <Button variant="contained" component="span">
              Choose Cover Image
            </Button>
          </label>
          <Box ml={2}>
            {coverImage && <Typography variant="body2">{coverImage.name}</Typography>}
            {coverErrorMessage && (
              <Typography color="error" variant="body2">
                {coverErrorMessage}
              </Typography>
            )}
          </Box>
        </Box>
        {coverImage && (
          <Box mb={2}>
            <Typography variant="h6">Preview:</Typography>
            <img
              src={URL.createObjectURL(coverImage)}
              alt="Cover Preview"
              style={{ maxWidth: "300px", maxHeight: "300px" }}
            />
          </Box>
        )}

        {/* Advanced Config */}
        <Box mb={2}>
          <Button
            variant="outlined"
            onClick={() => setShowAdvancedConfig((prev) => !prev)}
          >
            {showAdvancedConfig ? "Hide Advanced Config" : "Show Advanced Config"}
          </Button>
          <Collapse in={showAdvancedConfig}>
            <Paper
              elevation={3}
              style={{
                marginTop: "1em",
                padding: "1.5em",
                border: "1px solid #ccc",
              }}
            >
              <Typography variant="h6">Advanced Config</Typography>
              <Box mt={2}>
                <TextField
                  label="Expiration Time (Days)"
                  value={fields.expiration.value}
                  onChange={(e) => handleChange("expiration", e.target.value)}
                  inputProps={{ inputMode: "numeric" }}
                  variant="standard"
                />
                {fields.expiration.error && (
                  <Typography color="error" variant="body2">
                    {fields.expiration.error}
                  </Typography>
                )}
              </Box>
            </Paper>
          </Collapse>
        </Box>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={isLoading || !selectedFile || !coverImage || Object.entries(fields).some(([key, field]) =>
            key !== "description" && (field.error || !field.value)
          )
          }
        >
          {isLoading ? "Uploading..." : "Upload"}
        </Button>
      </form>
    </Container>
  )
}

export default UploadFile