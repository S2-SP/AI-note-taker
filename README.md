**For Backend**

npm init -y
npm install express pg dotenv cors openai multer
npm install --save-dev nodemon
npm install multer ffmpeg-static fluent-ffmpeg

backend/
   ├── src/
   │    ├── index.js        (Express server entry)
   │    ├── db.js           (Postgres connection)
   │    ├── routes/
   │    │     ├── meetings.js   (upload, transcribe, summarize)
   │    │     └── tasks.js      (CRUD for tasks)
   │    └── services/
   │          └── openai.js     (Whisper + GPT calls)
   ├── .env
   └── package.json

**For Frontend**

npx create-react-app frontend
cd frontend
npm install axios react-router-dom

src/
 ├─ components/
 │   ├─ MeetingList.js
 │   ├─ UploadForm.js
 ├─ pages/
 │   ├─ Home.js
 │   ├─ Upload.js
 ├─ App.js
 ├─ api.js

