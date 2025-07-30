const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require('express-rate-limit');
const requestLogger = require('./middleware/logging');
require("dotenv").config();

const tasksRoutes = require("./routes/tasks");
const errorHandler = require("./middleware/errorHandler");
const authRoutes = require('./routes/auth');

const app = express();

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message:{
        success:false,
        error:'too many requests'
    }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message:{
        success:false,
        error:'too many login attempts'
    }
})

app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());
app.use(requestLogger);
app.use(limiter);

app.use("/tasks", tasksRoutes);
app.use("/auth", authLimiter, authRoutes);

app.get("/", (req, res) => {
res.json({message: "todo api is running"});
});

app.use(errorHandler);

module.exports = app;
