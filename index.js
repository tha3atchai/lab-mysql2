require("dotenv").config();
const mysql = require("mysql2/promise");
const express = require("express");
const notFound = require("./middleware/notFound");
const errorMiddleWare = require("./middleware/errorMiddleWare");
const app = express(); 

app.use(express.json());
app.use(express.urlencoded({extended: false}));

const password = process.env.PASSWORD;

const pool = mysql.createPool({
   host: "localhost",
   user: "root",
   password,
   database: "mysql_todo_list",
   connectionLimit: 10,
});

const targetId = req => req.params.id;

const getTargetUser = async(username) => {
    return await pool.query("SELECT * FROM users u WHERE u.username = ? ", [username]);
};

const registerUser = async(username, password) => {
    try {
        const [{insertId}] = await pool.query("INSERT INTO users (username, password) VALUES (?, ?)", [username, password]);
        const [[newUser]] = await pool.query("SELECT * FROM users u WHERE u.id = ?", [insertId]);
        return newUser;
    }catch (err) {
        console.log(err);
    };
};

const updateUser = (password, id) => {
    pool.query("UPDATE users u SET password = ? WHERE u.id = ?", [password, id]);
};

const createTodo = async(title, completed, userId) => {
    try {
        const [{insertId}] = await pool.query("INSERT INTO todos (title, completed, user_id) VALUES (?, ?, ?)", [title, completed, userId]);
        const [[newTodo]] = await pool.query("SELECT * FROM todos t WHERE t.id = ?", [insertId]);
        return newTodo;
    }catch (err) {
        console.log(err);
    };
};

const getTodo = async(userId) => {
   return pool.query("SELECT * FROM todos t WHERE t.user_id = ?", [userId]); 
};

const deleteTodo = (id) => {
    pool.query("DELETE FROM todos t WHERE t.id = ?", [id]);
}; 

app.use("/register", async(req, res) => {
    const {username, password} = req.body;
    const targetUser = await getTargetUser(username);
    if(targetUser[0].length !== 0){
        res.status(400).send({message: "username is already taken."});
    }else {
        const newUser = await registerUser(username, password);
        res.status(201).send(newUser);
    };
});

app.use("/login", async(req, res) => {
    const {username, password} = req.body;
    const targetUser = await getTargetUser(username);
    console.log(targetUser);
    if(targetUser[0].length === 0){
        res.status(400).send({message: "username or password is wrong."});
    }else {
        if(password === targetUser[0][0].password){
            res.status(201).send({message: "Login success."});
        }else {
            res.status(400).send({message: "username or password is wrong."});
        };
    };
});

app.use("/change-password/:id", async(req, res) => {
    const {password} = req.body;
    const id = targetId(req);
    const targetUser = await pool.query("SELECT * FROM users u WHERE u.id = ?", [id]);
    if(targetUser[0].length !== 0){
        updateUser(password, id);
        res.status(200).send({message: "Updating is success."});
    }else {
        res.status(400).send({message: "User not found."});
    };
});

app.use("/create-todos", async(req, res) => {
    const {title, completed, userId} = req.body;
    const newTodo = await createTodo(title, completed, userId);
    res.status(201).send(newTodo);
});

app.use("/get-todos", async(req, res) => {
    const {userId} = req.body;
    const targetTodo = await getTodo(userId);
    res.status(200).send(targetTodo[0]);
});

app.use("/delete-todos/:id", async(req, res) => {
    const id = targetId(req);
    const targetUser = await pool.query("SELECT * FROM todos t WHERE t.id = ?", [id]);
    if(targetUser[0].length !== 0){
        deleteTodo(id);
        res.status(204).send();
    }else {
        res.status(400).send({message: "Todo not found."});
    };
});

app.use(notFound);
app.use(errorMiddleWare);

const port = process.env.PORT || 8000;

app.listen(port, () => console.log("Server on ", port));