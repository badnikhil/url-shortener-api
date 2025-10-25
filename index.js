const express = require('express');
const mongoose = require('mongoose');
const validUrl = require('valid-url');
const shortid = require('shortid');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/urlShortener')
.then(() => console.log('MongoDB connected...'))
.catch(err => console.error('MongoDB connection error:', err));

// Define URL Schema
const urlSchema = new mongoose.Schema({
  originalUrl: {
    type: String,
    required: true,
    trim: true
  },
  shortUrl: {
    type: String,
    required: true,
    unique: true,
    default: shortid.generate
  },
  hits: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create URL model
const Url = mongoose.model('Url', urlSchema);

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to URL Shortener API' });
});

// Create short URL
app.post('/api/shorten', async (req, res) => {
  const { originalUrl } = req.body;

  // Check if URL is valid
  if (!validUrl.isUri(originalUrl)) {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  try {
    // Check if URL already exists in database
    let url = await Url.findOne({ originalUrl });

    if (url) {
      return res.json(url);
    }

    // Create new URL document
    const shortUrl = shortid.generate();
    
    url = new Url({
      originalUrl,
      shortUrl
    });

    await url.save();
    res.json(url);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Redirect to original URL
app.get('/:shortUrl', async (req, res) => {
  try {
    const url = await Url.findOneAndUpdate(
      { shortUrl: req.params.shortUrl },
      { $inc: { hits: 1 } },
      { new: true }
    );

    if (url) {
      return res.redirect(url.originalUrl);
    } else {
      return res.status(404).json({ error: 'URL not found' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get URL stats
app.get('/api/stats/:shortUrl', async (req, res) => {
  try {
    const url = await Url.findOne({ shortUrl: req.params.shortUrl });
    
    if (url) {
      return res.json({
        originalUrl: url.originalUrl,
        shortUrl: url.shortUrl,
        hits: url.hits,
        createdAt: url.createdAt
      });
    } else {
      return res.status(404).json({ error: 'URL not found' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});