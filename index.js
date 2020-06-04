const express = require('express');
const cors = require('cors');
const _ = require('lodash');
const app = express();
const uniqid = require('uniqid');
const moment = require('moment');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const PORT = process.env.PORT || 5000;

const swaggerOptions = {
  definition: {
    swagger: '2.0',
    info: {
      title: 'Tasks API',
      version: '1.0.0',
      description: 'A simple REST API allowing to manage tasks',
      contact: {
        name: 'API Support',
        url: 'https://github.com/ComicScrip',
        email: 'pierre.genthon@wildcodeschool.com'
      },
      license: {
        name: 'GNU General Public License v3.0',
        url: 'https://www.gnu.org/licenses/gpl-3.0.en.html'
      },
      servers: ['http://localhost:' + PORT]
    }
  },
  apis: ['./app.js']
};

/**
 * @swagger
 *
 * definitions:
 *   TaskEditableAttributes:
 *     type: object
 *     properties:
 *       name:
 *         type: string
 *         description: Represents the thing to do
 *       done:
 *         type: boolean
 *         description: Indicates whether or not the task is finished
 *   Task:
 *     allOf:
 *       - $ref: '#/definitions/TaskEditableAttributes'
 *       - type: object
 *         required:
 *           - id
 *           - createdAt
 *           - name
 *           - done
 *         properties:
 *           id:
 *             type: string
 *             description: The task's unique identifier
 *           createdAt:
 *             type: string
 *             format: date-time
 *             description: The task's creation time on the server
 */

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
let tasks = initialTasks;
const setupOptions = {
  customCss: '.swagger-ui .scheme-container { display: none }'
};
const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs, setupOptions));
app.use(cors());
app.use(express.json());

// To simulate latency
const GET_TASKS_DELAY_MS = 0;
const POST_TASK_DELAY_MS = 0;
const PATCH_TASK_DELAY_MS = 0;

/**
 * @swagger
 *
 * /tasks:
 *   post:
 *     tags:
 *       - Tasks
 *     summary: Creates a task
 *     description: Creates a task and return it
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: task
 *         description: Task object
 *         in:  body
 *         required: true
 *         type: string
 *         schema:
 *           $ref: '#/definitions/TaskEditableAttributes'
 *     responses:
 *       201:
 *         description: The created Task
 *         schema:
 *           $ref: '#/definitions/Task'
 *       400:
 *         description: Invalid parameters
 *         schema:
 *           type: object
 *           properties:
 *             errorMessage:
 *               type: string
 *               description: General error message
 *             validationErrors:
 *               type: object
 *               description: Specific errors by field name
 */

app.post('/tasks', (req, res) => {
  setTimeout(() => {
    const { name, done } = req.body;

    const validationErrorsByFieldName = {};
    if (!(typeof name === 'string' && name.length > 0)) validationErrorsByFieldName.name = 'Cannot be blank';
    if (!(typeof name === 'string' && name.length <= 50)) validationErrorsByFieldName.name = 'Must contain less than 50 characters';
    if (!(typeof done === 'boolean')) validationErrorsByFieldName.done = 'Must be a boolean value';

    if (Object.keys(validationErrorsByFieldName).length > 0) {
      res.status(400);
      return res.json({ errorMessage: 'provided attributes aren\'t valid', validationErrors: validationErrorsByFieldName });
    }

    const existingTask = _.find(tasks, { name: name.toLowerCase() });
    if (existingTask) {
      res.status(400);
      return res.json({ errorMessage: `A task named "${name.toLowerCase()}" already exists on the server` });
    }

    const newTask = { id: uniqid(), name: name.toLowerCase(), done, createdAt: moment().format() };
    tasks.push(newTask);
    // to avdoid too much memory use since the API is public
    if (tasks.length > 50) {
      tasks.unshift();
    }
    res.status(201);
    res.json(newTask);
  }, POST_TASK_DELAY_MS);
});

/**
 * @swagger
 * /tasks:
 *   get:
 *     tags:
 *       - Tasks
 *     summary: Lists tasks
 *     description: Returns all tasks
 *     produces:
 *      - application/json
 *     responses:
 *       200:
 *         description: tasks
 *         schema:
 *           type: array
 *           items:
 *             $ref: '#/definitions/Task'
 */
app.get('/tasks', (req, res) => {
  setTimeout(() => {
    res.json(tasks);
  }, GET_TASKS_DELAY_MS);
});

/**
 * @swagger
 *
 * /tasks/{id}:
 *   patch:
 *     tags:
 *       - Tasks
 *     summary: Updates a task
 *     description: Updates a task and return it
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: task
 *         description: Task object
 *         in:  body
 *         required: true
 *         type: string
 *         schema:
 *           $ref: '#/definitions/TaskEditableAttributes'
 *       - name: id
 *         in: path
 *         type: string
 *         required: true
 *         description: Identifier of the task to update
 *     responses:
 *       200:
 *         description: The updated Task
 *         schema:
 *           $ref: '#/definitions/Task'
 *       400:
 *         description: Invalid parameters
 *         schema:
 *           type: object
 *           properties:
 *             errorMessage:
 *               type: string
 *               description: General error message
 *             validationErrors:
 *               type: object
 *               description: Specific errors by field name
 *       404:
 *         description: Task not found
 */
app.patch('/tasks/:id', (req, res) => {
  setTimeout(() => {
    const { id } = req.params;
    const { done } = req.body;

    const validationErrorsByFieldName = {};
    if (!(typeof done === 'boolean')) validationErrorsByFieldName.done = 'Must be a boolean value';

    if (Object.keys(validationErrorsByFieldName).length > 0) {
      res.status(400);
      return res.json({ errorMessage: 'provided attributes aren\'t valid', validationErrors: validationErrorsByFieldName });
    }

    const existingTask = _.find(tasks, { id });
    if (existingTask) {
      existingTask.done = done;
      res.json(existingTask);
    } else {
      res.sendStatus(404);
    }
  }, PATCH_TASK_DELAY_MS);
});

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
app.get('/', (req, res) => res.redirect('/tasks'));