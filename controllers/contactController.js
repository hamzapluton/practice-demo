import asyncHandler from "express-async-handler";
import Contact from "#models/contactModel";


/*
@desc     Create Contacts
@route    POST /api/contact
@access   Public
*/

const createContact = asyncHandler(async (req, res) => {
    const contact = await new Contact(req.body).save();

    if (contact) {
        return res.status(201).send({status: true, message: 'Thank you for your interest'});
    }
    return res.status(400).send({status: false, message: 'some error has occurred while creating contact'});
});

/*
@desc     GET All Contacts
@route    GET /api/contact
@access   Public
*/

const getAllContacts = asyncHandler(async (req, res) => {
    const contacts = await Contact.find();

    contacts.length >= 0
        ? res.status(201).send({status: true, data: contacts})
        : res.status(400).send({status: false, data: contacts, message: 'No Contacts Founds'});

});

export {getAllContacts, createContact}