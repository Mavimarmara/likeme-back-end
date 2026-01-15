import multer from 'multer';
import { Request } from 'express';

const storage = multer.memoryStorage();

const csvFileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimeTypes = [
    'text/csv',
    'application/csv',
    'application/vnd.ms-excel',
    'text/plain',
  ];

  const allowedExtensions = ['.csv', '.txt'];

  const isValidMimeType = allowedMimeTypes.includes(file.mimetype);
  const isValidExtension = allowedExtensions.some(ext =>
    file.originalname.toLowerCase().endsWith(ext)
  );

  if (isValidMimeType || isValidExtension) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV files are allowed'));
  }
};

export const uploadCSV = multer({
  storage: storage,
  fileFilter: csvFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
}).single('file');

export const uploadMultipleCSV = multer({
  storage: storage,
  fileFilter: csvFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 5,
  },
}).array('files', 5);

export const uploadAny = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
}).single('file');
