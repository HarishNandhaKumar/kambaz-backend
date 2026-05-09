import mongoose from "mongoose";
const courseSchema = new mongoose.Schema({
    _id: String,
    name: String,
    number: String,
    credits: Number,
    description: String,
},
{ collection: "courses", versionKey: false }
);
export default courseSchema;