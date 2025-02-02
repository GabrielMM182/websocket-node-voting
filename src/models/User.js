const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid'); // Importa função para gerar UUID

const UserSchema = new mongoose.Schema({
    userId: { type: String, default: uuidv4, unique: true }, // Gera um UUID automaticamente
    name: { type: String, required: true },
    city: { type: String, required: true }
});

module.exports = mongoose.model('User', UserSchema);
