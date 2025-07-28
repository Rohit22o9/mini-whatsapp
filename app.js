const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcrypt');
const User = require('./models/user');
const Chat = require('./models/chat');
const path = require('path');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const multer = require('multer');
const fs = require('fs');
require('dotenv').config();

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log("MongoDB Atlas connected successfully!");
}).catch((err) => {
    console.error("MongoDB connection error:", err);
});


// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

app.use(session({
    secret: 'mini-whatsapp-secret',
    resave: false,
    saveUninitialized: true,
}));

// Multer for profile photo upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, 'public', 'avatars');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({ storage });

// Routes
app.get('/', (req, res) => res.redirect('/login'));

app.get('/login', (req, res) => res.render('login'));

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (user && await bcrypt.compare(password, user.password)) {
        req.session.userId = user._id;
        res.redirect('/dashboard');
    } else {
        res.send('Invalid credentials');
    }
});

app.get('/signup', (req, res) => res.render('signup'));

app.post('/signup', upload.single('avatar'), async (req, res) => {
    const { username, password, profession, location } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    let avatarPath = req.file ? '/avatars/' + req.file.filename : '';

    const newUser = new User({ username, password: hashedPassword, profession, location, avatar: avatarPath });
    await newUser.save();
    res.redirect('/login');
});

app.get('/dashboard', async (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    const users = await User.find({ _id: { $ne: req.session.userId } });
    const currentUser = await User.findById(req.session.userId);
    res.render('dashboard', { users, currentUser });
});

app.post('/startchat', async (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    const receiverId = req.body.to;
    const receiverExists = await User.findById(receiverId);
    if (!receiverExists) return res.send("User not found");
    res.redirect(`/chat/${receiverId}`);
});

app.get('/chat/:id', async (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    const otherUser = await User.findById(req.params.id);
    const currentUser = await User.findById(req.session.userId);
    if (!otherUser || !currentUser) return res.send("User not found!");

    const chats = await Chat.find({
        $or: [
            { from: currentUser._id, to: otherUser._id },
            { from: otherUser._id, to: currentUser._id }
        ]
    }).sort({ created_at: 1 });

    res.render('chat', { otherUser, currentUser, chats });
});

app.post('/chat/:id', async (req, res) => {
    const from = req.session.userId;
    const to = req.params.id;
    const msg = req.body.msg;
    await Chat.create({ from, to, msg, status: 'sent' });
    res.redirect(`/chat/${to}`);
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/login'));
});

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('joinRoom', (roomId) => {
        socket.join(roomId);
        console.log(`User joined room: ${roomId}`);
    });

    socket.on('chat message', async (data) => {
        const newChat = await Chat.create({
            from: data.from,
            to: data.to,
            msg: data.msg,
            status: 'sent'
        });

        const messageData = {
            ...data,
            _id: newChat._id,
            status: newChat.status
        };

        io.to(data.roomId).emit('chat message', messageData);
    });

    socket.on('message delivered', async ({ messageId }) => {
        try {
            await Chat.findOneAndUpdate(
                { _id: messageId },  // ✅ Correctly using the string ID
                { status: 'delivered' }
            );
        } catch (err) {
            console.error('Error updating message status:', err);
        }
    });
    

    socket.on('messages seen', async (data) => {
        await Chat.updateMany({
            from: data.to,
            to: data.from,
            status: { $ne: 'seen' }
        }, {
            $set: { status: 'seen' }
        });
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

const os = require('os');

// Get local IP address
const networkInterfaces = os.networkInterfaces();
let localIp;
for (let iface of Object.values(networkInterfaces)) {
    for (let i of iface) {
        if (i.family === 'IPv4' && !i.internal) {
        localIp = i.address;
        break;
        }
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
