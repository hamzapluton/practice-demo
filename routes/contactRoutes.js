import express from "express";
import {createContact, getAllContacts} from "#controllers/contactController";

const contactRouters = express.Router();


contactRouters.route('/')
    .get(getAllContacts)
    .post(createContact)


export default contactRouters