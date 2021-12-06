# discourse_submission

Project is incomplete.

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


MySql hosted using AmazonRDS

4 Tables in MySql database:

1. users
2. ads
3. comments
4. sessions

class Db which is used to connect with the database contains 3 functions:

reg() for registration
qo() for queries with output (e.g. getAds, getComments, login)
q() for queries without output (e.g. createAd, createComment)
