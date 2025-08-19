import ownerModel from "#models/ownerModel";
import ticketModel from "#models/ticketModel";
import User from "#models/userModel";
import { firebaseAdminNotification } from "#utils/firebaseAdminNotification";
import { firebaseNotification } from "#utils/firebaseNotification";
import mongoose from "mongoose";

// Create ticket
export const create = async (req, res) => {
  try {
    if (req.uploadError) {
      throw new Error(req.uploadError);
    }

    const ticket = req.body;

    if (req.file) {
      ticket.attachment = `/upload/${req.file.filename}`;
    }

    const newTicket = new ticketModel(ticket);
    await newTicket.save();

    // const notification = {
    //   title: `New ticket generated`,
    //   body: `A new ticket generated id=${newTicket._id}`,
    // };

    // await firebaseNotification(
    //   notification,
    //   [user],
    //   "news",
    //   "Selected-Users",
    //   "system",
    //   "users"
    // );
    // await firebaseAdminNotification(
    //   {
    //     title: "New Document Uploaded for Review",
    //     body: `A new document, "${req.body?.type}," has been uploaded by user ${user?.name} and requires the admin team's attention. Please review it as soon as possible. ${DOCADMINPATHLIVE}${user?._id}`,
    //   },
    //   "news",
    //   "Selected-Users",
    //   "system",
    //   "admin"
    // );

    res.status(201).json({
      status: true,
      message: "New ticket created successfully",
      data: newTicket,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Internal Server Error. Please try again!",
      error: error.message,
    });
  }
};

// Get all tickets or specific tickets based on user type
export const getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query; // Default page = 1, limit = 10, search = empty string

    // Check if user is an admin
    const isAdmin = await ownerModel.exists({ _id: req.user.id });

    let query = {};
    if (!isAdmin) {
      query.userId = req.user.id; // Regular user can only see their tickets
    }

    // Search functionality
    const searchRegex = new RegExp(search, "i"); // Case-insensitive regex for matching

    // Find matching users for the search string
    const matchingUsers = await User
      .find({ name: searchRegex })
      .select("_id");

    // Add $or condition for subject and matching user IDs
    if (search.trim()) {
      query.$or = [
        { subject: searchRegex }, // Match ticket subject
        { userId: { $in: matchingUsers.map((user) => user._id) } }, // Match userId against found users
      ];
    }

    const tickets = await ticketModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * limit) // Pagination logic
      .limit(parseInt(limit)) // Convert limit to number
      .select("-comments")
      .populate({
        path: "userId",
        select: "name", // Select only the name of the user
      })
      .exec();

    const total = await ticketModel.countDocuments(query); // Total ticket count

    res.status(200).json({
      status: true,
      message: "All tickets fetched successfully",
      data: {
        tickets,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Internal Server Error. Please try again!",
      error: error.message,
    });
  }
};

// Get ticket by ID
export const getById = async (req, res) => {
  try {
    const ticketId = req.params.id;

    if (!ticketId) {
      return res.status(400).json({
        status: false,
        message: "Ticket ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return res.status(400).json({
        status: false,
        message: "You provided an in valid id",
      });
    }

    const ticket = await ticketModel.findById(ticketId).populate({
      path: "userId",
      select: "name",
    });
    if (!ticket) {
      return res.status(404).json({
        status: false,
        message: "Ticket doesn't exist",
      });
    }

    if (ticket.userId._id.toString() === req.user.id) {
      // Regular user can see their own ticket
      return res.status(200).json({
        status: true,
        message: "Ticket fetched successfully",
        data: ticket,
      });
    }

    const isAdmin = await ownerModel.exists({ _id: req.user.id });
    if (isAdmin) {
      // Admin can see any ticket
      return res.status(200).json({
        status: true,
        message: "Ticket fetched successfully by Admin",
        data: ticket,
      });
    }

    return res.status(403).json({
      status: false,
      message: "You are not authorized to access this ticket",
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Internal Server Error. Please try again! " + error.message,
      error: error.message,
    });
  }
};

// Update ticket by ID
export const updateById = async (req, res) => {
  try {
    const ticketId = req.params.id;
    const { comment, ...otherUpdatedFields } = req.body;

    const updateQuery = {
      $set: otherUpdatedFields,
    };

    if (!ticketId) {
      return res.status(400).json({
        status: false,
        message: "Ticket ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return res.status(400).json({
        status: false,
        message: "You provided an in valid id",
      });
    }

    const ticket = await ticketModel.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({
        status: false,
        message: "Ticket not found",
      });
    }

    // Determine if the requester is an admin
    const isAdmin = await ownerModel.exists({ _id: req.user.id });

    // Handle comment logic
    if (comment) {
      const trimmedComment = comment.trim();
      if (trimmedComment === "") {
        return res.status(400).json({
          status: false,
          message: "'comment' cannot be an empty.",
        });
      }

      const commentData = {
        from: isAdmin ? "admin" : "user", // Set 'from' dynamically
        message: trimmedComment,
      };

      updateQuery.$push = { comments: commentData }; // Push comment to the comments array
    }

    // Check if the user is authorized to update the ticket
    const canUpdate = ticket.userId.toString() === req.user.id || isAdmin;

    if (!canUpdate) {
      return res.status(403).json({
        status: false,
        message: "You are not authorized to update this ticket",
      });
    }

    const updatedTicket = await ticketModel
    .findByIdAndUpdate(ticketId, updateQuery, { new: true })
    .populate({
      path: "userId",
      select: "name _id",
    });

    res.status(200).json({
      status: true,
      message: "Ticket updated successfully",
      data: updatedTicket,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Internal Server Error. Please try again! " + error.message,
      error: error.message,
    });
  }
};

// Delete ticket by ID
export const deleteById = async (req, res) => {
  try {
    const ticketId = req.params.id;

    if (!ticketId) {
      return res.status(400).json({
        status: false,
        message: "Ticket ID is required for deletion",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return res.status(400).json({
        status: false,
        message: "You provided an in valid id",
      });
    }

    const isAdmin = await ownerModel.exists({ _id: req.user.id });
    if (!isAdmin) {
      return res.status(403).json({
        status: false,
        message: "You are not authorized to delete this ticket",
      });
    }

    await ticketModel.findByIdAndDelete(ticketId);

    res.status(200).json({
      status: true,
      message: "Ticket deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Internal Server Error. Please try again!",
      error: error.message,
    });
  }
};
