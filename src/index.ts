import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "fs";
import express, { Request, Response } from "express";
import { error, info } from "./logger";
import { render } from "./renderer";

const app = express();

app.use(express.json());

async function prepareRenderer(req: Request, res: Response) {
  if (!req.body.paths || !req.body.paths.components) {
    res
      .status(400)
      .json({ message: "body.paths and body.paths.components are required" });
    return;
  }

  if (!req.body.files || typeof req.body.files !== "string") {
    res
      .status(400)
      .json({ message: "body.files should be a b64 of files array" });
    return;
  }

  const files = JSON.parse(
    Buffer.from(req.body.files, "base64").toString("utf8")
  );

  if (!Array.isArray(files)) {
    res.status(400).json({ message: "decoded body.files should be an array" });
    return;
  }

  const emailsFolder = `./queries/${Date.now()}-${
    Math.floor(Math.random() * 8999) + 1000
  }`;
  mkdirSync(emailsFolder, { recursive: true });

  for (const file of files) {
    const fullpath = `${emailsFolder}/${file.path}`;
    const folder = fullpath.slice(0, fullpath.lastIndexOf("/"));
    if (existsSync(folder) === false) {
      mkdirSync(folder, { recursive: true });
    }
    writeFileSync(fullpath, file.content, {
      encoding: "utf-8",
    });
  }

  return {
    emailsFolder,
    components: req.body.paths.components,
    css: req.body.paths.css,
  };
}

app.post("/render-request", async (req, res) => {
  if (!req.body.template) {
    res.status(400).json({ message: "body.template is required" });
    return;
  }

  if (!req.body.lang) {
    res.status(400).json({ message: "body.lang is required" });
    return;
  }

  const args = await prepareRenderer(req, res);

  if (!args) {
    return;
  }

  try {
    res.json(
      await render({
        ...args,
        data: req.body.data,
        template: req.body.template,
        lang: req.body.lang,
      })
    );
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  } finally {
    rmSync(args.emailsFolder, { recursive: true, force: true });
  }
});

app.post("/send-request", async (req, res) => {
  res.status(204).send();
});

const port = process.env.PORT || 3000;

app.listen(port, (err) => {
  if (err) {
    error(err.message);
  } else {
    info(`🚀 Server is listening on port ${port}`);
  }
});
