import express from 'express';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

const router = express.Router();

const s3 = new S3Client({
  region: process.env.REGION as string,
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID as string,
    secretAccessKey: process.env.SECRET_ACCESS_KEY as string,
  },
  endpoint: process.env.ENDPOINT as string,
});

const BUCKET = process.env.BUCKET;
const PROJECTS_KEY = 'data/projects.json';

async function getProjects() {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: PROJECTS_KEY,
    });
    const response = await s3.send(command);
    const bodyContents = await response.Body?.transformToString();
    return JSON.parse(bodyContents || '[]');
  } catch (err: any) {
    if (err.name === 'NoSuchKey') return [];
    throw err;
  }
}

async function saveProjects(projects: any[]) {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: PROJECTS_KEY,
    Body: JSON.stringify(projects),
    ContentType: 'application/json',
  });
  await s3.send(command);
}

router.get('/', async (req, res) => {
  try {
    const projects = await getProjects();
    res.json(projects);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const projects = await getProjects();
    const project = projects.find((p: any) => p.id === req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const projects = await getProjects();
    const newProject = {
      ...req.body,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    projects.push(newProject);
    await saveProjects(projects);
    res.json(newProject);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const projects = await getProjects();
    const index = projects.findIndex((p: any) => p.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Project not found' });
    
    projects[index] = { ...projects[index], ...req.body };
    await saveProjects(projects);
    res.json(projects[index]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const projects = await getProjects();
    const filtered = projects.filter((p: any) => p.id !== req.params.id);
    await saveProjects(filtered);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
