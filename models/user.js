const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    profession: String,
    location: String,
    avatar: String
});

const User = mongoose.model("User", userSchema);
module.exports = User;
