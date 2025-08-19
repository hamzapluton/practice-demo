import fs from "fs";
import path from "path";
import { fileURLToPath } from "url"; // Needed to simulate __dirname in ES modules
import multer from "multer";
import asyncHandler from "express-async-handler";
import Popup from "../models/popupModel.js";
import mongoose from "mongoose";

// Simulate __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PATH = "https://investin-api.javatimescaffe.com";

// Multer Storage Config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, "../upload/popups");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// Multer Upload Middleware
const upload = multer({ storage }).fields([
  { name: "media", maxCount: 10 }, // for multiple media files
  { name: "image", maxCount: 1 }, // for single image
]);

const createPopup = asyncHandler(async (req, res) => {
  // return res.json(req.body);
  upload(req, res, async function (err) {
    if (err) {
      return res.status(400).json({ status: false, message: err.message });
    }

    try {
      const {
        title_en,
        title_sp,
        sub_title_en,
        sub_title_sp,
        body_en,
        body_sp,
        button_en,
        button_sp,
        type,
        link,
      } = req.body;

      const popupexists = await Popup.find({ type: type, isDeleted: false });

      if (popupexists.length > 0) {
        return res.status(400).json({
          status: false,
          message: "This popup type already exists.",
        });
      }

      if (!body_en || typeof body_en !== "string" || body_en.trim() === "") {
        return res.status(400).json({
          status: false,
          message: "Content is required and must be a non-empty string.",
        });
      }

      if (!type) {
        return res.status(400).json({
          status: false,
          message: "Popup type is required.",
        });
      }

      let media = [];
      if (req.files && req.files.media) {
        const baseUrl = process.env.APP_URL || PATH;
        media = req.files.media.map(
          (file) => `${baseUrl}/upload/popups/${file.filename}`
        );
      }

      // 🔽 Helper function to sanitize input
      const sanitize = (val) =>
        typeof val === "undefined" || val === null ? "" : val;
      let linksArray = [];
      if (Array.isArray(link)) {
        linksArray = link.map((l) => l.trim()).filter(Boolean);
      } else if (typeof link === "string" && link.trim() !== "") {
        linksArray = [link.trim()];
      }
      const newPopup = new Popup({
        title_en: sanitize(title_en),
        title_sp: sanitize(title_sp),
        sub_title_en: sanitize(sub_title_en),
        sub_title_sp: sanitize(sub_title_sp),
        body_en: body_en.trim(),
        body_sp: sanitize(body_sp).trim(),
        button_en: sanitize(button_en),
        button_sp: sanitize(button_sp),
        type: sanitize(type),
        link: linksArray,
        media,
      });

      await newPopup.save();

      return res.status(201).json({
        status: true,
        message: "Popup created successfully.",
        data: newPopup,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        status: false,
        message: "An error occurred while creating the popup.",
      });
    }
  });
});

/**
 @desc     Get All popups
 @route    GET /api/get-all-popup
 @access   Private
 */
const getAllPopups = asyncHandler(async (req, res) => {
  const popups = await Popup.find({ isDeleted: false });

  popups.length === 0
    ? res.status(200).send({
        status: false,
        message: "No popups exist",
        popups: [],
      })
    : res.status(200).send({
        status: true,
        popups: popups,
        total: popups.length,
      });
});

/**
 @desc     Get Popup by id
 @route    GET /api/popup/:id
 @access   Private
 */
const getPopupById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(422).send({
      status: false,
      message: "Popup id is required",
    });
  }

  const popup = await Popup.findById(id);

  if (!popup) {
    return res.status(404).send({
      status: false,
      message: "Popup not found",
    });
  }

  return res.status(200).send({
    status: true,
    popup: popup,
  });
});

/**
 @desc     Update popup
 @route    PUT /api/popup/:id
 @access   Private
 */
