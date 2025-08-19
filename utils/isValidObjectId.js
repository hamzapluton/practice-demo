import mongoose from "mongoose";

const isValidObjectId = (mongoose_id = '') => mongoose.Types.ObjectId.isValid(mongoose_id);


export default isValidObjectId