const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

function makeStorage(subfolder) {
  const dir = path.join(__dirname, '..', '..', 'uploads', subfolder);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, uuidv4() + ext);
    },
  });
}

const pdfFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === '.pdf') cb(null, true);
  else cb(new Error('Seuls les PDF sont autorises'), false);
};

// Formation : 2 PDFs (support + fiche technique)
const uploadFormationFiles = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(__dirname, '..', '..', 'uploads', 'formations');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const prefix = file.fieldname === 'ficheTechnique' ? 'fiche_' : 'support_';
      cb(null, prefix + uuidv4() + ext);
    },
  }),
  fileFilter: pdfFilter,
  limits: { fileSize: 20 * 1024 * 1024 },
}).fields([
  { name: 'pdf', maxCount: 1 },
  { name: 'ficheTechnique', maxCount: 1 },
]);

// Module : 1 PDF (support)
const uploadModulePdf = multer({
  storage: makeStorage('modules'),
  fileFilter: pdfFilter,
  limits: { fileSize: 20 * 1024 * 1024 },
}).single('pdf');


// ============================================================
// Inscription scout : photo de profil + champs texte
// ============================================================
const uploadRegisterPhoto = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(__dirname, '..', '..', 'uploads', 'avatars');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, 'avatar_' + uuidv4() + ext);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
}).single('photo');


// ============================================================
// UPLOAD NEWS (PDF, Word, images)
// ============================================================
const newsFilter = (req, file, cb) => {
  const allowed = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp'
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Format non supporte. Utilisez PDF, Word, JPG ou PNG.'));
  }
};

const uploadNewsFile = multer({
  storage: makeStorage('news'),
  fileFilter: newsFilter,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30 MB
}).single('file');

// ============================================================
// UPLOAD VIDEO (MP4, WEBM, etc.)
// ============================================================
const videoFilter = (req, file, cb) => {
  const allowed = [
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska'
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Format non supporte. Utilisez MP4, WEBM ou MOV.'));
  }
};

const uploadVideoFile = multer({
  storage: makeStorage('videos'),
  fileFilter: videoFilter,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB
}).single('video');

module.exports = {
  uploadNewsFile,
  uploadVideoFile, uploadFormationFiles, uploadModulePdf, uploadRegisterPhoto,
};

