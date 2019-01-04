var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/test',{ useNewUrlParser: true });

//var db = mongoose.connection;

var Schema = mongoose.Schema;

var userSchema = new Schema({
    username: String,
    age: Number,
    email: String,
    password: String,
    photo: String
});

var User = module.exports = mongoose.model('UserCollection', userSchema);

module.exports.createUser = function (user, callback) {
    user.save(callback);
}

module.exports.updateUser = function (id, user, callback) {
    User.updateOne({ _id: id },{$set:user},callback);
}

module.exports.viewUsers = function (callback) {
    User.find(callback);
}

module.exports.findUser = function (input, callback) {
    User.countDocuments(input, callback);
}

module.exports.viewUser = function (id, callback) {
    User.findById(id, callback);
}

module.exports.deleteUser = function (id, callback) {
    User.deleteOne({ _id: id }, callback);
}