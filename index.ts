import { openai } from '@ai-sdk/openai';
import { anthropic } from "@ai-sdk/anthropic"
import { generateObject } from 'ai';
import { z } from 'zod';
import dotenv from 'dotenv';
import { readdir, readFile } from "node:fs/promises";
import ignore from 'ignore'
import { lstatSync } from 'node:fs';
import { file } from 'bun';

import { isText } from 'istextorbinary';

dotenv.config();

const files = await readdir(process.cwd(), { recursive: true });
const gitignore = await readFile(".gitignore", "utf-8");

// @ts-ignore
const ig = ignore();

ig.add('.git');
ig.add(gitignore.split('\n'));

const relevantFiles = files.filter((file) => !ig.ignores(file));

relevantFiles.forEach(async (path) => {
  const stat = lstatSync(path);
  if (!stat.isFile()) {
    return
  }
  const f = file(path);
  const b = await f.arrayBuffer()
  const buffer = Buffer.from(b);
  
  if (!isText(path, buffer)) {
    return
  }

  const { object } = await generateObject({
    model: anthropic("claude-3-5-sonnet-20240620"),
    schema: z.object({
      language: z.string(),
      packages: z.array(z.object({
        name: z.string(),
      }))
    }),
    prompt: `Look at the following file: ${path}. If it looks like code, identify the language and any 3rd party packages it imports. \n\n` + await f.text(),
  });

  console.log(path, object)
});

