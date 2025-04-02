import { AppBar, Toolbar, Typography, Button, Container } from "@mui/material"
import React from "react"
import { Link, Outlet } from "react-router-dom"

const Layout: React.FC = () => {
    return (
        <>
            <AppBar position="fixed">
            <Toolbar>
                    <Button color="inherit" component={Link} to="">
                        <Typography variant="h6" component="div">
                            MetaMarket
                        </Typography>
                    </Button>
                    <div style={{ flexGrow: 1 }} /> {/* This pushes the other buttons to the right */}
                    <Button color="inherit" component={Link} to="/upload-file">Upload File</Button>
                    <Button color="inherit" component={Link} to="/account">Account</Button>
                </Toolbar>
            </AppBar>
            <Toolbar />
            <Container maxWidth="lg" style={{ marginTop: '2em' }}>
                <Outlet /> {/* Child roots go here */}
            </Container>
        </>
    )   
}

export default Layout