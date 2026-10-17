// ChefUnitPlus - Validateurs
const { body } = require('express-validator');

const registerValidator = [
  body('nom').trim().isLength({ min: 2 }).withMessage('Nom requis (min 2)'),
  body('postNom').trim().isLength({ min: 2 }).withMessage('Post-nom requis'),
  body('prenom').trim().isLength({ min: 2 }).withMessage('Prenom requis'),
  body('email').trim().isEmail().withMessage('Email invalide'),
  body('phone').trim().notEmpty().withMessage('Telephone requis'),
  body('password').isLength({ min: 6 }).withMessage('Mot de passe min 6'),
  body('sexe').isIn(['homme', 'femme']).withMessage('Sexe invalide'),
  body('dateNaissance').notEmpty().withMessage('Date de naissance requise'),
  body('lieuNaissance').trim().notEmpty().withMessage('Lieu de naissance requis'),
  body('province').trim().notEmpty().withMessage('Province requise'),
  body('ville').trim().notEmpty().withMessage('Ville requise'),
  body('commune').trim().notEmpty().withMessage('Commune requise'),
  body('quartier').trim().notEmpty().withMessage('Quartier requis'),
  body('avenue').trim().notEmpty().withMessage('Avenue requise'),
  body('numero').trim().notEmpty().withMessage('Numero requis'),
  body('groupeScout').trim().notEmpty().withMessage('Groupe scout requis'),
  body('branche').isIn(['meute', 'troupe', 'compagnie', 'clan'])
    .withMessage('Branche invalide'),
  body('dateEntreeScout').notEmpty().withMessage('Date entree scout requise'),
  body('engagementAccepte').isBoolean().withMessage('Engagement requis'),
];

const loginValidator = [
  body('email').trim().isEmail().withMessage('Email invalide'),
  body('password').notEmpty().withMessage('Mot de passe requis'),
];

module.exports = { registerValidator, loginValidator };
