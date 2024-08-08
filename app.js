if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}


const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const ejsMate = require('ejs-mate');
const session = require('express-session');
const flash = require('connect-flash');
const ExpressError = require('./utils/ExpressError');
const methodOverride = require('method-override');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require('./models/user');
const Student= require('./smodels/student');

const userRoutes = require('./routes/users');
const centreRoutes = require('./routes/centres');
const reviewRoutes = require('./routes/reviews');

const dbUrl = process.env.MONGODB_URI
// process.env.DB_URL

// 'mongodb://127.0.0.1:27017/STUDENTS'
mongoose.connect(dbUrl)
.then(()=>{console.log("Mongoose Connection open!!!")})
.catch(err=>{
    console.log('Oh No!! mongoose connection error!!');
    console.log(err)
});

const app = express();

app.engine('ejs', ejsMate)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'))

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
// app.use(express.static(path.join(__dirname, 'public')))
app.use(express.static(__dirname + '/public/'));

const sessionConfig = {
    secret: 'thisshouldbeabettersecret!',
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}

app.use(session(sessionConfig))
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    console.log(req.session)
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
})


app.use('/', userRoutes);
app.use('/centres', centreRoutes)
app.use('/centres/:id/reviews', reviewRoutes)


app.get('/', (req, res) => {
    res.render('home')
});



const centres=['IITISM','IITD','IITB','IITBHU']

app.get('/students', async(req, res) => {
    const {centre} = req.query;
    if(centre){
      const students = await Student.find({centre})
      res.render('students/index',{students,centre})
    }else{
        const students = await Student.find({})
        res.render('students/index',{students,centre:'All'})
    }
});

app.get('/students/new',(req,res)=>{
    res.render('students/new',{centres})
})   

app.post('/students',async (req,res)=>{
    const newStudent = new Student(req.body)
    await newStudent.save();
    res.redirect(`/students/${newStudent._id}`)
})

app.get('/students/:id', async (req, res) => {
    const {id} = req.params;
    const student = await Student.findById(id);
    res.render('students/show',{student})})

app.get('/students/:id/edit',async(req,res)=>{
    const {id} = req.params;
    const student = await Student.findById(id);
    res.render('students/edit',{student, centres})
})  

app.put('/students/:id',async(req,res)=>{
    const {id} = req.params;
    const student = await Student.findByIdAndUpdate(id, req.body, {runValidators:true , new:true});
    res.redirect(`/students/${student._id}`);
})
 
app.delete('/students/:id',async(req,res)=>{
    const {id} = req.params;
    const deleteStudent = await Student.findByIdAndDelete(id);
    res.redirect('/students');
})





app.all('*', (req, res, next) => {
    next(new ExpressError('Page Not Found', 404))
})

app.use((err, req, res, next) => {
    const { statusCode = 500 } = err;
    if (!err.message) err.message = 'Oh No, Something Went Wrong!'
    res.status(statusCode).render('error', { err })
})

app.listen(3000, () => {
    console.log('Serving on port 3000')
})


