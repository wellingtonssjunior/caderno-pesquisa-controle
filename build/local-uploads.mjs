import { mkdir, open, readFile, readdir, realpath, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const uploadRoot = fileURLToPath(new URL('../../Uploads/', import.meta.url));
export const categories = {
  photos: { folder: 'Fotos experimentais', extensions: ['.jpg','.jpeg','.png','.webp','.gif','.avif','.heic','.heif','.tif','.tiff'] },
  references: { folder: 'Referencias do professor', extensions: ['.pdf','.doc','.docx','.ppt','.pptx','.txt','.bib','.epub','.zip'] },
  matlab: { folder: 'MATLAB', extensions: ['.m','.mlx','.mat','.slx','.mdl','.sldd','.mlapp','.fig','.prj','.csv','.txt','.zip'] },
};
const maxBytes = 50 * 1024 * 1024;
const previewTypes = { '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.png':'image/png', '.webp':'image/webp', '.gif':'image/gif', '.avif':'image/avif' };
const fail = (status, message) => Object.assign(new Error(message), { status });
const json = (res, status, value) => { res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store' }); res.end(JSON.stringify(value)); };

async function categoryDirectory(root, category) {
  const target = path.join(root, categories[category].folder);
  await mkdir(target, { recursive:true });
  if (path.dirname(await realpath(target)) !== await realpath(root)) throw fail(400, 'Pasta de destino inválida.');
  return target;
}

export async function initializeUploads(root = uploadRoot) {
  for (const category of Object.keys(categories)) {
    const directory = await categoryDirectory(root, category);
    await mkdir(path.join(directory, '.metadata'), { recursive:true });
  }
}

export function uploadHandler({ root = uploadRoot, authorize }) {
  return async (req, res, next) => {
    if (!(req.url || '').split('?')[0].match(/^\/api\/uploads(?:\/|$)/)) return next();
    try {
      const base = new URL(`http://${req.headers.host}`);
      const url = new URL(req.url, base);
      if (!['localhost','127.0.0.1'].includes(base.hostname) ||
          Number(base.port || 80) !== req.socket.localPort ||
          !['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress) ||
          url.origin !== base.origin ||
          (req.headers.origin && req.headers.origin !== base.origin) ||
          req.headers['sec-fetch-site'] === 'cross-site') throw fail(403, 'Acesso disponível apenas neste computador.');
      if (!['GET','POST'].includes(req.method)) throw fail(405, 'Método não permitido.');
      if (req.method === 'POST' && req.headers.origin !== base.origin) throw fail(403, 'Origem inválida.');
      if (!await authorize(req, base)) throw fail(401, 'Entre no caderno para acessar os arquivos.');
      const category = url.searchParams.get('category');
      if (!Object.hasOwn(categories, category || '')) throw fail(400, 'Escolha uma categoria válida.');
      const directory = await categoryDirectory(root, category);
      const metadata = path.join(directory, '.metadata');
      await mkdir(metadata, { recursive:true });
      if (path.dirname(await realpath(metadata)) !== await realpath(directory)) throw fail(400, 'Pasta de registros inválida.');

      if (req.method === 'GET' && url.pathname === '/api/uploads') {
        const files = [];
        for (const name of await readdir(metadata)) {
          if (!/^[a-f0-9-]{36}\.json$/.test(name)) continue;
          const record = JSON.parse(await readFile(path.join(metadata, name), 'utf8'));
          try {
            if (path.basename(record.name) !== record.name) continue;
            if ((await stat(path.join(directory, record.name))).isFile()) files.push(record);
          } catch (error) { if (error.code !== 'ENOENT') throw error; }
        }
        return json(res, 200, { files:files.sort((a,b)=>b.uploadedAt.localeCompare(a.uploadedAt)), folder:`Uploads/${categories[category].folder}` });
      }
      if (req.method === 'GET' && url.pathname.startsWith('/api/uploads/')) {
        const id = url.pathname.slice('/api/uploads/'.length);
        if (!/^[a-f0-9-]{36}$/.test(id)) throw fail(404, 'Arquivo não encontrado.');
        const record = JSON.parse(await readFile(path.join(metadata, `${id}.json`), 'utf8'));
        if (path.basename(record.name) !== record.name) throw fail(400, 'Nome inválido.');
        const filename = path.join(directory, record.name);
        if (path.dirname(await realpath(filename)) !== await realpath(directory)) throw fail(403, 'Arquivo fora da pasta de uploads.');
        const bytes = await readFile(filename);
        const type = previewTypes[path.extname(record.name).toLowerCase()];
        const inline = url.searchParams.get('preview') === '1' && type;
        res.writeHead(200, { 'Content-Type':inline ? type : 'application/octet-stream', 'Content-Length':bytes.length,
          'Content-Disposition':`${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(record.name).replace(/['()*]/g,c=>`%${c.charCodeAt(0).toString(16)}`)}`,
          'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', 'Content-Security-Policy':"default-src 'none'; sandbox" });
        return res.end(bytes);
      }
      if (req.method !== 'POST' || url.pathname !== '/api/uploads') throw fail(404, 'Endereço não encontrado.');
      if (Number(req.headers['content-length']) > maxBytes + 1024 * 1024) throw fail(413, 'O limite é de 50 MB por arquivo.');
      const chunks = []; let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > maxBytes + 1024 * 1024) throw fail(413, 'O limite é de 50 MB por arquivo.');
        chunks.push(chunk);
      }
      let form;
      try { form = await new Request(base, { method:'POST', headers:{ 'Content-Type':req.headers['content-type'] || '' }, body:Buffer.concat(chunks) }).formData(); }
      catch { throw fail(400, 'Envio inválido. Selecione o arquivo novamente.'); }
      const file = form.get('file');
      if (!file || typeof file === 'string' || file.size === 0) throw fail(400, 'Escolha um arquivo não vazio.');
      if (file.size > maxBytes) throw fail(413, 'O limite é de 50 MB por arquivo.');
      const extension = path.extname(file.name).toLowerCase();
      if (!categories[category].extensions.includes(extension)) throw fail(400, 'Este formato não é aceito nesta categoria.');
      const originalName = file.name;
      let stem = path.basename(file.name, path.extname(file.name)).replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').replace(/[. ]+$/g,'').slice(0,100) || 'arquivo';
      if (/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(stem)) stem = `_${stem}`;
      const description = String(form.get('description') || '').trim();
      const subject = String(form.get('subject') || '').trim();
      if (description.length > 2000 || subject.length > 200) throw fail(400, 'Descrição ou assunto muito longo.');
      let name, handle;
      for (let suffix = 0; !handle; suffix++) {
        name = `${stem}${suffix ? ` (${suffix})` : ''}${extension}`;
        try { handle = await open(path.join(directory, name), 'wx'); }
        catch (error) { if (error.code !== 'EEXIST') throw error; }
      }
      const record = { id:randomUUID(), name, originalName, category, size:file.size, uploadedAt:new Date().toISOString(), description, subject, previewable:!!previewTypes[extension] };
      try {
        await handle.writeFile(Buffer.from(await file.arrayBuffer()));
        await handle.close();
        await writeFile(path.join(metadata, `${record.id}.json`), JSON.stringify(record,null,2), { flag:'wx' });
      } catch (error) { await handle.close().catch(()=>{}); await unlink(path.join(directory,name)).catch(()=>{}); throw error; }
      return json(res, 201, record);
    } catch (error) {
      if (!res.headersSent) json(res, error.status || (error.code === 'ENOENT' ? 404 : 500), { error:error.status ? error.message : error.code === 'ENOENT' ? 'Arquivo não encontrado.' : 'Não foi possível acessar a pasta. Tente novamente.' });
    }
  };
}

/** @returns {import('vite').Plugin} */
export function localUploads() {
  return { name:'local-research-uploads', apply:'serve',
    async configureServer(server) {
      await initializeUploads();
      server.middlewares.use(uploadHandler({ authorize:async (req, base) => {
        const response = await fetch(new URL('/api/entries', base), { headers:{ cookie:req.headers.cookie || '' }, signal:AbortSignal.timeout(15000), redirect:'error' });
        await response.body?.cancel();
        return response.ok;
      } }));
    },
  };
}
