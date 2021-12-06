const path = require('path')
const express = require('express')
const session = require('express-session')
const app = express()
const port = process.env.APP_PORT
const bodyParser = require('body-parser')
const cookieParser = require("cookie-parser");
const crypto =require("crypto")
const MySqlStore = require('express-mysql-session')(session)
const mysql = require('mysql')
const exphbs = require('express-handlebars')
require('dotenv').config()

app.set('views', './views')
app.engine('.hbs', exphbs.engine({defaultLayout : 'loggedin', extname: '.hbs',}))
app.set('view engine', '.hbs')

//DB setup

let instance = null;

const options = {
  host     : process.env.DB_HOST,
  user     : process.env.DB_USER,
  password : process.env.DB_PASS,
  port     : process.env.PORT,
  database : process.env.DB_PORT,
  //convert password stored as binary blobs to string
  typeCast : function (field, next)  {
    if (field.type == 'VAR_STRING') {
        return field.string();
    }
    return next();
  }
}

const pool = mysql.createPool(options)

let query = null
class Db {
  static getDbInstance() {
      return instance ? instance : new Db();
  }

  async qo(input){
    try {
      const response = await new Promise((resolve, reject) => {
        
        switch(input['query']){
          case 'getUser':
            query = 'SELECT * FROM `users` WHERE `id` = ' + input['user_id'] + ';'
            break;
          case 'getAllAds':
            query = 'SELECT * FROM `ads` WHERE `published` = 1;'
            break;
          case 'login':
            query = 'SELECT CONVERT(`password` USING utf8) AS Password, `username`, `email`, `id` FROM `users` WHERE `username` = \'' + input['username'] + '\';'
            break;
          case 'getAdsByUser':
            query = 'SELECT * FROM `ads` WHERE `user_id` = ' + input['user_id'] + ';'
            break;
          case 'getAd':
            query = 'SELECT * FROM `ads` WHERE `ad_id` = ' + input['ad_id'] + ';'
          case 'getComments':
            query = 'SELECT * FROM `comments` WHERE `ad_id` = ' + input['ad_id'] + ';'
            break;
        }
        console.log(query)

        pool.getConnection((err,connection) =>{
          if (err) {
            connection.release();
            throw err;
          }   
          connection.query(query, (err, results) => {
              if (err) reject(new Error(err.message));
              console.log('Query result:' + results)
              resolve(results);
          })
        })
        
      });
      return response;      
    } catch (error) {
        console.log(error);
    }
  }

  async q(input){
    try {
      const response = await new Promise((resolve, reject) => {
        console.log(input)
        switch(input['query']){
          case 'createAd':
            query = 'INSERT into `ads` (`user_id`, `title`, `data`)  VALUES (' + input['user_id'] + ', \'' + input['title'] + '\' , \'' + input['data'] + '\' );'
            break;
          case 'publishAd':
            query = 'UPDATE `ads` SET published = 1 WHERE id = ' + input['ad_id'] + ';'
            break;
          case 'editAd':
            query = 'UPDATE `ads` SET data = \'' + input['data'] + '\' WHERE id = ' + input['ad_id'] + ';'
            break;
          case 'deleteAd':
            query = 'DELETE FROM `ads` WHERE id = ' + input['ad_id'] + ';'
            break;
          case 'createComment':
            query = 'INSERT into `comments` (`ad_id`, `user_id`, `data`)  VALUES ( ' + input['ad_id'] + ',' + input['user_id'] + ', \'' + input['data'] + '\');'
            break;
        }
      
        console.log(query)

        pool.getConnection((err,connection) =>{
          if (err) {
            connection.release();
            throw err;
          }   
          connection.query(query, (err, results) => {
              if (err) reject(new Error(err.message));
              console.log(results)
              resolve(results);
          })
        })
      });
      return response;      
    } catch (error) {
        console.log(error);
    }
  }

  async reg(input){
    try {
      const response = await new Promise((resolve, reject) => {

        query = 'INSERT into `users` (`email`, `password`, `username`) VALUES ( \'' + input['email'] + '\' , \'' + input['password'] + '\' , \'' + input['username'] +'\' );'  
        
        console.log(query)
        pool.getConnection((err,connection) =>{
          if (err) {
            connection.release();
            throw err;
          }   
          connection.query(query, (err, results) => {
              if (err) reject(new Error(err.message));
              resolve(results);
          })
        })
      });
      return true;      
    } catch (error) {
        console.log(error);
        return false;
    }
      
  }
}

const sessionStore = new MySqlStore(options, pool)

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

const day = 1000 * 60 * 60 * 24

app.use(session({
  secret: 'dBmxPAaJUv3MuT3t2sN8j5QeuW17FCJe',
  saveUninitialized: false,
  cookie: { maxAge: day },
  resave: false,
  store : sessionStore,
}))
app.use(cookieParser());

