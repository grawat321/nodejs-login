var express = require('express');
var router = express.Router();

var User = require('../models/user');

/* GET home page. */
router.get('/', ensureAuthenticated, function (req, res, next) {

  User.viewUsers(function (err, result) {
    if (err) return console.error(err);
    req.flash('info', 'Flash Message Added');
    res.render('index', { title: 'Members', user: req.user, data: result });
  });
});

function ensureAuthenticated(req,res,next){
  if(req.isAuthenticated()){
      //req.isAuthenticated() will return true if user is logged in
      next();
  } else{
      res.redirect("/login");
  }
}

module.exports = router;
