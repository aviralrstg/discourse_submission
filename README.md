# discourse_submission

Project is incomplete.

# Node

Modules used:
express
express-handlebars
express-sessions
mysql
express-mysql-sessions
crypto
path
cookie-parser
body-parser

All nodejs code is in index.js except for handlebar code.

# SQL

MySql hosted using AmazonRDS

4 Tables in MySql database:

1. users
2. ads
3. comments
4. sessions

class Db which is used to connect with the database contains 3 async functions:

1. reg() for registration
2. qo() for queries with output (e.g. getAds, getComments, login)
3. q() for queries without output (e.g. createAd, createComment)