//Routes
app.post('/login', (req, res) => {
  console.log(req.session)
  let password = req.body.password
  password = crypto.createHash("sha256").update(password).digest("hex")
  password = crypto.createHash("sha256").update(password).digest("hex")

  const dbI = Db.getDbInstance()
  const result = dbI.qo({
    'query' : 'login', //get user by username
    'username' : req.body.username
  })
  result
    .then((r) => {
      if (r.length >= 1){
        savedPass = r[0]['Password']

        if(savedPass===password){
          req.session.user_id = r[0]['id']
          console.log(req.session)
          console.log('Redirecting to /dashboard')
          return res.redirect('/dashboard')
        } else {
          return res.send('Incorrect Password')
        }
      } else {
        return res.send('Username not found')
      }

    })
})

app.post('/register', (req, res) => {
  const username = req.body.username
  const email = req.body.email
  let password = req.body.password

  password = crypto.createHash("sha256").update(password).digest("hex")
  password = crypto.createHash("sha256").update(password).digest("hex")

  const dbI = Db.getDbInstance();
  const result =  dbI.reg({
    'email' : email,
    'password' : password,
    'username' : username
    });
  result
  .then((r) => {
    if (r == true){
      res.send('Registration Successful. Please Login')
    }else{
      res.send('There was a problem, please try again')
    }
  })
  
})

app.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if(err){
      console.log('Logout failed. Redirecting to Logout')
      return res.redirect('/dashboard')
    }
    sessionStore.close()
    res.clearCookie()
    res.redirect('/')
  })
})

app.post('/ad', (req, res) => {
  const { user_id } = req.session
  const dbI = Db.getDbInstance();
  const result = dbI.q({
    'query' : 'createAd',
    'user_id' : user_id,
    'data' : req.body.ad_data,
    'title' : req.body.ad_title
  })
  result
  .then((r) => {
    console.log(r)
  })
  res.status(204).send()
})

app.get('/ads', (req, res) => {
  const dbI = Db.getDbInstance();
  const result = dbI.q({
    'query' : 'getAllAds'
  })
  result
  .then((r) => {
    console.log(r)
  })
})

app.get('/ad/:id', (req, res) => {
  const dbI = Db.getDbInstance();
  const result = dbI.qo({
    'query' : 'getAd',
    'ad_id' : req.params.id
  })
  result
  .then((r) => {
    console.log(r)
    res.json(r)
  })
})

app.post('/ad/:id', (req, res) => {
  const dbI = Db.getDbInstance();
  const result = dbI.q({
    'query' : 'editAd',
    'title' : req.body.title,
    'data' : req.body.data,
    'published' : req.body.published
  })
  result
  .then((r) => {
    console.log(r)
  })
})

app.post('/comment', (req, res) => {
  const { user_id } = req.session
  const dbI = Db.getDbInstance();
  const result = dbI.q({
    'query' : 'createComment',
    'user_id' : user_id,
    'ad_id' : req.body.ad_id,
    'data' : req.body.data
  })
  result
  .then((r) => {
    console.log(r)
  })
  res.status(204).send()
})

app.get('/dashboard', (req,res) => {
  const { user_id } = req.session
  if (user_id != undefined) {
    try{
      const dbI = Db.getDbInstance()
      const result = dbI.qo({
        'query' : 'getUser',
        'user_id' : user_id
      })
      result
        .then(async(r) => {
          if(r != undefined){
            //user exists
            
            let ads = await dbI.qo({
              'query' : 'getAllAds'
            })
            let comments= []
            ads.forEach(async(e) => { 
                          
              let i = await dbI.qo({
                'query' : 'getComments',
                'ad_id' : e['id']
              })
              comments.push(i)
            })
            console.log(comments)
            res.render('dashboard',{
              layout: 'loggedin',
              ads,
              comments
            })
          } else {
            res.redirect('/')
          }        
        })
    } catch(err) {
      console.log(err)
      res.sendStatus(404)
    }
  } else {
    console.log('Redirecting to /')
    res.redirect('/')
  }
})

app.get('/getAllAds', (req,res) => {
  console.log(req.session)
  const dbI = Db.getDbInstance();

  const result = dbI.qo({
    'query' :'getAllAds'
  })
  result
  .then(data => res.json({data}))
})
app.get('/feed', (req,res) => {
  console.log(req.session)
  const dbI = Db.getDbInstance();

  const result = dbI.qo({
    'query' :'getAllAds'
  })
  result
  .then(data => res.json({data}))
})
app.get('/', (req,res) => {
  console.log(req.session)
  const { user_id } = req.session
  if (user_id != undefined) {
    try{
      const dbI = Db.getDbInstance()
      const result = dbI.qo({
        'query' : 'getUser',
        'user_id' : user_id
      })
      result
        .then((r) => {
          // console.log(r)
          if(r != undefined){
            res.redirect('/dashboard')
          } else {
            res.render('home',{
              layout : 'loggedout'
            })
          }
          
        })
    } catch(err) {
      console.log(err)
      res.sendStatus(404)
    }
  } else {
    res.render('home',{
      layout : 'loggedout'
    })
  }
})

app.get('/login', (req, res) => {
  console.log(req.session)
  res.render('login', {
    layout : 'loggedout'
  })
})

app.get('/register', (req, res) => {
  res.render('register', {
    layout : 'loggedout'
  })
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))