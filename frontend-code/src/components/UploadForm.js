import React, {useState, useEffect } from "react";
import { uploadMeeting } from "../api";
import { useNavigate } from "react-router-dom";
import { Box, TextField, Button } from "@mui/material";

export default function UploadForm() {
    const [title, setTitle] = useState("");
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) =>{
        e.preventDefault();
        if(!file) return alert("Please upload a valid file");

        const formData = new FormData();
        formData.append("title", title);
        formData.append("file", file);
        
        try{
            setLoading(true);
            await uploadMeeting(formData);
            setLoading(false);
            navigate("/");
        }catch(error){
            console.error("Error uploading meeting:", error);
            setLoading(false);
        }
    };
    return(

        <Box component={"form"} onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField 
            label="Meeting Title"
            value={title}
            onChange={(e)=> setTitle(e.target.value)}
            />
            <Button variant="contained" component='label'>
                Select video
                <input type="file" hidden accept="video/*" onChange={(e)=> setFile(e.target.files[0])} required />
            </Button>
            {file && <span>Selected file: {file.name}</span>}
            <Button type="submit" variant="contained" disabled={loading}>
                {loading ? "Uploading..." : "Upload Meeting"}
            </Button>
        </Box>
    )

};