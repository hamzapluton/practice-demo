import mongoose from "mongoose";

const popupSchema = new mongoose.Schema(
  {
    title_en: {
      type: String,
      default: null,
    },
    title_sp: {
      type: String,
      default: null,
    },
    sub_title_en: {
      type: String,
      default: null,
    },
    sub_title_sp: {
      type: String,
      default: null,
    },
    body_en: {
      type: String,
      required: [true, "Body field is required"],
    },
    body_sp: {
      type: String,
      required: [true, "Body field is required"],
    },
    media: {
      type: [String], // array of strings
      default: [],
    },

    button_en: {
      type: String,
      default: null,
    },
    button_sp: {
      type: String,
      default: null,
    },
    link: {
      type: [String], // This makes it an array of strings
      default: [],
    },

    status: {
      type: String,
      default: "inactive",
      enum: ["active", "inactive"],
    },
    type: {
      type: String,
      enum: [
        "landing-page",
        "signup-page",
        "post-login-page",
        "investment-details",
        "kyc-page-1",
        "kyc-page-2",
        "invest-now-page",
        "invest-allocation-page",
        "reinvest-terms-codition-page",
        "referral-policy-page",
        "withdarwal-confirmation-page",
      ],
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

const Popup = mongoose.model("popup", popupSchema);

export default Popup;
