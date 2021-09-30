const express = require("express");
const cookieParser = require('cookie-parser')
const app = express();
const PORT = 8080; // default port 8080
const bodyParser = require("body-parser");
const bcrypt = require('bcryptjs');
const salt = bcrypt.genSaltSync(10);
const cookieSession = require("cookie-session");
const { findUserByEmail } = require("./helpers");


app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
app.use(
	cookieSession({
		name: "session",
		keys: ["Some way to encrypt the values", "$!~`yEs123bla!!%"],
	})
);

app.set("view engine", "ejs");


const urlDatabase = {
  b6UTxQ: {
      longURL: "http://www.lighthouselabs.ca",
      userID: "aJ48lW"
  },
  i3BoGr: {
      longURL: "https://www.google.com",
      userID: "aJ48lW"
  }
};
// Create hashed passwords for database
const hashedPassword1 = bcrypt.hashSync("purple-monkey-dinosaur", salt);
const hashedPassword2 = bcrypt.hashSync("dishwasher-funk", salt);

const users = { 
  "userRandomID": {
    id: "userRandomID", 
    email: "user@example.com", 
    password: hashedPassword1
  },
 "user2RandomID": {
    id: "user2RandomID", 
    email: "user2@example.com", 
    password: hashedPassword2
  }
}

function generateRandomString() {
  return Math.random().toString(36).substr(2, 6);
}

const createUser = function (email, password, users) {
  const userId = generateRandomString();

  users[userId] = {
    id: userId,
    email,
    password,
  };

  return userId;
};


const authenticateUser = function (email, password, usersDb) {
  const userFound = findUserByEmail(email, usersDb);
  if(userFound) {
    if (bcrypt.compareSync(password, userFound.password)) {
      return userFound;
    }
  }
  return false;
};

// Function to filter database to find values matching wiht userID
const filteredVars = function (userId, userDb) {
  let userURL = {};
  for (const key in userDb) {
    if (userDb[key].userID === userId) {
      userURL[key] = { longURL: userDb[key].longURL };
    }
  }
  return userURL;
}
// Returns a list of urls given id
const urlsForUser = function (id) {
  let urlList = [];
  for (key in urlDatabase) {
    if (id === urlDatabase[key].userID) {
      urlList.push(key)
    }
  }
  return urlList;
}

app.get("/", (req, res) => {
  res.redirect("/login");
  return;
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

app.get("/urls/new", (req, res) => {
  const templateVars = {user: req.session.user_id}
  if (!templateVars.user) {
    res.status(403);
    res.redirect("/login");
    return;
  }
  res.render("urls_new", templateVars);
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

app.get('/urls', (req, res) => {
  const userId = req.session.user_id;
  const user = users[userId];
  // Case where user not logged in
  if (!user) {
    res.status(401).send('Please login or register!');
    return;
  }
  // When user logged in
  const userURL = filteredVars(userId, urlDatabase);
  const templateVars = { urls: userURL, user };
  res.render('urls_index', templateVars);
});

app.get("/urls/:shortURL", (req, res) => {
  const templateVars = { shortURL: req.params.shortURL, longURL: urlDatabase[req.params.shortURL].longURL, user: req.session.user_id}
  const listKeys = Object.keys(urlDatabase);
  const filteredListKeys = Object.keys(filteredVars(templateVars.user ,urlDatabase));
  // Case when user not logged in
  if (!templateVars.user) {
    res.status(401).send('Please login or register!');
    return;
  }
  // Case when url does not exist
  if (!listKeys.includes(req.params.shortURL)) {
    res.status(401).send("That url does not exist!")
    return;
  }
  // Case when url exists but user that is logged in does not own url
  if (!filteredListKeys.includes(req.params.shortURL)) {
    res.status(401).send("This url is not yours to go to");
    return;
  }
  // Case when user owns url
  res.render("urls_show", templateVars);
});

// Function to create new url and redirect you to it
app.post("/urls", (req, res) => {
  const shortURL = generateRandomString()
  urlDatabase[shortURL] = {longURL: req.body.longURL, userID: req.session.user_id};
  res.redirect(`/urls/${shortURL}`);
});

app.get("/u/:shortURL", (req, res) => {
  // Check if url exists in database
  const listKeys = Object.keys(urlDatabase);
  if (listKeys.includes(req.params.shortURL)) {
    const longURL = urlDatabase[req.params.shortURL].longURL;
    res.redirect(longURL);
    return;
  }
  // Case where url does not exist in database
  res.status(400).send('Invalid url');
});

app.get("/urls/:shortURL/delete", (req, res) => {
  const userId = req.session.user_id;
  const user = users[userId];
  // Case when user is not logged in
  if (!user) {
    res.status(401).send("Please login to delete!");
    return;
  }
  // Case when user does not own url
  if (urlDatabase[req.params.shortURL].userID !== userId) {
    res.status(401).send("This is not your url");
    return;
  }
  // Case when user owns url
  delete urlDatabase[req.params.shortURL];
  res.redirect('/urls');
})

app.post("/urls/:shortURL/delete", (req, res) => {
  const userId = req.session.user_id;
  const user = users[userId];
  // Case when user is not logged in
  if (!user) {
    res.status(401).send("Please login to delete");
    return;
  }
  // Case when user does not own url
  if (urlDatabase[req.params.shortURL].userID !== userId) {
    res.status(401).send("This is not your url");
    return;
  }
  // Case when user owns the url
  delete urlDatabase[req.params.shortURL];
  res.redirect('/urls')
});

// Updates the long url
app.post("/urls/:shortURL", (req, res) => {
  urlDatabase[req.params.shortURL].longURL = req.body.longURL;
  res.redirect('/urls')
});

// logout and clear session then redirect to login page
app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect('/login');
})

// When user clicks register button, render urls_register page
app.get('/register', (req, res) => {
  const templateVars = { user: req.session.user_id};
  res.render('urls_register', templateVars);
});

app.post('/register', (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  // hash the password that user inputted
  const hashedPassword = bcrypt.hashSync(password, 10);

  const userFound = findUserByEmail(email, users);
  // Case when user enters empty email or password
  if (email === "" || password === "") {
    res.status(400).send('Empty password or email!');
    return;
  }
  // Case when user already exists
  if (userFound) {
    res.status(401).send('Sorry, that user already exists!');
    return;
  }
  // add new user to database
  const userId = createUser(email, hashedPassword, users);

  req.session.user_id = userId;
  res.redirect('/urls');
});

// When user clicks login button, render urls_login
app.get('/login', (req, res) => {
  const templateVars = {user: req.session.user_id};
  res.render('urls_login', templateVars);
})

// Check if user is in database and log in if entered correct email and pass
app.post('/login', (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  // authenticating User
  const user = authenticateUser(email, password, users);
  if (user) {
    req.session.user_id = user.id;
    res.redirect('/urls');
    return;
  }
  // Case when email exists but password does not match
  const emailCheck = findUserByEmail(email, users);
  if (emailCheck && !user) {
    res.status(403).send('Password does not match!')
    return;
  }
  // case when email does not exist
  res.status(401).send('No user with that email found!');
})