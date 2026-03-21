const jwt = require("jsonwebtoken");
const secret = process.env.SECTER;

function authmiddleare(req,res,next) 
{
    const token = req.headers.token;
    
    if(!token || token.trim().lenght === 0)
    {
        res.status(400).send("User in not signin");
    }

    const verify = jwt.verify(token,secret);
    if(!verify)
    {
        res.status(401).send("User not authticated");
    }

    req.email = verify.email;
    req.org = verify.org;


    next();

}


modules.export = {
    authmiddleare
}