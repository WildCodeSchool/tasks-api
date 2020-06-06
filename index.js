const express = require('express');
const cors = require('cors');
const _ = require('lodash');
const app = express();
const uniqid = require('uniqid');
const moment = require('moment');
const Joi = require('@hapi/joi');
const PORT = process.env.PORT || 5000;

const initialTasks = [
  {
    id: uniqid(),
    name: 'be wild',
    done: true,
    createdAt: moment().subtract(3, 'months').format()
  },
  {
    id: uniqid(),
    name: 'begin this workshop',
    done: true,
    createdAt: moment().subtract(1, 'second').format()
  },
  {
    id: uniqid(),
    name: 'finish this workshop',
    done: false,
    createdAt: moment().format()
  }
];

const taskSchema = Joi.object().keys({
  name: Joi.string().min(1).max(30),
  done: Joi.bool().optional(),
});

const tasksByApiKey = {};
const apiKeys = [];

app.use(cors());
app.use(express.json());

const MAX_API_KEYS = 10000;
const MAX_TASK_PER_SESSION = 10;

// To simulate latency
const GET_TASKS_DELAY_MS = 0;
const POST_TASK_DELAY_MS = 0;
const PATCH_TASK_DELAY_MS = 0;
const DELETE_TASK_DELAY_MS = 0;

app.get('/API_KEY', (req, res) => {
  const newApiKey = uniqid();
  apiKeys.push(newApiKey);
  if (apiKeys.length > MAX_API_KEYS) {
    const firstApiKey = apiKeys.shift();
    delete tasksByApiKey[firstApiKey];
  }
  tasksByApiKey[newApiKey] = [...initialTasks];
  res.send(newApiKey);
})

const injectSessionTasks = (req, res, next) => {
  const {API_KEY} = req.params;
  if(!API_KEY || !apiKeys.includes(API_KEY)) {
    res.status(401);
    return res.json({ errorMessage: 'You have to provide a valid API key in the url. Go to /API_KEY to get one'});
  } else {
    req.tasks = tasksByApiKey[req.params.API_KEY];
    next();
  }
}

const router = express.Router();
router.param('API_KEY', injectSessionTasks);
app.use(router);

router.post('/:API_KEY/tasks', (req, res) => {
  setTimeout(() => {
    const {tasks} = req
    let { name, done } = req.body;
    name = _.trim(name.toLowerCase())

    const {error: validationErrors} = taskSchema.validate({name, done}, { abortEarly: false, presence: 'required' });
    if (validationErrors) {
      res.status(400);
      return res.json({ errorMessage: 'provided attributes aren\'t valid', validationErrors });
    }

    const existingTask = _.find(tasks, { name });
    if (existingTask) {
      res.status(400);
      return res.json({ errorMessage: `A task named "${name.toLowerCase()}" already exists on the server` });
    }

    const newTask = { id: uniqid(), name, done: !!done, createdAt: moment().format() };
    tasks.push(newTask);
    // to avoid too much memory use since the API is public
    if (tasks.length > MAX_TASK_PER_SESSION) {
      tasks.shift();
    }
    res.status(201);
    res.json(newTask);
  }, POST_TASK_DELAY_MS);
});

router.get('/:API_KEY/tasks', (req, res) => {
  setTimeout(() => {
    const {tasks} = req
    res.json(tasks);
  }, GET_TASKS_DELAY_MS);
});

const mergeWhenDefined = (propsToMergeIn, target) => {
  Object.keys(propsToMergeIn).forEach(key => {
    if(propsToMergeIn[key] !== undefined) target[key] = propsToMergeIn[key];
  })
}

router.patch('/:API_KEY/tasks/:id', (req, res) => {
  setTimeout(() => {
    const {tasks} = req
    let { done, name } = req.body;
    name = _.trim(name.toLowerCase())
    const { id } = req.params;

    const {error: validationErrors} = taskSchema.validate({name, done}, { abortEarly: false });
    if (validationErrors) {
      res.status(400);
      return res.json({ errorMessage: 'provided attributes aren\'t valid', validationErrors });
    }
    
    const existingTask = _.find(tasks, { id });
    if (existingTask) {
      mergeWhenDefined({name, done}, existingTask)
      res.json(existingTask);
    } else {
      res.sendStatus(404);
    }
  }, PATCH_TASK_DELAY_MS);
});

router.delete('/:API_KEY/tasks/:id', (req, res) => {
  setTimeout(() => {
    const {tasks} = req
    const { id } = req.params;
    const existingTaskIndex = _.findIndex(tasks, { id });
    if (existingTaskIndex >= 0) {
      tasks.splice(existingTaskIndex, 1);
      res.sendStatus(204);
    } else {
      res.sendStatus(404);
    }
  }, DELETE_TASK_DELAY_MS);
});

app.get('/', (req, res) => res.redirect('/API_KEY'));

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));


function logger({ getState, dispatch }) {
  return next => action => {
    dispatch
    console.log('will dispatch', action);
    // Call the next dispatch method in the middleware chain.
    const returnValue = next(action);
    console.log('state after dispatch : ', getState())
    return returnValue;
  }
}