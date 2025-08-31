import React, { useEffect, useMemo, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "../../frontend-code/src/pages/Home";
import Upload from "../../frontend-code/src/pages/Upload";
import { AppBar, Toolbar, Typography, Button, IconButton, CssBaseline,Container,Box } from "@mui/material";
import { Link } from "react-router-dom";
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import {ThemeProvider, createTheme} from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";


function App() {
    const prefersLight = useMediaQuery("(prefers-color-scheme: light)");
    const [mode, setMode] = useState("light");

    useEffect(()=>{
        const saved = localStorage.getItem("themeMode");
        setMode(saved || (prefersLight
            ? "light" : "dark"
        ));
    }, []);

    const theme = useMemo(()=>createTheme({
        palette:{
            mode,
            primary:{
                main:mode === "dark" ? "#7C4DFF":"#ffb300"
            },
            background:{
                default: mode === "dark" ? "#0f1020" : "#fffaf2",
                paper: mode === "dark" ? "#17182b" :"#ffffff",
            },
        },
        shape:{borderRadius: 12},
    }),
[mode]);

const toggleMode = ()=>{
    const nextMode = mode === "light" ? "dark":"light";
    setMode(nextMode);
    localStorage.setItem("themeMode", nextMode);
};

const gradient =  mode === "dark" ? "linear-gradient(90deg, #6a11cb 0%, #5b2be0 35%, #2575fc 100%)" : "linear-gradient(90deg, #f7971e 0%, #ffbf00 50%, #ffd200 100%)";
    return(
        <div>
            <ThemeProvider theme={theme}>
            <CssBaseline />
            <Router>
                <AppBar position="sticky" elevation={0} sx={{backgroundImage:gradient, color: mode === "dark" ? "white" : "black"}}>
                    <Toolbar>
                        <Typography variant="h6" sx={{ flexGrow: 1, fontWeight:700 }}>Viora: AI Video Summarizer</Typography>
                        <Button color="inherit" component={Link} to="/">Home</Button>
                        <Button color="inherit" component={Link} to="/upload">Upload</Button>
                        <IconButton color="inherit" onClick={toggleMode}>
                            {mode === "dark" ? <LightModeIcon /> : <DarkModeIcon />}
                        </IconButton>   
                    </Toolbar>
                </AppBar>
                <Box component={"main"}>
                    <Container sx={{py:3}}>
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/upload" element={<Upload />} />
                        </Routes>
                    </Container>
                </Box>
            </Router>
            </ThemeProvider>
        </div>
    )
};

export default App;