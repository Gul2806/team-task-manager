require('dotenv').config();
const express = require('express');
const app = express();

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(process.env.PORT, () => console.log('Server on ' + process.env.PORT));