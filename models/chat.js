const mongoose = require("mongoose");
const { encrypt, decrypt } = require("../utils/crypto");

const chatSchema = new mongoose.Schema({
    from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    msg: { type: String, required: false },
    media: String,
    status: { type: String, enum: ['sent', 'delivered', 'seen'], default: 'sent' },
    created_at: { type: Date, default: Date.now }
});

chatSchema.pre('save', function (next) {
    if (this.isModified('msg')) {
        this.msg = encrypt(this.msg);
    }
    next();
});

chatSchema.methods.getDecrypted = function () {
    const obj = this.toObject();
    obj.msg = this.msg ? decrypt(this.msg) : '';
    return obj;
};

const Chat = mongoose.model("Chat", chatSchema);
module.exports = Chat;
