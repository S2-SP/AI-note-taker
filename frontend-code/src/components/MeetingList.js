import React, {useState, useEffect}  from "react";
import { fetchMeetings, fetchTasks, createTask, updateTask, deleteMeeting, deleteTask } from "../api";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  IconButton,
} from "@mui/material";
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

export default function MeetingList({ meetings,onRefresh}) {
    
    const [task, setTask] = useState([]);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({
        meeting_id: "",
        description: "",
        assigned_to: "",
        due_date: ""
    });
    const [activeMeeting, setActiveMeeting] = useState(null);
    const [editTask, setEditTask] = useState(null);
    const [isEdit, setIsEdit] = useState(false);

    
        const getTasks = async()=>{
            try{
                const data = await fetchTasks();
                const tasksArray = Array.isArray(data.data) ? data.data : [];
                setTask(tasksArray);
            }catch(error){
                console.error("Error fetching tasks:", error);
            }
        }
        
        useEffect(()=>{
            getTasks();
        },[]);

    const handleOpen = (meetingId)=>{
        setActiveMeeting(meetingId);
        setForm({...form, meeting_id: meetingId});
        setOpen(true);
    }

    const handleClose = () => {
        setOpen(false); 
        setIsEdit(false); 
        setEditTask(null); 
        setForm({ meeting_id: "", description: "", assigned_to: "", due_date: "" });
    };

    const handleChange = (e) => {
        setForm({...form, [e.target.name]: e.target.value});
    };
console.log("Edit Task:", isEdit, editTask);
    const handleSubmit = async () => {
    if (!activeMeeting) return;
    try {
       
        const newTask = await createTask(form);

        setTask((prev) => [newTask, ...prev]);

        setOpen(false);
        setForm({ meeting_id: "", description: "", assigned_to: "", due_date: "" });

    } catch (err) {
        console.error("Error creating task:", err);
    }finally{
        setIsEdit(false);
        setEditTask(null);
        getTasks();
    }
};

const handleSave = async () => {
    console.log("Submitting form:", isEdit);

    try {
        if (isEdit && editTask) {
        const updated = await updateTask(editTask.id, { description: form.description, assigned_to: form.assigned_to, due_date: form.due_date});
      // update locally
        setTask(prev =>
            prev.map(t => (t.id === editTask.id ? updated : t))
        );
    } // reset form
    } catch (err) {
        console.error("Error creating task:", err);
    }finally{
        setOpen(false);
        setIsEdit(false);
        setEditTask(null);
        setForm({
        meeting_id: task.meeting_id,
        description: task.description,
        assigned_to: task.assigned_to || "",
        due_date: task.due_date || ""
    });
        getTasks();
    }
};

const openEdit = (task) =>{
    setEditTask(task);
    setForm({
        meeting_id: task.meeting_id,
        description: task.description,
        assigned_to: task.assigned_to || "",
        due_date: task.due_date || ""
    });
    setOpen(true);
    setIsEdit(true);
};

const handleDeleteTask = async (taskId, meetingId) =>{
    if(!window.confirm("Are you sure you want to delete this task?")) return;
    try{
        await deleteTask(taskId);
        setTask((prev)=> prev.filter((t)=> t.id !== taskId));
    }catch(err){
        console.error("Error deleting task:", err);
    }
};

const handleDeleteMeeting = async (meetingId) =>{
    if(!window.confirm("Are you sure you want to delete this meeting? This will also delete all associated tasks.")) return;
    try{
        await deleteMeeting(meetingId);
        // remove meeting from list
        // also remove associated tasks
        setTask((prev)=> prev.filter((t)=> t.meeting_id !== meetingId));
        if(onRefresh) onRefresh();
    }
    catch(err){
        console.error("Error deleting meeting:", err);
    }
};

   
    return(
        <>
        {meetings?.map((meeting, index)=>(
            <Card key={index} sx={{mb:2}}>
                <CardContent>
                    <div className="meeting-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <Typography variant="h6" sx={{flexGrow: 1, textAlign: 'left'}}>{meeting.title}</Typography>
                        <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteMeeting(meeting.id)}><DeleteIcon/></IconButton>
                    </div>
                    
                    <Typography variant="body2">{meeting.summary}</Typography>
                    <Typography variant="subtitle2" gutterBottom sx={{mt:1, fontWeight: 'bold', textDecoration:"underline"}}>
                        Transcript:
                    </Typography>
                    <Typography variant="body2" paragraph>
                        {meeting.transcript}
                    </Typography>
                    {meeting.video_path && (
                        <CardMedia
                        component="video"
                        src={`http://localhost:4000/${meeting.video_path}`}
                        controls
                        sx={{ height: 200 }} // adjust height as needed
                        />
                    )}
                    <Button variant="contained" sx={{mt:1}} onClick={()=>handleOpen(meeting.id)}>
                        Add Task
                    </Button>

                    {/* Task List */}

                    <List sx={{mt:1}}>
                        {task?.filter((t) => t.meeting_id === meeting.id)
                            .map((t) => (
                                <ListItem 
                                    key={t.id}
                                    secondaryAction={
                                                     <>
                                                        <IconButton edge="end" aria-label="edit" onClick={() => openEdit(t)}><EditIcon/></IconButton>
                                                        <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteTask(t.id, meeting.id)}><DeleteIcon/></IconButton>
                                                    </>
                                                    }
                                    >
                                    <ListItemText
                                        primary={t.description}
                                        secondary={`Assigned: ${t.assigned_to} | Due: ${t.due_date}`}
                                    />
                                </ListItem>
                         ))}
                    </List>
                </CardContent>
            </Card>
        ))}

        <Dialog open={open} onClose={handleClose}>
            <DialogTitle>{editTask ? "Edit Task" : "Add Task"}</DialogTitle>
            <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
                <TextField name="description" label="Task description" value={form.description} onChange={handleChange}/>
                <TextField name="assigned_to" label="Assign to" value={form.assigned_to} onChange={handleChange}/>
                <TextField name="due_date" label="Due date" type="date" InputLabelProps={{ shrink: true }} value={form.due_date} onChange={handleChange}/>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                <Button onClick={isEdit ? handleSave : handleSubmit} variant="contained">{isEdit ? "Save" : "Submit"}</Button>
            </DialogActions>

        </Dialog>
        </>
    );
}
