import React from "react";
import UploadForm from "../components/UploadForm";
import { Container, Typography } from "@mui/material";

const Upload = () =>{
    return(
        <Container sx={{ mt: 3 }}>
            <Typography variant="h4" sx={{ mb: 2 }}>Upload Meeting Video</Typography>
            <UploadForm />
        </Container>
    )
};
export default Upload;