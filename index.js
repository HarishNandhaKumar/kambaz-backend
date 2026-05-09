import "dotenv/config";
import mongoose from "mongoose";
import app from "./app.js";

const CONNECTION_STRING = process.env.DATABASE_CONNECTION_STRING ||
    "mongodb://127.0.0.1:27017/kambaz";
mongoose.connect(CONNECTION_STRING);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
