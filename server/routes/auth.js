const express = require('express');
const {register, login, updateUser, getUserImpostazioni, recoveryPassword, resetPassword, verifyEmail, loginSuperAdmin, getUsersSuperAdmin, changeOrientatorePassword, getOriImpostazioni} = require('../controllers/auth');
const { sendEmail } = require('../controllers/sendEmail');
const { modifyCounter, updateUserStatus } = require('../controllers/superAdmin');
const User = require('../models/user');

const router = express.Router();


router.post("/register", register);
router.post("/login", login);
router.post("/send-email", sendEmail);
router.put("/update-user", updateUser);
router.get('/getUser-impostazioni/:id', getUserImpostazioni);
router.get('/getOri-impostazioni/:id', getOriImpostazioni);
router.post('/recovery-password', recoveryPassword);
router.post("/reset-password", resetPassword);
router.post('/verify-email', verifyEmail);
router.post("/login-superadmin", loginSuperAdmin);
router.get('/get-all-user-super-admin', getUsersSuperAdmin);

router.post("/modify-counter-super", modifyCounter);
router.post("/update-user-status-admin", updateUserStatus);

router.post("/change-ori-password", changeOrientatorePassword);

router.post("/modify-rating-note-super", async (req, res) => {
    try {
      const userId = req.body.userId;
      const note = req.body.note;
      const rating = req.body.rating;
  
      const user = await User.findById(userId);
  
      if (!user) {
        return res.status(404).json({ error: 'Utente non trovato' });
      }
  
      if (rating !== undefined) {
        user.rating = rating;
      } 
  
      if (note !== undefined) {
        user.note = note;
      }
  
      await user.save();
  
      res.status(200).json({ message: 'Modifica avvenuta con successo', user: user });
    } catch (error) {
      console.error('Errore nell\'aggiornamento del rating o delle note:', error);
      res.status(500).json({ error: 'Si è verificato un errore nell\'aggiornamento del rating o delle note' });
    }
  });

module.exports = router;
