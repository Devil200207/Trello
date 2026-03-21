require("dotenv").config();
const express = require("express");
const {authmiddleare} = require("./middleware");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 4000;
const secret = process.env.SECTER;

const Users = [];
const Organisation = [];
const Task = []

app.use(express.json());


// ----------------------- auth apis ---------------------------------

app.post("/signup",(req,res)=>{
    const email = req.body.email;
    const password = req.body.password;

    const existingUser = Users.find((user)=> user.email === email);
    if(existingUser)
    {
        res.status(400).send("User already exist");
        return;
    }

    const newUser = {
        email,password
    }

    Users.push(newUser);
    res.status(200).send("User signedup successfully");
});

app.post("/signin",(req,res)=>{
    const email = req.body.email;
    const password = req.body.password;

    const existingUser = Users.find((user)=> user.email === email && user.password === password);
    if(!existingUser)
    {
        res.status(400).send("user cred invalid or user not exist");
        return;
    }

    const userOrg = Organisation.filter((org)=> org.user.find((user) =>{ user === email}));

    res.status(201).send({
        message: "user signed up",
        orglength: userOrg.length
    });

});


// ---------------------------- org apis -----------------------------------

app.post("/userOrg",(req,res)=>{
    const email = req.body.email;
    const existingUser = Users.find((user)=> user.email === email && user.password === password);
    if(!existingUser)
    {
        res.status(400).send("user did not exist");
        return;
    }

    const userOrg = Organisation.filter((org)=> org.user.find((user) =>{ user === email}));

    res.status(201).send({
        message: "user signed up",
        org: userOrg
    });
})


app.post("org-login",(req,res)=>{
    const email = req.body.email;
    const orgid = req.body.orgid;

    const existingUser = Users.find((user)=> user.email === email);
    const org = Organisation.find(org => org.id === orgid);
    if(!existingUser || !org)
    {
        res.status(400).send("Invalid data");
        return;
    }
    

    const data = {
        email,org:orgid
    }

    const token = jwt.sign(data,secret);

    res.status(201).send({
        token:token
    });
})



// --------------------- Task apis --------------------------------

app.get("/task",authmiddleare,(req,res)=>{
    const orgid = req.org;

    const existingorg = Organisation.find(org => org.id === orgid);
    if(!existingorg)
    {
        res.status(400).send("Invalid data");
        return;
    }

    const all_task = Task.filter((t) => t.orgid === orgid);

    res.status(201).send({
        task:all_task
    })
})

app.post("new-task",authmiddleare,(req,res)=>{
    const orgid = req.org;
    const {title,discription,status} = req.body;

    const existingorg = Organisation.find(org => org.id === orgid);
    if(!existingorg)
    {
        res.status(400).send("Invalid data");
        return;
    }

    const newtask = {
        id:new Date().toString(),
        orgid,
        title,
        discription,
        status
    };

    Task.push(newtask);

    res.status(201).send({
        message:"Task added successfully",
        task : newtask
    })
})

app.patch("/task-move",authmiddleare,(req,res)=>{
    const orgid = req.org;
    const {id,status} = req.body;

    const existingorg = Organisation.find(org => org.id === orgid);
    if(!existingorg)
    {
        res.status(400).send("Invalid data");
        return;
    }

    const idx = Task.findIndex(t => t.id === id);
    Task[idx].status = status;

    res.status(201).send({
        message:"tasked moved successfully"
    })
})



app.get("/signup",(req,res)=>{

    res.sendFile("/Volumes/T7 Shield/pratics/trello/frontend/signup.html");
})


app.listen(PORT,()=>{
    console.log("app is listning on port",PORT);
})