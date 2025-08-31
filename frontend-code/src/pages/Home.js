import React, {useState, useEffect} from "react";
import MeetingList from "../components/MeetingList";
import { fetchMeetings } from "../api";
import { Container, Typography } from "@mui/material";

const Home = () =>{
     const [meetings, setMeetings] = useState([]);
   
        const getMeetings = async()=>{
            try{
                const data = await fetchMeetings();
                setMeetings(data.data);
            }catch(error){
                console.error("Error fetching meetings:", error);
            }
        }
    useEffect(()=>{
        getMeetings();
    }, []);
    return(
        <Container sx={{ mt: 3 }}>
            <Typography variant="h4" sx={{ mb: 2 }}>Meetings</Typography>
            <MeetingList meetings={meetings} onRefresh={getMeetings}/>
        </Container>
    )
}

export default Home;