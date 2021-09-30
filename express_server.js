const express = require("express");
const cookieParser = require('cookie-parser')
const app = express();
const PORT = 8080; // default port 8080
const bodyParser = require("body-parser");
const bcrypt = require('bcryptjs');
const salt = bcrypt.genSaltSync(10);


app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());

app.set("view engine", "ejs");

/*
const urlDatabase = {

  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};
*/

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
  //console.log(userFound)
  //console.log(bcrypt.compareSync(password, userFound.password))
  if(userFound) {
    if (bcrypt.compareSync(password, userFound.password)) {
      return userFound;
    }
  }

  /*
  if (userFound && userFound.password === password) {
    return userFound;
  }
  */

  return false;
};

const filteredVars = function (userId, userDb) {
  let userURL = {};
  for (const key in userDb) {
    if (userDb[key].userID === userId) {
      userURL[key] = { longURL: userDb[key].longURL };
    }
  }
  return userURL;
}

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
  res.send("Hello!");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

app.get("/urls/new", (req, res) => {
  const templateVars = {user: req.cookies["user_id"]}
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
  const userId = req.cookies['user_id'];
  const user = users[userId];

  if (!user) {
    res.status(401).send('Please login or register!');
    return;
  }

  // get only urls matching userId
  const userURL = filteredVars(userId, urlDatabase);

  const templateVars = { urls: userURL, user };
  res.render('urls_index', templateVars);
});

app.get("/urls/:shortURL", (req, res) => {
  const templateVars = { shortURL: req.params.shortURL, longURL: urlDatabase[req.params.shortURL], user: req.cookies["user_id"]}
  if (!templateVars.user) {
    res.status(401).send('Please login or register!');
  }
  res.render("urls_show", templateVars);
});

app.post("/urls", (req, res) => {
  console.log(req.body);  // Log the POST request body to the console
  const shortURL = generateRandomString()
  urlDatabase[shortURL] = {longURL: req.body.longURL, userID: req.cookies["user_id"]};
  console.log(urlDatabase);
  res.redirect(`/urls/${shortURL}`);         // Respond with 'Ok' (we will replace this)
});

app.get("/u/:shortURL", (req, res) => {
  // const longURL = ...
  const listKeys = Object.keys(urlDatabase);
  if (listKeys.includes(req.params.shortURL)) {
    const longURL = urlDatabase[req.params.shortURL].longURL;
    res.redirect(longURL);
    return;
  }
  res.status(400).send('Invalid url');
});

app.get("/urls/:shortURL/delete", (req, res) => {
  const userId = req.cookies["user_id"];
  const user = users[userId];
  if (!user) {
    res.status(401).send("Please login to delete!");
    return;
  }
  if (urlDatabase[req.params.shortURL].userID !== userId) {
    res.status(401).send("This is not your url");
    return;
  }
  delete urlDatabase[req.params.shortURL];
  res.redirect('/urls');
})

app.post("/urls/:shortURL/delete", (req, res) => {
  const userId = req.cookies['user_id'];
  const user = users[userId];
  //let urls = urlsForUser(userId);
  //console.log(urls);
  if (!user) {
    res.status(401).send("Please login to delete");
    return;
  }
  if (urlDatabase[req.params.shortURL].userID !== userId) {
    res.status(401).send("This is not your url");
    return;
  }
  delete urlDatabase[req.params.shortURL];
  res.redirect('/urls')
});

app.post("/urls/:shortURL", (req, res) => {
  urlDatabase[req.params.shortURL].longURL = req.body.longURL;
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
  const hashedPassword = bcrypt.hashSync(password, 10);

  const userFound = findUserByEmail(email, users);

  if (email === "" || password === "") {
    res.status(400).send('Empty password or email!');
    return;
  }

  if (userFound) {
    res.status(401).send('Sorry, that user already exists!');
    return;
  }

  const userId = createUser(email, hashedPassword, users);

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