import mongoose from "mongoose";


const contactSchema = new mongoose.Schema({
    name: {type: String, required: [true, 'name field is required']},
    email: { type: String,  required: [true, 'email field is required']},
    message: String
});

const Contact = mongoose.model('contact', contactSchema)

export default Contact
