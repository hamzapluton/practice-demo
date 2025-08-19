import path, {dirname, join} from "path";
import {fileURLToPath} from "url";
import multer from "multer";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const UPLOAD_PATH = join(__dirname, '../', './upload');


const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, UPLOAD_PATH);
    },
    filename(req, file, cb) {
        cb(
            null,
            `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`
        );
    },
});

const multerUpload = multer({
    storage,
    fileFilter: function (req, file, cb) {
        checkFileType(req, file, cb)
    },
});

const multerUploadDynamic = multer({
    storage,
    fileFilter: function (req, file, cb) {
        checkFileType(req, file, cb)
    },
}).any();

const multerUploadInvestor = multer({
    storage,
    fileFilter: function (req, file, cb) {
        checkFileTypeInvestor(req, file, cb)
    },
});


const checkFileTypeInvestor = (req, file, cb) => {
    const filetypes = /jpg|jpeg|png|jfif|pjpeg|pjp|svg|webp|docx|doc|pdf|xlsx/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        req.uploadError = 'Upload file type should be jpg, jpeg, png, docx, doc, pdf , xlsx'
        cb(null, false);
    }
};


const checkFileType = (req, file, cb) => {
    const filetypes = /jpg|jpeg|png|jfif|pjpeg|pjp|svg|webp|mp4|mov|avi|mkv/;
    
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
   const mimetype = filetypes.test(file.mimetype);
    
    if (extname && mimetype) {
        return cb(null, true);
    } else {
        req.uploadError = 'Upload file type should be jpg, jpeg, png, jfif, pjpeg, pjp, svg, webp, mp4, mov, avi, or mkv';
        cb(null, false);
    }
};

const multerUploadSingleImage = multer({
    storage,
    fileFilter: function (req, file, cb) {
        checkImageFileType(req, file, cb);
    },
});

const checkImageFileType = (req, file, cb) => {
    const filetypes = /jpg|jpeg|png|webp/;
    
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    
    if (extname && mimetype) {
        return cb(null, true);
    } else {
        req.uploadError = 'Upload file type should be jpg, jpeg, png, or webp';
        cb(null, false);
    }
};

export { multerUpload, multerUploadInvestor, multerUploadDynamic, multerUploadSingleImage }
