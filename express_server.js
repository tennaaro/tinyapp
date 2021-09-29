const express = require("express");
const cookieParser = require('cookie-parser')
const app = express();
const PORT = 8080; // default port 8080
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());

app.set("view engine", "ejs");

const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

const users = { 
  "userRandomID": {
    id: "userRandomID", 
    email: "user@example.com", 
    password: "purple-monkey-dinosaur"
  },
 "user2RandomID": {
    id: "user2RandomID", 
    email: "user2@example.com", 
    password: "dishwasher-funk"
  }
}

function generateRandomString() {
  return Math.random().toString(36).substr(2, 6);
}

const findUserByEmail = function (email, users) {
  for (let userId in users) {
    const user = users[userId];
    if (email === user.email) {
      return user;
    }
  }

  return false;
};

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

  if (userFound && userFound.password === password) {
    return userFound;
  }

  return false;
};


app.get("/", (req, res) => {
  res.send("Hello!");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

app.get("/urls/new", (req, res) => {
  const templateVars = {user: req.cookies["user_id"]}
  res.render("urls_new", templateVars);
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

app.get("/urls", (req, res) => {
  const templateVars = { urls: urlDatabase, user: req.cookies["user_id"] };
  res.render("urls_index", templateVars);
});

app.get("/urls/:shortURL", (req, res) => {
  console.log(req.params);
  const templateVars = { shortURL: req.params.shortURL, longURL: urlDatabase[req.params.shortURL], user: req.cookies["user_id"]}
  res.render("urls_show", templateVars);
});

app.post("/urls", (req, res) => {
  console.log(req.body);  // Log the POST request body to the console
  const shortURL = generateRandomString()
  urlDatabase[shortURL] = req.body.longURL;
  res.redirect(`/urls/${shortURL}`);         // Respond with 'Ok' (we will replace this)
});

app.get("/u/:shortURL", (req, res) => {
  // const longURL = ...
  const longURL = urlDatabase[req.params.shortURL];
  res.redirect(longURL);
});

app.post("/urls/:shortURL/delete", (req, res) => {
  delete urlDatabase[req.params.shortURL];
  res.redirect('/urls')
});

app.post("/urls/:shortURL", (req, res) => {
  urlDatabase[req.params.shortURL] = req.body.longURL;
  res.redirect('/urls')
});

app.post("/logout", (req, res) => {
  res.clearCookie('user_id');
  res.redirect('/login');
})

app.get('/register', (req, res) => {
  const templateVars = { user: req.cookies["user_id"]};
  res.render('urls_register', templateVars);
});

app.post('/register', (req, res) => {
  console.log('req.body:', req.body);
  const email = req.body.email;
  const password = req.body.password;

  const userFound = findUserByEmail(email, users);

  if (email === "" || password === "") {
    res.status(400).send('Empty password or email!');
    return;
  }

  if (userFound) {
    res.status(401).send('Sorry, that user already exists!');
    return;
  }

  const userId = createUser(email, password, users);

  res.cookie('user_id', userId);
  res.redirect('/urls');
});

app.get('/login', (req, res) => {
  const templateVars = {user: req.cookies["user_id"]};
  res.render('urls_login', templateVars);
})

app.post('/login', (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  const user = authenticateUser(email, password, users);
  if (user) {
    res.cookie('user_id', user.id);
    res.redirect('/urls');
    return;
  }

  const emailCheck = findUserByEmail(email, users);
  if (emailCheck && !user) {
    res.status(403).send('Password does not match!')
    return;
  }

  res.status(401).send('No user with that email found!');

})



/*
<% if (user) { %>
      <div>
        <div>
          <%= `Logged in as: ${user.email} `%>
        </div>
        <form class="form-inline" action="/logout" method="POST">
            <button type="submit" class="btn btn-primary">Logout</button>
        </form>
      </div>
      <% } else { %>
        <main style="margin: 1em;">
          <form class="form-inline" action="/login" method="POST">
            <div class="form-group mb-2">
              <label for="longURL">username: </label>
              <input class="form-control" type="text" name="username" placeholder="username"
                style="width: 300px; margin: 1em">
              <button type="submit" class="btn btn-primary">sign in</button>
            </div>
          </form>
        </main>
        <% } %>
*/