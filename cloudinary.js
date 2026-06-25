// cloudinary.js — Helper para subir imágenes
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: 'dn8yg1w3e',
  api_key: '438757733968888',
  api_secret: process.env.CLOUDINARY_SECRET
});

module.exports = cloudinary;
