import express from 'express';
import bodyParser from 'body-parser';
import { router } from './api/routes';
import { logger } from './utils/logger';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use('/api', router);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT}`);
});
