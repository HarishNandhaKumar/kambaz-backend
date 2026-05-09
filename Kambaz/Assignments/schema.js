import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema(
  {
    _id: { type: String },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    course: { type: String, required: true }, // Course ID reference
    avail_date: { type: String, required: true },
    avail_time: { type: String, default: "12:00 AM" },
    avail_until_date: { type: String, required: true },
    avail_until_time: { type: String, default: "12:00 AM" },
    due_date: { type: String, required: true },
    due_time: { type: String, default: "11:59 PM" },
    points: { type: Number, default: 100 }
  },
  { collection: "assignments", versionKey: false }
);

export default assignmentSchema;