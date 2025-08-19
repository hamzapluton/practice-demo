import mongoose from "mongoose";
import { PATH } from "#constants/user";

const storeSchema = new mongoose.Schema(
  {
    title_en: {
      type: String,
      required: [true, "title english field is required"],
    },
    title_sp: {
      type: String,
      required: [true, "title spanish field is required"],
    },
    description_en: {
      type: String,
      required: [true, "description english field is required"],
    },
    description_sp: {
      type: String,
      required: [true, "description spanish field is required"],
    },
    location: {
      state: {
        type: String,
        required: [true, "state field is required in location"],
      },
      city: {
        type: String,
        required: [true, "city field is required in location"],
      },
      address: {
        type: String,
        required: [true, "address field is required in location"],
      },
      postalCode: {
        type: String,
        required: [true, "postalCode field is required in location"],
      },
    },
    image: {
      type: String,
      required: [true, "image field is required"],
    },
    files: [
      {
        type: {
          type: String,
        },
        file: {
          type: String,
        },
      },
    ],

  pitches: [
    {
      pitchTitleEnglish: {
        type: String,
      },
      pitchTitleSpanish: {
        type: String,
      },
      pitchDescriptionEnglish: {
        type: String,
      },
      pitchDescriptionSpanish: {
        type: String,
      },
      pitchImage: {
        type: String,
      },
    },
  ],

    dividend: {
      type: Number,
      default: 0,
    },
    totalShares: {
      type: Number,
      required: [true, "totalShares field is required"],
    },
    sharePerPrice: {
      type: Number,
      default: 20,
    },
    active: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false
  },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

// storeSchema.post("find", function (records, next) {
//   const host = `${PATH}/upload/`;
//   records.map((record) => (record["image"] = host + record["image"]));
//   next();
// });

const Store = mongoose.model("stores", storeSchema);

export default Store;
