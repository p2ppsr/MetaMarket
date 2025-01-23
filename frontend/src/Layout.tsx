import { AppBar, Toolbar, Typography, Button, Container } from "@mui/material"
import React from "react"
import { Link, Outlet } from "react-router-dom"

const Layout: React.FC = () => {
    return (
        <>
            <AppBar position="fixed">
                <Toolbar>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1}}>
                        MetaMarket
                    </Typography>
                    <Button color="inherit" component={Link} to="/">Home</Button>
                    <Button color="inherit" component={Link} to="/upload-file">Upload File</Button>
                    <Button color="inherit" component={Link} to="/store">Store</Button>
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