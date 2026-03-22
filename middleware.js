const jwt = require("jsonwebtoken");
const secret = process.env.SECTER;

function authmiddleare(req, res, next) {
    const token = req.headers.token;

    if (!token || String(token).trim().length === 0) {
        return res.status(400).send("User in not signin");
    }

    try {
        const verify = jwt.verify(token, secret);
        req.email = verify.email;
        req.org = verify.org;
        next();
    } catch {
        return res.status(401).send("User not authticated");
    }
}

module.exports = {
    authmiddleare,
};