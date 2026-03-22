require("dotenv").config();
const path = require("path");
const express = require("express");
const { authmiddleare } = require("./middleware");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 4000;
const secret = process.env.SECTER;

const Users = [];
const Organisation = [];
const Task = [];

app.use(express.json());
app.use(express.static(path.join(__dirname, "frontend")));

function orgsForUser(email) {
    return Organisation.filter((org) => org.user.includes(email));
}


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

    const userOrg = orgsForUser(email);

    res.status(201).send({
        message: "user signed in",
        orglength: userOrg.length,
        org: userOrg,
    });
});


// ---------------------------- org apis -----------------------------------

app.post("/userOrg", (req, res) => {
    const { email, password } = req.body;
    const existingUser = Users.find(
        (user) => user.email === email && user.password === password
    );
    if (!existingUser) {
        res.status(400).send("user did not exist");
        return;
    }

    const userOrg = orgsForUser(email);

    res.status(201).send({
        message: "orgs for user",
        org: userOrg,
    });
});

app.post("/org-login", (req, res) => {
    const email = req.body.email;
    const orgid = req.body.orgid;

    const existingUser = Users.find((user) => user.email === email);
    const org = Organisation.find((o) => o.id === orgid);
    if (!existingUser || !org || !org.user.includes(email)) {
        res.status(400).send("Invalid data");
        return;
    }
    

    const data = {
        email,org:orgid
    }

    const token = jwt.sign(data,secret);

    res.status(201).send({
        token: token,
    });
});

app.post("/new-org", (req, res) => {
    const { email, orgname, description } = req.body;
    if (!email || !orgname) {
        res.status(400).send("email and orgname required");
        return;
    }
    const existingUser = Users.find((user) => user.email === email);
    if (!existingUser) {
        res.status(400).send("user did not exist");
        return;
    }
    const existingorg = Organisation.find((org) => org.name === orgname);
    if (existingorg) {
        res.status(400).send("Organization already exists");
        return;
    }

    const neworg = {
        id: String(Date.now()),
        name: orgname,
        description: description || "",
        user: [email],
    };

    Organisation.push(neworg);

    res.status(201).send({
        message: "Organization created successfully",
        org: neworg,
    });
});

app.post("/added-member", (req, res) => {
    const {memberemail,orgid} = req.body;

    const idx = Organisation.findIndex((org) => org.id === orgid);
    if (idx === -1) {
        res.status(400).send("org not found");
        return;
    }
    Organisation[idx].user.push(memberemail);

    res.status(201).send({
        message: "added user to org",
    });
});

app.get("/org", authmiddleare, (req, res) => {
    const org = Organisation.find((o) => o.id === req.org);
    if (!org) {
        res.status(400).send("Invalid data");
        return;
    }
    res.status(200).send({ org });
});

// --------------------- Task apis --------------------------------

app.get("/task", authmiddleare, (req, res) => {
    const orgid = req.org;

    const existingorg = Organisation.find(org => org.id === orgid);
    if(!existingorg)
    {
        res.status(400).send("Invalid data");
        return;
    }

    const all_task = Task.filter((t) => t.orgid === orgid);

    res.status(201).send({
        task: all_task,
    });
});

app.post("/new-task", authmiddleare, (req, res) => {
    const orgid = req.org;
    const {title,discription,status} = req.body;

    const existingorg = Organisation.find(org => org.id === orgid);
    if(!existingorg)
    {
        res.status(400).send("Invalid data");
        return;
    }

    const newtask = {
        id: String(Date.now()),
        orgid,
        title,
        discription,
        status,
    };

    Task.push(newtask);

    res.status(201).send({
        message:"Task added successfully",
        task : newtask
    })
})

app.patch("/task-move", authmiddleare, (req, res) => {
    const orgid = req.org;
    const {id,status} = req.body;

    const existingorg = Organisation.find(org => org.id === orgid);
    if(!existingorg)
    {
        res.status(400).send("Invalid data");
        return;
    }

    const idx = Task.findIndex((t) => t.id === id);
    if (idx === -1) {
        res.status(400).send("task not found");
        return;
    }
    Task[idx].status = status;

    res.status(201).send({
        message: "tasked moved successfully",
    });
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

app.get("/signin", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend", "signin.html"));
});

app.get("/signup", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend", "signup.html"));
});


app.listen(PORT,()=>{
    console.log("app is listning on port",PORT);
})