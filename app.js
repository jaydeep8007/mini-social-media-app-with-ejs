const express = require('express')
const userModel = require("./models/user.model")
const postModel = require("./models/post.model")
const path = require('path')
const bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');

const cookieParser = require('cookie-parser');
const user = require('./models/user.model');


const app = express()
const port = 3000

app.set('view engine', 'ejs');
// Parse JSON bodies (for JSON API endpoints)
app.use(express.json());

// Parse URL-encoded bodies (for form data)
app.use(express.urlencoded({ extended: true }));

app.use('/static', express.static(path.join(__dirname, 'public')))

app.use(cookieParser())

app.get("/", (req, res) => {
    res.render('index', { foo: "foo" })
})
app.get("/login", (req, res) => {
    res.render('login', { foo: "foo" })
})

app.get("/profile", isLoggedIn, async (req, res) => {
    try {
        const user = await userModel.findOne({ email: req.user.email }).populate('posts');
        res.render('profile', { user });
    } catch (error) {
        console.error("Error fetching user posts:", error);
        res.status(500).send("Server error");
    }
});

app.get("/edit/:id", isLoggedIn, async (req, res) => {
    try {
        const post = await postModel.findOne({ _id: req.params.id }).populate('user')
        res.render('edit', { post });
    } catch (error) {
        console.error("Error fetching user posts:", error);
        res.status(500).send("Server error");
    }
});

app.get("/delete/:id", isLoggedIn, async (req, res) => {
    try {
        const post = await postModel.findOneAndDelete({ _id: req.params.id })
        res.redirect('/profile');
    } catch (error) {
        console.error("Error fetching user posts:", error);
        res.status(500).send("Server error");
    }
});

app.post("/update/:id", isLoggedIn, async (req, res) => {
    try {
        const post = await postModel.findOneAndUpdate({ _id: req.params.id } , {content : req.body.content})
        res.redirect('/profile');
    } catch (error) {
        console.error("Error fetching user posts:", error);
        res.status(500).send("Server error");
    }
});

app.get("/like/:id", isLoggedIn, async (req, res) => {
    try {
        const post = await postModel.findOne({ _id: req.params.id }).populate('user')

        if (post.likes.indexOf(req.user.userid) === -1){
            post.likes.push(req.user.userid)

        }

        else{
            post.likes.splice(post.likes.indexOf(req.user.userid) , 1)
        }
// console.log(req.user.userid)
        await post.save()
        res.redirect('/profile');
    } catch (error) {
        console.error("Error fetching user posts:", error);
        res.status(500).send("Server error");
    }
});



app.post("/post", isLoggedIn, async (req, res) => {
    let user = await userModel.findOne({ email: req.user.email })
    let { content } = req.body
    let post = await postModel.create({

        user: user._id,
        content
    })
    user.posts.push(post._id)
    await user.save()
    res.redirect("/profile")

})



// app.post("/login", async (req, res) => {
//     const { email, password } = req.body

//     let user = await userModel.findOne({ email })
//     if (!user) return res.status(500).send("incorrect credentials")

//     bcrypt.compare(password, user.password, function (err, result) {
//         if (result) {
//             var token = jwt.sign({ email: user.email, userid: user._id }, 'shhhhh');
//             res.cookie("token", token)

//             res.status(200).redirect("/profile")
//         }
//         // else res.redirect("/login")
//         else res.status(500).send("incorrect credentials")
//         console.log(result)
//     });


// })


app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(400).send("Incorrect credentials");
        }

        bcrypt.compare(password, user.password, function (err, result) {
            if (err) {
                return res.status(500).send("Error comparing passwords");
            }

            if (result) {
                var token = jwt.sign({ email: user.email, userid: user._id }, 'shhhhh');
                res.cookie("token", token);
                return res.status(200).redirect("/profile");
            } else {
                return res.status(400).send("Incorrect credentials");
            }
        });
    } catch (error) {
        console.error("Error during login:", error);
        return res.status(500).send("Server error");
    }
});

app.post("/register", async (req, res) => {
    const { name, username, email, password, age } = req.body

    // dont forgot to add async await in this 
    let user = await userModel.findOne({ email })
    if (user) return res.status(500).send("User Already register")

    bcrypt.genSalt(10, function (err, salt) {
        bcrypt.hash(password, salt, async function (err, hash) {
            let user = await userModel.create({
                name,
                username,
                email,
                password: hash,
                age
            })


            var token = jwt.sign({ email: user.email, userid: user._id }, 'shhhhh');
            res.cookie("token", token)
            res.send(user)
        });
    });





})


app.get("/logout", (req, res) => {

    res.cookie("token", "")
    res.redirect("/login")
})


function isLoggedIn(req, res, next) {
    if (req.cookies.token === "") res.send("You must be logged in")
    else {
        // verify a token symmetric - synchronous
        let data = jwt.verify(req.cookies.token, 'shhhhh');
        req.user = data
        console.log(data) // bar

    }
    next()
}
app.get("/logout", (req, res) => {
    res.cookie("token", "")
    res.redirect("/login")
})


app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})