const mongoose = require("mongoose");
const Chat = require("./models/chats.js");

main().then(()=>{
    console.log("connection successful");
})
.catch((err) => console.log(err));

async function main() {
    await mongoose.connect('mongodb://127.0.0.1:27017/whatsapp');
}

let allChats= [
    {
        from:"EFG",
        to:"DEF",
        msg:"Helloo..",
        created_at: new Date(),
    },
    {
        from:"GHI",
        to:"JKL",
        msg:"HI...",
        created_at: new Date(),
    },
    {
        from:"MNO",
        to:"PQR",
        msg:"What are you doing?",
        created_at: new Date(),
    },
    {
        from:"STU",
        to:"VWX",
        msg:"What is your name?",
        created_at: new Date(),
    },
    {
        from:"YZQ",
        to:"HJS",
        msg:"Helloo..where are you??",
        created_at: new Date(),
    },
    {
        from:"KIU",
        to:"OUY",
        msg:"How are you..",
        created_at: new Date(),
    },
];

Chat.insertMany(allChats);






