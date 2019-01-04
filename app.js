var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var bcrypt = require('bcrypt');
var cookieSession = require('cookie-session')
var expressValidator = require('express-validator');
var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var LocalStrategy = require('passport-local').Strategy;
var flash = require('express-flash');
var multer  = require('multer');
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/images/')
  },
  filename: function (req, file, cb) {
      cb(null, file.originalname);        
  }
})

var upload = multer({ storage: storage });
//var upload = multer({ dest: 'uploads/images/' });

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var User = require('./models/user');
var keys = require('./config/keys');

var app = express();

app.use(expressValidator());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(express.static('uploads'));

app.use(cookieSession({
  name: 'session',
  keys: [keys.session.secretKey],
  // Cookie Options
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}))
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(
  function (username, password, done) {
    User.findOne({ username: username }, function (err, user) {
      if (err) { return done(err); }
      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }
      bcrypt.compare(password, user.password, function (err, ans) {
        if (err) return console.error(err);

        if (ans != true) {
          return done(null, false, { message: 'Incorrect password.' });
        }
      });
      return done(null, user);
    });
  }
));

passport.use(new GoogleStrategy({
  clientID: keys.google.clientID,
  clientSecret: keys.google.clientSecret,
  callbackURL: "/auth/google/callback"
},
  function (accessToken, refreshToken, profile, done) {
    User.findOne({ email: profile.emails[0].value }, function (err, user) {
      if (err) {
        return done(err);
      }
      if (!user) {
        user = new User({
          email: profile.emails[0].value,
          username: profile.displayName,
          photo: profile.photos[0].value
        });
        user.save(function (err) {
          if (err) console.log(err);
          return done(err, user);
        });
      } else {
        //found user. Return
        return done(err, user);
      }
    });
  }
));

// used to serialize the user for the session
passport.serializeUser(function (user, done) {
  done(null, user.id);
  // where is this user.id going? Are we supposed to access this anywhere?
});

// used to deserialize the user
passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

app.get('/login', function (req, res, next) {
  res.render('login', { title: 'Login' });
});

app.post('/login',
  passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
  })
);

app.get('/register', function (req, res, next) {
  res.render('register', { title: 'Registration Form' });
});

app.post('/register', upload.single('photo'), function (req, res, next) {
  var username = req.body.username;
  var email = req.body.email;
  var age = req.body.age;
  var password = req.body.password;
  var photo = "http://localhost:3000/images/"+req.file.filename;

  req.checkBody('username', 'Username is required.').notEmpty();
  req.checkBody('email', 'Email is required.').notEmpty();
  req.checkBody('email', 'Email is not valid').isEmail();
  req.checkBody('password', 'Password is required.').notEmpty();
  req.checkBody('cpassword', 'Confirm Password is required.').notEmpty();
  req.checkBody('password', 'Passwords do not match').equals(req.body.cpassword);

  var errors = req.validationErrors();

  if (errors) {
    res.render('register', {
      errors: errors,
      title: 'Registration Form'
    });
  } else {

    var saltRounds = 10;
    bcrypt.hash(password, saltRounds, function (err, hash) {
      if (err) return console.error(err);
      var user = new User({ username: username, email: email, age: age, password: hash, photo: photo });

      User.createUser(user, function (err) {
        if (err) return console.error(err);

        res.location('/');
        res.redirect('/');
      });
    });
  }
});

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function (req, res) {
    res.redirect('/');
  });

app.get('/update/:id', function (req, res, next) {

  User.viewUser(req.params.id, function (err, data) {
    if (err) return console.error(err);

    res.render('update', { title: 'Update Details', data: data });
  });
});

app.post('/update/:id', function (req, res, next) {

  var username = req.body.username;
  var email = req.body.email;
  var age = req.body.age;

  req.checkBody('username', 'Username is required.').notEmpty();
  req.checkBody('email', 'Email is required.').notEmpty();
  req.checkBody('email', 'Email is not valid').isEmail();
  
  var errors = req.validationErrors();

  if (errors) {
    User.viewUser(req.params.id, function (err, data) {
      if (err) return console.error(err);

      res.render('update', { title: 'Update Details', data: data, errors: errors });
    });
  } else {

    
      var user = { username: username, email: email, age: age };

      User.updateUser(req.params.id, user, function (err) {
        if (err) return console.error(err);

        res.location('/');
        res.redirect('/');
      
    });
  }
});

app.get('/delete/:id', function (req, res, next) {

  User.deleteUser(req.params.id, function (err) {
    if (err) return console.error(err);

    res.location('/');
    res.redirect('/');
  });
});

app.get('/logout', function (req, res, next) {

  //req.session.destroy();
  req.session = null;
  res.location('/login');
  res.redirect('/login');
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
