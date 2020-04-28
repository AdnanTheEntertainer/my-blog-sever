import express from 'express';
import bodyParser from 'body-parser';
import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(express.static(path.join(__dirname, '/build')));
app.use(bodyParser.json());

const withDB = async (operation, res) => {
  try {
    const client = await MongoClient.connect('mongodb://localhost:27017', {
      useNewUrlParser: true,
    });
    const db = client.db('my-blog');
    await operation(db);
    client.close();
  } catch (error) {
    res.status(500).json({ message: 'Error connecting to db', error });
  }
};

app.get('/search', async (req, res) => {
  let rawdata = fs.readFileSync(path.join(__dirname, 'search.json'));
  let student = JSON.parse(rawdata);
  res.status(200).send(student);
});

app.get('/api/article/:name', async (req, res) => {
  const articleName = req.params.name;
  withDB(async (db) => {
    const articleInfo = await db
      .collection('articles')
      .findOne({ name: articleName });
    res.status(200).json(articleInfo);
  }, res);
});

app.post('/api/article/:name/upvote', async (req, res) => {
  const articleName = req.params.name;
  withDB(async (db) => {
    const articleInfo = await db
      .collection('articles')
      .findOne({ name: articleName });
    await db.collection('articles').updateOne(
      { name: articleName },
      {
        $set: {
          upvote: articleInfo.upvote + 1,
        },
      }
    );
    const updateArticleInfo = await db
      .collection('articles')
      .findOne({ name: articleName });
    res.status(200).json(updateArticleInfo);
  }, res);
});

app.post('/api/article/:name/comment', async (req, res) => {
  const { username, text } = req.body;
  const articleName = req.params.name;

  withDB(async (db) => {
    const articleInfo = await db
      .collection('articles')
      .findOne({ name: articleName });
    await db.collection('articles').updateOne(
      { name: articleName },
      {
        $set: {
          comments: articleInfo.comments.concat({ username, text }),
        },
      }
    );
    const updatedArticleInfo = await db
      .collection('articles')
      .findOne({ name: articleName });

    res.status(200).json(updatedArticleInfo);
  }, res);
});

app.get('*', (req, res) => {
  res.sendfile(path.join(__dirname + '/build/index.html'));
});

app.listen(8000, () => {
  console.log('Listing on port 8000');
});