const updatePopup = asyncHandler(async (req, res) => {
  upload(req, res, async function (err) {
    if (err) {
      return res.status(400).json({ status: false, message: err.message });
    }

    try {
      const { id } = req.body;
      if (!id) {
        return res.status(404).json({
          status: false,
          message: "Popup id is required",
        });
      }

      const popup = await Popup.findById(id);
      if (!popup) {
        return res.status(404).json({
          status: false,
          message: "Popup not found",
        });
      }

      const {
        title_en,
        title_sp,
        sub_title_en,
        sub_title_sp,
        body_en,
        body_sp,
        button_en,
        button_sp,
        type,
        link,
      } = req.body;

      if (!body_en || typeof body_en !== "string" || body_en.trim() === "") {
        return res.status(400).json({
          status: false,
          message: "Content is required and must be a non-empty string.",
        });
      }

      let media = [];
      if (req.files && req.files.media) {
        const baseUrl = process.env.APP_URL || PATH;
        media = req.files.media.map(
          (file) => `${baseUrl}/upload/popups/${file.filename}`
        );
      }

      if (req.files && req.files.media && req.files.media[0]) {
        const image = req.files.media[0].filename;
        req.body.media = `${PATH}upload/${image}`;
      } else {
        req.body.media = popup.media;
      }

      // 🔽 Helper to replace undefined/null with ''
      const sanitize = (val, fallback = "") =>
        typeof val === "undefined" || val === null ? fallback : val;

      let linksArray = [];
      if (typeof link !== "undefined") {
        if (Array.isArray(link)) {
          linksArray = link.map((l) => l.trim()).filter(Boolean);
        } else if (typeof link === "string" && link.trim() !== "") {
          linksArray = [link.trim()];
        }
      } else {
        linksArray = []; // if link is not provided at all
      }
      const updatedPopup = await Popup.findByIdAndUpdate(
        id,
        {
          title_en: sanitize(title_en, popup.title_en),
          title_sp: sanitize(title_sp, popup.title_sp),
          sub_title_en: sanitize(sub_title_en, popup.sub_title_en),
          sub_title_sp: sanitize(sub_title_sp, popup.sub_title_sp),
          body_en: body_en.trim(),
          body_sp: sanitize(body_sp, popup.body_sp).trim(),
          button_en: sanitize(button_en, popup.button_en),
          button_sp: sanitize(button_sp, popup.button_sp),
          type: sanitize(type, popup.type),
          link: linksArray,

          media,
        },
        { new: true }
      );

      if (updatedPopup) {
        return res.status(200).json({
          status: true,
          message: "Popup updated successfully.",
          data: updatedPopup,
        });
      }

      return res.status(400).json({
        status: false,
        message: "Something went wrong while updating the popup.",
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        status: false,
        message: "An error occurred while updating the popup.",
      });
    }
  });
});

/**
 @desc     Delete popup
 @route    DELETE /api/popup/:id
 @access   Private
 */
const deletePopup = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(404).send({
      status: false,
      message: "Popup id is is required",
    });
  }
  const popup = await Popup.findById(id);

  if (!popup) {
    return res.status(404).send({
      status: false,
      message: "Popup not found",
    });
  }

  const deletedPopup = await Popup.findByIdAndUpdate(id, { isDeleted: true });

  if (deletedPopup) {
    return res.status(200).send({
      status: true,
      message: "Popup deleted successfully",
    });
  }

  return res.status(404).send({
    status: false,
    message: "Popup not found",
  });
});
const getSpecificType = asyncHandler(async (req, res) => {
  const { type } = req.params;

  if (!type) {
    return res.status(404).send({
      status: false,
      message: "Popup type is required", // fixed typo: "is is" → "is"
    });
  }

  const popup = await Popup.findOne({
    type: type,
    isDeleted: false,
  });

  if (!popup) {
    return res.status(404).send({
      status: false,
      message: "Popup not found",
    });
  }

  return res.status(200).send({
    status: true,
    data: popup,
  });
});

//get all types of popups
const PopupTypes = asyncHandler(async (req, res) => {
  const popupTypes = [
    { value: "landing-page", label: "Landing Page" },
    { value: "signup-page", label: "Signup Page" },
    { value: "post-login-page", label: "Post Login Page" },
    { value: "kyc-page-1", label: "KYC Page 1" },
    { value: "kyc-page-2", label: "KYC Page 2" },
    { value: "invest-now-page", label: "Invest Now Page" },
    { value: "invest-allocation-page", label: "Invest Allocation Page" },
    {
      value: "reinvest-terms-codition-page",
      label: "Reinvest Terms & Conditions Page",
    },
    { value: "referral-policy-page", label: "Referral Policy Page" },
    {
      value: "withdarwal-confirmation-page",
      label: "Withdrawal Confirmation Page",
    },
    {
      value: "investment-details",
      label: "Investment Details"
    }
  ];

  if (popupTypes) {
    return res.status(200).send({
      status: true,
      data: popupTypes,
    });
  }

  return res.status(404).send({
    status: false,
    message: "Popup Types not found",
  });
});

const popupStatusChange = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    ///

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: false,
        message: "Invalid popup ID format",
      });
    }

    const newStatus = { status: null };

    console.log(id);

    const popup = await Popup.findOne({ _id: id });
    console.log(popup);

    if (!popup) {
      return res.status(404).json({
        status: false,
        message: "Popup not found",
      });
    }

    newStatus.status = popup.status === "active" ? "inactive" : "active";

    const updatedPopup = await Popup.findByIdAndUpdate(id, newStatus, {
      new: true,
      runValidators: true,
    });

    return res.status(200).json({
      data: updatedPopup,
      status: true,
      message: `Popup ${newStatus.status} successfully`,
    });
  } catch (err) {
    console.error("Popup status change error:", err);
    return res.status(500).json({
      status: false,
      message: "An error occurred while changing the popup status.",
    });
  }
});

export {
  createPopup,
  getAllPopups,
  getPopupById,
  updatePopup,
  deletePopup,
  getSpecificType,
  PopupTypes,
  popupStatusChange,
};
