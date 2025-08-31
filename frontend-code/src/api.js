import axios from 'axios';

const API = axios.create({
    baseURL:"your_url",
});

export const fetchMeetings = () => API.get('/meetings');
export const fetchMeetingById = (id) => API.get(`/meetings/${id}`);
export const createMeeting = (newMeeting) => API.post('/meetings', newMeeting);
export const uploadMeeting = (formData) => API.post("/meetings/upload", formData, {
    headers:{ 'Content-Type': 'multipart/form-data'},
    }
);
export const deleteMeeting = (id) => API.delete(`meetings/${id}`);
export const createTask = (newTask) => API.post('/tasks', newTask);
export const fetchTasks = () => API.get('/tasks');
export const updateTask = (id, updatedTask) => API.put(`/tasks/${id}`, JSON.stringify(updatedTask), {
    headers: { 'Content-Type': 'application/json' },
});
export const deleteTask = (id) => API.delete(`/tasks/${id}`);
